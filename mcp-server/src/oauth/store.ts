import crypto from 'node:crypto'

/**
 * In-memory OAuth state for the MCP server.
 *
 * Single-user, single-replica personal deployment — a restart just forces
 * Claude.ai to re-authenticate (one click). No persistence needed.
 *
 * Three Maps:
 *   - clients: client_id -> registered DCR metadata
 *   - codes:   authorization_code -> {pkce, client, redirect_uri, resource, exp}
 *   - tokens:  access_token | refresh_token -> token record
 */

export type ClientRecord = {
  client_id: string
  client_id_issued_at: number // epoch seconds
  redirect_uris: string[]
  grant_types: string[]
  response_types: string[]
  token_endpoint_auth_method: string
  client_name?: string
  scope?: string
}

export type AuthCodeRecord = {
  code: string
  client_id: string
  redirect_uri: string
  code_challenge: string
  code_challenge_method: 'S256'
  resource: string | null
  scope: string
  expires_at: number // epoch ms
}

export type TokenKind = 'access' | 'refresh'

export type TokenRecord = {
  token: string
  kind: TokenKind
  client_id: string
  resource: string | null
  scope: string
  expires_at: number // epoch ms
  /** For refresh tokens, the access_token issued alongside (for rotation cleanup). */
  siblingAccessToken?: string
}

const ACCESS_TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24h
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30d
const AUTH_CODE_TTL_MS = 5 * 60 * 1000 // 5 min

export class OAuthStore {
  private clients = new Map<string, ClientRecord>()
  private codes = new Map<string, AuthCodeRecord>()
  private tokens = new Map<string, TokenRecord>()

  // --- Client registration (DCR) ---

  registerClient(input: {
    redirect_uris: string[]
    grant_types?: string[]
    response_types?: string[]
    token_endpoint_auth_method?: string
    client_name?: string
    scope?: string
  }): ClientRecord {
    const client: ClientRecord = {
      client_id: randomId(32),
      client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris: input.redirect_uris,
      grant_types: input.grant_types ?? ['authorization_code', 'refresh_token'],
      response_types: input.response_types ?? ['code'],
      token_endpoint_auth_method: input.token_endpoint_auth_method ?? 'none',
      client_name: input.client_name,
      scope: input.scope ?? 'mcp',
    }
    this.clients.set(client.client_id, client)
    return client
  }

  getClient(clientId: string): ClientRecord | undefined {
    return this.clients.get(clientId)
  }

  // --- Authorization codes ---

  issueAuthCode(input: {
    client_id: string
    redirect_uri: string
    code_challenge: string
    code_challenge_method: 'S256'
    resource: string | null
    scope: string
  }): AuthCodeRecord {
    const code = randomId(32)
    const record: AuthCodeRecord = {
      code,
      client_id: input.client_id,
      redirect_uri: input.redirect_uri,
      code_challenge: input.code_challenge,
      code_challenge_method: input.code_challenge_method,
      resource: input.resource,
      scope: input.scope,
      expires_at: Date.now() + AUTH_CODE_TTL_MS,
    }
    this.codes.set(code, record)
    return record
  }

  /** One-time: returns the record and deletes it atomically. Expired -> undefined. */
  consumeAuthCode(code: string): AuthCodeRecord | undefined {
    const rec = this.codes.get(code)
    if (!rec) return undefined
    this.codes.delete(code)
    if (rec.expires_at < Date.now()) return undefined
    return rec
  }

  // --- Access + refresh tokens ---

  issueTokenPair(input: {
    client_id: string
    resource: string | null
    scope: string
  }): { access: TokenRecord; refresh: TokenRecord } {
    const accessToken = randomId(32)
    const refreshToken = randomId(32)
    const now = Date.now()

    const access: TokenRecord = {
      token: accessToken,
      kind: 'access',
      client_id: input.client_id,
      resource: input.resource,
      scope: input.scope,
      expires_at: now + ACCESS_TOKEN_TTL_MS,
    }
    const refresh: TokenRecord = {
      token: refreshToken,
      kind: 'refresh',
      client_id: input.client_id,
      resource: input.resource,
      scope: input.scope,
      expires_at: now + REFRESH_TOKEN_TTL_MS,
      siblingAccessToken: accessToken,
    }
    this.tokens.set(accessToken, access)
    this.tokens.set(refreshToken, refresh)
    return { access, refresh }
  }

  /** Look up a token by its string value. Returns undefined if unknown OR expired (expired tokens are evicted). */
  getToken(token: string): TokenRecord | undefined {
    const rec = this.tokens.get(token)
    if (!rec) return undefined
    if (rec.expires_at < Date.now()) {
      this.tokens.delete(token)
      return undefined
    }
    return rec
  }

  /**
   * Rotate a refresh token (OAuth 2.1 §4.3.1 requires rotation for public clients).
   * Deletes the old refresh token AND its sibling access token, then issues a new pair.
   * Returns undefined if the refresh token is unknown or expired.
   */
  rotateRefresh(refreshToken: string): { access: TokenRecord; refresh: TokenRecord } | undefined {
    const rec = this.getToken(refreshToken)
    if (!rec || rec.kind !== 'refresh') return undefined

    // Revoke old refresh and its sibling access
    this.tokens.delete(rec.token)
    if (rec.siblingAccessToken) this.tokens.delete(rec.siblingAccessToken)

    return this.issueTokenPair({
      client_id: rec.client_id,
      resource: rec.resource,
      scope: rec.scope,
    })
  }

  // --- Test helpers ---

  /** @internal — used by tests to inspect size/reset state. */
  _stats() {
    return {
      clients: this.clients.size,
      codes: this.codes.size,
      tokens: this.tokens.size,
    }
  }

  /** @internal — used by tests. */
  _forceExpire(token: string) {
    const rec = this.tokens.get(token)
    if (rec) rec.expires_at = 0
    const code = this.codes.get(token)
    if (code) code.expires_at = 0
  }
}

/** 32-byte random hex id (64 chars). Cryptographically secure. */
export function randomId(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex')
}

export const TTL = {
  ACCESS_TOKEN_MS: ACCESS_TOKEN_TTL_MS,
  REFRESH_TOKEN_MS: REFRESH_TOKEN_TTL_MS,
  AUTH_CODE_MS: AUTH_CODE_TTL_MS,
}
