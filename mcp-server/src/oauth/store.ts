import crypto from 'node:crypto'
import { signJWT, verifyJWT, deriveSigningKey } from './jwt.js'

/**
 * Stateless OAuth state for the MCP server.
 *
 * Authorization codes, access tokens, and refresh tokens are issued as
 * signed JWTs (HS256). They survive process restarts (Railway redeploys),
 * which means Claude.ai's connector keeps working without a forced
 * re-authorization on every code change.
 *
 * Trade-off: stateless tokens cannot be revoked individually. We accept
 * that for this single-user deployment. The kill switch is rotating
 * `MCP_PUBLIC_KEY` (the JWT signing key is derived from it), which
 * invalidates every issued token at once.
 *
 * Refresh-token semantics deviate slightly from strict OAuth 2.1: the
 * /token refresh grant issues a fresh refresh JWT (rotation) but the
 * old one remains valid until its `exp`. Without server-side state we
 * cannot enforce single-use. This is accepted by Claude.ai and
 * documented here so it isn't mistaken for a bug.
 *
 * Client registration is still in-memory in this commit (see OAuthStore
 * below); a follow-up commit makes the DCR client_id itself a JWT and
 * removes the Map entirely.
 */

// ---------------------------------------------------------------------------
// TTLs and signing-key resolution
// ---------------------------------------------------------------------------

const ACCESS_TOKEN_TTL_S = 24 * 60 * 60 // 24h
const REFRESH_TOKEN_TTL_S = 30 * 24 * 60 * 60 // 30d
const AUTH_CODE_TTL_S = 5 * 60 // 5 min

export const TTL = {
  ACCESS_TOKEN_S: ACCESS_TOKEN_TTL_S,
  REFRESH_TOKEN_S: REFRESH_TOKEN_TTL_S,
  AUTH_CODE_S: AUTH_CODE_TTL_S,
  // Back-compat aliases (ms) used by handlers that emit `expires_in` in seconds.
  ACCESS_TOKEN_MS: ACCESS_TOKEN_TTL_S * 1000,
  REFRESH_TOKEN_MS: REFRESH_TOKEN_TTL_S * 1000,
  AUTH_CODE_MS: AUTH_CODE_TTL_S * 1000,
}

let cachedKey: Buffer | null = null
let cachedSecret: string | null = null

/**
 * Resolve the JWT signing key from process.env.MCP_PUBLIC_KEY at call time.
 * Cached per-secret so we don't rehash on every issue/verify but still
 * pick up env changes during tests (which mutate process.env).
 */
export function getSigningKey(): Buffer {
  const secret = process.env.MCP_PUBLIC_KEY
  if (!secret) {
    throw new Error('MCP_PUBLIC_KEY is required to sign/verify OAuth JWTs')
  }
  if (cachedKey && cachedSecret === secret) return cachedKey
  cachedKey = deriveSigningKey(secret)
  cachedSecret = secret
  return cachedKey
}

/** @internal — used by tests to force key re-derivation between cases. */
export function _resetSigningKeyCache() {
  cachedKey = null
  cachedSecret = null
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000)
}

function jti(): string {
  return crypto.randomBytes(16).toString('hex')
}

// ---------------------------------------------------------------------------
// Authorization code JWTs
// ---------------------------------------------------------------------------

export type AuthCodePayload = {
  typ: 'code'
  client_id: string
  redirect_uri: string
  resource: string | null
  code_challenge: string
  code_challenge_method: 'S256'
  scope: string
  exp: number
  iat: number
  jti: string
}

export function issueAuthCode(input: {
  client_id: string
  redirect_uri: string
  resource: string | null
  code_challenge: string
  code_challenge_method: 'S256'
  scope: string
}): string {
  const iat = nowSeconds()
  const payload: AuthCodePayload = {
    typ: 'code',
    client_id: input.client_id,
    redirect_uri: input.redirect_uri,
    resource: input.resource,
    code_challenge: input.code_challenge,
    code_challenge_method: input.code_challenge_method,
    scope: input.scope,
    iat,
    exp: iat + AUTH_CODE_TTL_S,
    jti: jti(),
  }
  return signJWT(payload, getSigningKey())
}

export function verifyAuthCode(token: string): AuthCodePayload | null {
  const payload = verifyJWT<AuthCodePayload>(token, getSigningKey())
  if (!payload || payload.typ !== 'code') return null
  return payload
}

// ---------------------------------------------------------------------------
// Access token JWTs
// ---------------------------------------------------------------------------

export type AccessTokenPayload = {
  typ: 'access'
  sub: string
  client_id: string
  resource: string | null
  scope: string
  exp: number
  iat: number
  jti: string
}

export function issueAccessToken(input: {
  sub: string
  client_id: string
  resource: string | null
  scope: string
}): string {
  const iat = nowSeconds()
  const payload: AccessTokenPayload = {
    typ: 'access',
    sub: input.sub,
    client_id: input.client_id,
    resource: input.resource,
    scope: input.scope,
    iat,
    exp: iat + ACCESS_TOKEN_TTL_S,
    jti: jti(),
  }
  return signJWT(payload, getSigningKey())
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  const payload = verifyJWT<AccessTokenPayload>(token, getSigningKey())
  if (!payload || payload.typ !== 'access') return null
  return payload
}

// ---------------------------------------------------------------------------
// Refresh token JWTs
// ---------------------------------------------------------------------------

export type RefreshTokenPayload = {
  typ: 'refresh'
  sub: string
  client_id: string
  resource: string | null
  scope: string
  exp: number
  iat: number
  jti: string
}

export function issueRefreshToken(input: {
  sub: string
  client_id: string
  resource: string | null
  scope: string
}): string {
  const iat = nowSeconds()
  const payload: RefreshTokenPayload = {
    typ: 'refresh',
    sub: input.sub,
    client_id: input.client_id,
    resource: input.resource,
    scope: input.scope,
    iat,
    exp: iat + REFRESH_TOKEN_TTL_S,
    jti: jti(),
  }
  return signJWT(payload, getSigningKey())
}

export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  const payload = verifyJWT<RefreshTokenPayload>(token, getSigningKey())
  if (!payload || payload.typ !== 'refresh') return null
  return payload
}

// ---------------------------------------------------------------------------
// Client registration (RFC 7591 DCR) — stateless: the client_id IS a JWT
// ---------------------------------------------------------------------------
//
// /register issues a JWT whose payload encodes the registered client
// metadata. /authorize and /token re-verify this JWT to prove the
// client_id was legitimately issued by us. No server-side Map of clients
// is kept, so registrations survive restarts.
//
// Public clients only (token_endpoint_auth_method = "none"). Since there
// is no client secret to leak, embedding the metadata in the client_id
// itself is safe — it's just a self-describing identifier we signed.

export type ClientPayload = {
  typ: 'client'
  redirect_uris: string[]
  grant_types: string[]
  response_types: string[]
  token_endpoint_auth_method: string
  client_name?: string
  scope?: string
  iat: number
  jti: string
}

/** Convenience shape matching the previous in-memory record. Echoed by /register. */
export type ClientRecord = {
  client_id: string
  client_id_issued_at: number // epoch seconds (= iat)
  redirect_uris: string[]
  grant_types: string[]
  response_types: string[]
  token_endpoint_auth_method: string
  client_name?: string
  scope?: string
}

export function issueClientId(input: {
  redirect_uris: string[]
  grant_types?: string[]
  response_types?: string[]
  token_endpoint_auth_method?: string
  client_name?: string
  scope?: string
}): ClientRecord {
  const iat = nowSeconds()
  const payload: ClientPayload = {
    typ: 'client',
    redirect_uris: input.redirect_uris,
    grant_types: input.grant_types ?? ['authorization_code', 'refresh_token'],
    response_types: input.response_types ?? ['code'],
    token_endpoint_auth_method: input.token_endpoint_auth_method ?? 'none',
    client_name: input.client_name,
    scope: input.scope ?? 'mcp',
    iat,
    jti: jti(),
  }
  // Note: no `exp` — DCR registrations are intended to be long-lived. The
  // signing key (derived from MCP_PUBLIC_KEY) is the kill switch.
  const client_id = signJWT(payload, getSigningKey())
  return {
    client_id,
    client_id_issued_at: iat,
    redirect_uris: payload.redirect_uris,
    grant_types: payload.grant_types,
    response_types: payload.response_types,
    token_endpoint_auth_method: payload.token_endpoint_auth_method,
    client_name: payload.client_name,
    scope: payload.scope,
  }
}

export function verifyClientId(clientId: string): ClientPayload | null {
  const payload = verifyJWT<ClientPayload>(clientId, getSigningKey())
  if (!payload || payload.typ !== 'client') return null
  if (!Array.isArray(payload.redirect_uris)) return null
  return payload
}
