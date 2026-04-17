import { describe, it, expect, beforeEach } from 'vitest'
import http from 'node:http'
import { Readable } from 'node:stream'
import crypto from 'node:crypto'
import { OAuthStore } from './store.js'
import { base64UrlEncode } from './pkce.js'
import {
  handleAuthServerMetadata,
  handleAuthorizeGet,
  handleAuthorizePost,
  handleProtectedResourceMetadata,
  handleRegister,
  handleToken,
  buildWwwAuthenticate,
} from './handlers.js'

// ---------- test helpers: fake req/res ----------

function makeReq(options: {
  method?: string
  url?: string
  headers?: Record<string, string>
  body?: string
}): http.IncomingMessage {
  const method = options.method ?? 'GET'
  const url = options.url ?? '/'
  const headers = {
    host: 'mcp.example.com',
    ...options.headers,
  }
  const body = options.body ?? ''

  const stream = Readable.from(body.length ? [Buffer.from(body)] : []) as unknown as http.IncomingMessage
  ;(stream as any).method = method
  ;(stream as any).url = url
  ;(stream as any).headers = headers
  return stream
}

type CapturedResponse = {
  statusCode: number
  headers: Record<string, string | string[]>
  body: string
}

function makeRes(): { res: http.ServerResponse; captured: CapturedResponse; done: Promise<void> } {
  const captured: CapturedResponse = { statusCode: 0, headers: {}, body: '' }
  let resolveDone: () => void
  const done = new Promise<void>((r) => {
    resolveDone = r
  })

  const res: Partial<http.ServerResponse> = {
    headersSent: false,
    writeHead(status: number, headers?: Record<string, string | string[]>) {
      captured.statusCode = status
      if (headers) {
        for (const [k, v] of Object.entries(headers)) {
          captured.headers[k.toLowerCase()] = v
        }
      }
      return res as http.ServerResponse
    },
    end(chunk?: any) {
      if (chunk) captured.body += String(chunk)
      resolveDone()
      return res as http.ServerResponse
    },
    setHeader(k: string, v: string | string[]) {
      captured.headers[k.toLowerCase()] = v
      return res as http.ServerResponse
    },
  }

  return { res: res as http.ServerResponse, captured, done }
}

// Compute a valid S256 challenge for a given verifier.
function makeChallenge(verifier: string): string {
  return base64UrlEncode(crypto.createHash('sha256').update(verifier).digest())
}

// ---------- tests ----------

describe('OAuth metadata endpoints', () => {
  it('GET /.well-known/oauth-protected-resource returns RFC 9728 shape', async () => {
    const req = makeReq({ url: '/.well-known/oauth-protected-resource' })
    const { res, captured, done } = makeRes()
    handleProtectedResourceMetadata(req, res)
    await done

    expect(captured.statusCode).toBe(200)
    const body = JSON.parse(captured.body)
    expect(body.resource).toBe('https://mcp.example.com/mcp')
    expect(body.authorization_servers).toEqual(['https://mcp.example.com'])
    expect(body.scopes_supported).toEqual(['mcp'])
    expect(body.bearer_methods_supported).toEqual(['header'])
  })

  it('GET /.well-known/oauth-authorization-server returns RFC 8414 shape', async () => {
    const req = makeReq({ url: '/.well-known/oauth-authorization-server' })
    const { res, captured, done } = makeRes()
    handleAuthServerMetadata(req, res)
    await done

    expect(captured.statusCode).toBe(200)
    const body = JSON.parse(captured.body)
    expect(body.issuer).toBe('https://mcp.example.com')
    expect(body.authorization_endpoint).toBe('https://mcp.example.com/authorize')
    expect(body.token_endpoint).toBe('https://mcp.example.com/token')
    expect(body.registration_endpoint).toBe('https://mcp.example.com/register')
    expect(body.code_challenge_methods_supported).toEqual(['S256'])
    expect(body.response_types_supported).toEqual(['code'])
    expect(body.grant_types_supported).toContain('authorization_code')
    expect(body.grant_types_supported).toContain('refresh_token')
  })

  it('uses x-forwarded-proto/host when behind a proxy', async () => {
    const req = makeReq({
      url: '/.well-known/oauth-protected-resource',
      headers: { host: 'internal:3333', 'x-forwarded-proto': 'https', 'x-forwarded-host': 'public.example' },
    })
    const { res, captured, done } = makeRes()
    handleProtectedResourceMetadata(req, res)
    await done

    const body = JSON.parse(captured.body)
    expect(body.resource).toBe('https://public.example/mcp')
  })
})

describe('POST /register (DCR)', () => {
  it('registers a client with https redirect_uris and returns client_id', async () => {
    const store = new OAuthStore()
    const req = makeReq({
      method: 'POST',
      url: '/register',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        redirect_uris: ['https://claude.ai/api/mcp/auth_callback'],
        client_name: 'Claude',
        token_endpoint_auth_method: 'none',
      }),
    })
    const { res, captured, done } = makeRes()
    await handleRegister(req, res, { store, authorizationToken: 'secret' })
    await done

    expect(captured.statusCode).toBe(201)
    const body = JSON.parse(captured.body)
    expect(body.client_id).toMatch(/^[a-f0-9]{64}$/)
    expect(body.redirect_uris).toEqual(['https://claude.ai/api/mcp/auth_callback'])
    expect(body.token_endpoint_auth_method).toBe('none')
    // client_secret intentionally absent (public client)
    expect(body.client_secret).toBeUndefined()
  })

  it('rejects a DCR request with no redirect_uris', async () => {
    const store = new OAuthStore()
    const req = makeReq({
      method: 'POST',
      url: '/register',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    const { res, captured, done } = makeRes()
    await handleRegister(req, res, { store, authorizationToken: 'secret' })
    await done

    expect(captured.statusCode).toBe(400)
    const body = JSON.parse(captured.body)
    expect(body.error).toBe('invalid_redirect_uri')
  })

  it('rejects a DCR request with an insecure http redirect_uri', async () => {
    const store = new OAuthStore()
    const req = makeReq({
      method: 'POST',
      url: '/register',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ redirect_uris: ['http://evil.example/cb'] }),
    })
    const { res, captured, done } = makeRes()
    await handleRegister(req, res, { store, authorizationToken: 'secret' })
    await done

    expect(captured.statusCode).toBe(400)
    expect(JSON.parse(captured.body).error).toBe('invalid_redirect_uri')
  })
})

describe('GET /authorize (render HTML form)', () => {
  it('renders the consent form with all hidden params preserved', async () => {
    const store = new OAuthStore()
    const client = store.registerClient({ redirect_uris: ['https://claude.ai/cb'] })
    const url =
      `/authorize?response_type=code` +
      `&client_id=${client.client_id}` +
      `&redirect_uri=${encodeURIComponent('https://claude.ai/cb')}` +
      `&state=xyz` +
      `&code_challenge=abc123` +
      `&code_challenge_method=S256` +
      `&resource=${encodeURIComponent('https://mcp.example.com/mcp')}`

    const req = makeReq({ url })
    const { res, captured, done } = makeRes()
    await handleAuthorizeGet(req, res, { store, authorizationToken: 'secret' })
    await done

    expect(captured.statusCode).toBe(200)
    expect(String(captured.headers['content-type'])).toMatch(/text\/html/)
    expect(captured.body).toContain('Autorizar Finanzas MCP')
    expect(captured.body).toContain(`name="client_id" value="${client.client_id}"`)
    expect(captured.body).toContain('name="state" value="xyz"')
    expect(captured.body).toContain('name="code_challenge" value="abc123"')
    expect(captured.body).toContain('name="authorization_token"')
  })

  it('returns 400 HTML error when client_id is unknown', async () => {
    const store = new OAuthStore()
    const req = makeReq({
      url: '/authorize?response_type=code&client_id=bad&redirect_uri=https://x/cb&code_challenge=a&code_challenge_method=S256',
    })
    const { res, captured, done } = makeRes()
    await handleAuthorizeGet(req, res, { store, authorizationToken: 'secret' })
    await done

    expect(captured.statusCode).toBe(400)
    expect(captured.body).toContain('invalid_client')
  })

  it('returns 400 when code_challenge_method is not S256', async () => {
    const store = new OAuthStore()
    const client = store.registerClient({ redirect_uris: ['https://a/cb'] })
    const req = makeReq({
      url: `/authorize?response_type=code&client_id=${client.client_id}&redirect_uri=${encodeURIComponent('https://a/cb')}&code_challenge=abc&code_challenge_method=plain`,
    })
    const { res, captured, done } = makeRes()
    await handleAuthorizeGet(req, res, { store, authorizationToken: 'secret' })
    await done

    expect(captured.statusCode).toBe(400)
    expect(captured.body).toContain('code_challenge_method must be S256')
  })
})

describe('POST /authorize (submit form)', () => {
  it('redirects with code+state when authorization_token matches', async () => {
    const store = new OAuthStore()
    const client = store.registerClient({ redirect_uris: ['https://claude.ai/cb'] })
    const form = new URLSearchParams({
      response_type: 'code',
      client_id: client.client_id,
      redirect_uri: 'https://claude.ai/cb',
      state: 'random-state',
      code_challenge: 'abc123',
      code_challenge_method: 'S256',
      resource: 'https://mcp.example.com/mcp',
      authorization_token: 'the-secret',
    })
    const req = makeReq({
      method: 'POST',
      url: '/authorize',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    })
    const { res, captured, done } = makeRes()
    await handleAuthorizePost(req, res, { store, authorizationToken: 'the-secret' })
    await done

    expect(captured.statusCode).toBe(302)
    const location = String(captured.headers['location'])
    const redirectUrl = new URL(location)
    expect(redirectUrl.origin + redirectUrl.pathname).toBe('https://claude.ai/cb')
    expect(redirectUrl.searchParams.get('state')).toBe('random-state')
    const code = redirectUrl.searchParams.get('code')
    expect(code).toMatch(/^[a-f0-9]{64}$/)
    // Code should be stored
    expect(store._stats().codes).toBe(1)
  })

  it('re-renders the form with an error when authorization_token is wrong', async () => {
    const store = new OAuthStore()
    const client = store.registerClient({ redirect_uris: ['https://a/cb'] })
    const form = new URLSearchParams({
      response_type: 'code',
      client_id: client.client_id,
      redirect_uri: 'https://a/cb',
      code_challenge: 'abc',
      code_challenge_method: 'S256',
      authorization_token: 'WRONG',
    })
    const req = makeReq({
      method: 'POST',
      url: '/authorize',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    })
    const { res, captured, done } = makeRes()
    await handleAuthorizePost(req, res, { store, authorizationToken: 'the-secret' })
    await done

    expect(captured.statusCode).toBe(401)
    expect(captured.body).toContain('Token incorrecto')
    // No code should have been issued
    expect(store._stats().codes).toBe(0)
  })
})

describe('POST /token', () => {
  async function runAuthCodeFlow(opts?: {
    codeVerifierOverride?: string
    clientIdOverride?: string
    redirectUriOverride?: string
  }) {
    const store = new OAuthStore()
    const client = store.registerClient({ redirect_uris: ['https://claude.ai/cb'] })
    const verifier = crypto.randomBytes(48).toString('base64url')
    const challenge = makeChallenge(verifier)

    // Bypass the form handler — directly seed a code.
    const code = store.issueAuthCode({
      client_id: client.client_id,
      redirect_uri: 'https://claude.ai/cb',
      code_challenge: challenge,
      code_challenge_method: 'S256',
      resource: 'https://mcp.example.com/mcp',
      scope: 'mcp',
    })

    const form = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code.code,
      redirect_uri: opts?.redirectUriOverride ?? 'https://claude.ai/cb',
      client_id: opts?.clientIdOverride ?? client.client_id,
      code_verifier: opts?.codeVerifierOverride ?? verifier,
    })
    const req = makeReq({
      method: 'POST',
      url: '/token',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    })
    const { res, captured, done } = makeRes()
    await handleToken(req, res, { store, authorizationToken: 'the-secret' })
    await done
    return { store, client, captured, code: code.code }
  }

  it('exchanges a valid authorization code for an access+refresh token pair', async () => {
    const { captured, store } = await runAuthCodeFlow()
    expect(captured.statusCode).toBe(200)
    const body = JSON.parse(captured.body)
    expect(body.token_type).toBe('Bearer')
    expect(body.access_token).toMatch(/^[a-f0-9]{64}$/)
    expect(body.refresh_token).toMatch(/^[a-f0-9]{64}$/)
    expect(body.expires_in).toBeGreaterThan(3600)
    expect(body.scope).toBe('mcp')
    // Lookup the issued access token
    expect(store.getToken(body.access_token)?.kind).toBe('access')
  })

  it('rejects re-use of a consumed authorization code', async () => {
    const { captured, code, store } = await runAuthCodeFlow()
    expect(captured.statusCode).toBe(200)
    // Re-use the same code
    const form = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'https://claude.ai/cb',
      client_id: 'anything',
      code_verifier: 'anything',
    })
    const req = makeReq({
      method: 'POST',
      url: '/token',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    })
    const { res, captured: second, done } = makeRes()
    await handleToken(req, res, { store, authorizationToken: 'secret' })
    await done
    expect(second.statusCode).toBe(400)
    expect(JSON.parse(second.body).error).toBe('invalid_grant')
  })

  it('rejects a code exchange with a wrong code_verifier (PKCE mismatch)', async () => {
    const wrong = 'z'.repeat(64)
    const { captured } = await runAuthCodeFlow({ codeVerifierOverride: wrong })
    expect(captured.statusCode).toBe(400)
    const body = JSON.parse(captured.body)
    expect(body.error).toBe('invalid_grant')
    expect(body.error_description).toContain('code_verifier')
  })

  it('rejects a code exchange with a mismatched redirect_uri', async () => {
    const { captured } = await runAuthCodeFlow({ redirectUriOverride: 'https://evil.example/cb' })
    expect(captured.statusCode).toBe(400)
    expect(JSON.parse(captured.body).error).toBe('invalid_grant')
  })

  it('refresh_token grant rotates the refresh token and issues a new access token', async () => {
    const store = new OAuthStore()
    const pair = store.issueTokenPair({ client_id: 'c1', resource: 'https://mcp/mcp', scope: 'mcp' })

    const form = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: pair.refresh.token,
      client_id: 'c1',
    })
    const req = makeReq({
      method: 'POST',
      url: '/token',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    })
    const { res, captured, done } = makeRes()
    await handleToken(req, res, { store, authorizationToken: 'secret' })
    await done

    expect(captured.statusCode).toBe(200)
    const body = JSON.parse(captured.body)
    expect(body.access_token).not.toEqual(pair.access.token)
    expect(body.refresh_token).not.toEqual(pair.refresh.token)
    // Old tokens are revoked
    expect(store.getToken(pair.access.token)).toBeUndefined()
    expect(store.getToken(pair.refresh.token)).toBeUndefined()
  })

  it('returns unsupported_grant_type for unknown grants', async () => {
    const store = new OAuthStore()
    const req = makeReq({
      method: 'POST',
      url: '/token',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'password' }).toString(),
    })
    const { res, captured, done } = makeRes()
    await handleToken(req, res, { store, authorizationToken: 'secret' })
    await done
    expect(captured.statusCode).toBe(400)
    expect(JSON.parse(captured.body).error).toBe('unsupported_grant_type')
  })
})

describe('buildWwwAuthenticate', () => {
  it('includes the resource_metadata URL per RFC 9728 §5.1', () => {
    const req = makeReq({ headers: { host: 'mcp.example.com' } })
    const header = buildWwwAuthenticate(req)
    expect(header).toContain('Bearer')
    expect(header).toContain(
      'resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource"',
    )
  })

  it('includes the optional error param when provided', () => {
    const req = makeReq({ headers: { host: 'mcp.example.com' } })
    const header = buildWwwAuthenticate(req, 'invalid_token')
    expect(header).toContain('error="invalid_token"')
  })
})
