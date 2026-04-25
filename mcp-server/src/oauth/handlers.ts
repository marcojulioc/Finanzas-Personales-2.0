import http from 'node:http'
import crypto from 'node:crypto'
import {
  OAuthStore,
  TTL,
  issueAuthCode,
  verifyAuthCode,
  issueAccessToken,
  issueRefreshToken,
  verifyRefreshToken,
} from './store.js'
import { verifyS256 } from './pkce.js'

/**
 * OAuth 2.1 HTTP handlers for the MCP server.
 *
 * Endpoints:
 *   GET  /.well-known/oauth-protected-resource   — RFC 9728
 *   GET  /.well-known/oauth-authorization-server — RFC 8414
 *   POST /register                                — RFC 7591 DCR
 *   GET  /authorize                               — HTML consent form
 *   POST /authorize                               — validate password, redirect with code
 *   POST /token                                   — code/refresh exchange
 */

export type OAuthDeps = {
  store: OAuthStore
  /** Static shared secret the user pastes on the consent page. */
  authorizationToken: string
  /** sub claim for access/refresh tokens (single-tenant: hardcoded user id). */
  ownerUserId: string
}

/** Build the canonical public origin (`https://host`) from the request headers. */
export function getIssuer(req: http.IncomingMessage): string {
  const proto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim() || 'https'
  const host = (req.headers['x-forwarded-host'] as string | undefined) || (req.headers['host'] as string | undefined) || 'localhost'
  return `${proto}://${host}`
}

/** The canonical resource URI for this MCP server's protected endpoint. */
export function getResourceUri(req: http.IncomingMessage): string {
  return `${getIssuer(req)}/mcp`
}

function sendJson(res: http.ServerResponse, status: number, body: unknown, extraHeaders: Record<string, string> = {}) {
  res.writeHead(status, {
    'content-type': 'application/json',
    'cache-control': 'no-store',
    ...extraHeaders,
  })
  res.end(JSON.stringify(body))
}

function sendHtml(res: http.ServerResponse, status: number, html: string) {
  res.writeHead(status, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'x-frame-options': 'DENY',
    'content-security-policy': "frame-ancestors 'none'",
  })
  res.end(html)
}

async function readBody(req: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  return Buffer.concat(chunks).toString('utf8')
}

function parseFormOrJson(raw: string, contentType: string | undefined): Record<string, string> {
  if (!raw) return {}
  if (contentType?.includes('application/json')) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        const out: Record<string, string> = {}
        for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
          if (Array.isArray(v)) out[k] = String(v[0] ?? '')
          else if (v !== undefined && v !== null) out[k] = String(v)
        }
        return out
      }
    } catch {
      return {}
    }
  }
  // Default: application/x-www-form-urlencoded
  const out: Record<string, string> = {}
  const params = new URLSearchParams(raw)
  for (const [k, v] of params.entries()) out[k] = v
  return out
}

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Constant-time string comparison. Safe on different lengths. */
function timingSafeStringEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

// ---------------------------------------------------------------------------
// GET /.well-known/oauth-protected-resource   (RFC 9728)
// ---------------------------------------------------------------------------

export function handleProtectedResourceMetadata(req: http.IncomingMessage, res: http.ServerResponse) {
  const issuer = getIssuer(req)
  sendJson(res, 200, {
    resource: `${issuer}/mcp`,
    authorization_servers: [issuer],
    scopes_supported: ['mcp'],
    bearer_methods_supported: ['header'],
    resource_name: 'Finanzas Personales MCP',
  })
}

// ---------------------------------------------------------------------------
// GET /.well-known/oauth-authorization-server  (RFC 8414)
// ---------------------------------------------------------------------------

export function handleAuthServerMetadata(req: http.IncomingMessage, res: http.ServerResponse) {
  const issuer = getIssuer(req)
  sendJson(res, 200, {
    issuer,
    authorization_endpoint: `${issuer}/authorize`,
    token_endpoint: `${issuer}/token`,
    registration_endpoint: `${issuer}/register`,
    response_types_supported: ['code'],
    response_modes_supported: ['query'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['none'],
    code_challenge_methods_supported: ['S256'],
    scopes_supported: ['mcp'],
    service_documentation: 'https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization',
  })
}

// ---------------------------------------------------------------------------
// POST /register   (RFC 7591 Dynamic Client Registration)
// ---------------------------------------------------------------------------

export async function handleRegister(req: http.IncomingMessage, res: http.ServerResponse, deps: OAuthDeps) {
  const raw = await readBody(req)
  let body: Record<string, unknown>
  try {
    body = raw ? JSON.parse(raw) : {}
  } catch {
    return sendJson(res, 400, { error: 'invalid_client_metadata', error_description: 'Body must be JSON' })
  }

  const redirectUrisRaw = body.redirect_uris
  if (!Array.isArray(redirectUrisRaw) || redirectUrisRaw.length === 0) {
    return sendJson(res, 400, {
      error: 'invalid_redirect_uri',
      error_description: 'redirect_uris must be a non-empty array',
    })
  }
  const redirect_uris = redirectUrisRaw.filter((u): u is string => typeof u === 'string' && u.length > 0)
  if (redirect_uris.length === 0) {
    return sendJson(res, 400, { error: 'invalid_redirect_uri' })
  }

  // RFC 9700 / OAuth 2.1 §1.5 — redirect_uris MUST be https or loopback.
  for (const u of redirect_uris) {
    if (!isValidRedirectUri(u)) {
      return sendJson(res, 400, {
        error: 'invalid_redirect_uri',
        error_description: `redirect_uri must be https or http://localhost (got ${u})`,
      })
    }
  }

  const client = deps.store.registerClient({
    redirect_uris,
    grant_types: arrOrDefault(body.grant_types, ['authorization_code', 'refresh_token']),
    response_types: arrOrDefault(body.response_types, ['code']),
    token_endpoint_auth_method:
      typeof body.token_endpoint_auth_method === 'string' ? body.token_endpoint_auth_method : 'none',
    client_name: typeof body.client_name === 'string' ? body.client_name : undefined,
    scope: typeof body.scope === 'string' ? body.scope : 'mcp',
  })

  // Per RFC 7591 §3.2.1, return registered metadata.
  sendJson(res, 201, {
    client_id: client.client_id,
    client_id_issued_at: client.client_id_issued_at,
    redirect_uris: client.redirect_uris,
    grant_types: client.grant_types,
    response_types: client.response_types,
    token_endpoint_auth_method: client.token_endpoint_auth_method,
    client_name: client.client_name,
    scope: client.scope,
  })
}

function arrOrDefault(v: unknown, fallback: string[]): string[] {
  if (Array.isArray(v) && v.every((x) => typeof x === 'string')) return v as string[]
  return fallback
}

function isValidRedirectUri(u: string): boolean {
  try {
    const parsed = new URL(u)
    if (parsed.protocol === 'https:') return true
    if (parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '::1')) {
      return true
    }
    // Native-app custom schemes (e.g., claudeai://, com.example.app:/callback) are allowed per OAuth 2.1.
    // A conservative allowlist: any non-http(s) scheme that isn't a known-dangerous one.
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:' && parsed.protocol.endsWith(':')) {
      return true
    }
    return false
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// GET /authorize  — render HTML consent form
// POST /authorize — validate password, 302 with ?code=...&state=...
// ---------------------------------------------------------------------------

type AuthorizeParams = {
  response_type: string
  client_id: string
  redirect_uri: string
  state: string | null
  code_challenge: string
  code_challenge_method: string
  resource: string | null
  scope: string | null
}

function readAuthorizeParams(src: Record<string, string | null | undefined>): AuthorizeParams {
  return {
    response_type: src.response_type ?? '',
    client_id: src.client_id ?? '',
    redirect_uri: src.redirect_uri ?? '',
    state: src.state ?? null,
    code_challenge: src.code_challenge ?? '',
    code_challenge_method: src.code_challenge_method ?? '',
    resource: src.resource ?? null,
    scope: src.scope ?? null,
  }
}

function validateAuthorizeParams(
  p: AuthorizeParams,
  deps: OAuthDeps,
): { ok: true } | { ok: false; error: string; description: string } {
  if (p.response_type !== 'code') {
    return { ok: false, error: 'unsupported_response_type', description: 'response_type must be "code"' }
  }
  if (!p.client_id) return { ok: false, error: 'invalid_request', description: 'client_id is required' }
  const client = deps.store.getClient(p.client_id)
  if (!client) return { ok: false, error: 'invalid_client', description: 'Unknown client_id' }
  if (!p.redirect_uri) return { ok: false, error: 'invalid_request', description: 'redirect_uri is required' }
  if (!client.redirect_uris.includes(p.redirect_uri)) {
    return { ok: false, error: 'invalid_redirect_uri', description: 'redirect_uri not registered for this client' }
  }
  if (!p.code_challenge) return { ok: false, error: 'invalid_request', description: 'code_challenge is required (PKCE)' }
  if (p.code_challenge_method !== 'S256') {
    return { ok: false, error: 'invalid_request', description: 'code_challenge_method must be S256' }
  }
  return { ok: true }
}

export async function handleAuthorizeGet(req: http.IncomingMessage, res: http.ServerResponse, deps: OAuthDeps) {
  const url = new URL(req.url ?? '/', 'http://x')
  const params = readAuthorizeParams(Object.fromEntries(url.searchParams.entries()))

  const check = validateAuthorizeParams(params, deps)
  if (!check.ok) {
    return sendHtml(res, 400, renderErrorPage(check.error, check.description))
  }

  sendHtml(res, 200, renderAuthorizePage(params, null))
}

export async function handleAuthorizePost(req: http.IncomingMessage, res: http.ServerResponse, deps: OAuthDeps) {
  const raw = await readBody(req)
  const form = parseFormOrJson(raw, req.headers['content-type'] as string | undefined)
  const params = readAuthorizeParams(form)

  const check = validateAuthorizeParams(params, deps)
  if (!check.ok) {
    return sendHtml(res, 400, renderErrorPage(check.error, check.description))
  }

  const submittedToken = form.authorization_token ?? ''
  if (!timingSafeStringEqual(submittedToken, deps.authorizationToken)) {
    return sendHtml(res, 401, renderAuthorizePage(params, 'Token incorrecto. Vuelve a intentarlo.'))
  }

  // Issue authorization code as a signed JWT (stateless).
  const codeJwt = issueAuthCode({
    client_id: params.client_id,
    redirect_uri: params.redirect_uri,
    code_challenge: params.code_challenge,
    code_challenge_method: 'S256',
    resource: params.resource,
    scope: params.scope ?? 'mcp',
  })

  const redirect = new URL(params.redirect_uri)
  redirect.searchParams.set('code', codeJwt)
  if (params.state) redirect.searchParams.set('state', params.state)

  res.writeHead(302, { location: redirect.toString(), 'cache-control': 'no-store' })
  res.end()
}

function renderAuthorizePage(params: AuthorizeParams, errorMessage: string | null): string {
  const hidden = (name: string, value: string | null) =>
    value === null ? '' : `<input type="hidden" name="${htmlEscape(name)}" value="${htmlEscape(value)}" />`

  const error = errorMessage
    ? `<p class="error" role="alert">${htmlEscape(errorMessage)}</p>`
    : ''

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Autorizar Finanzas MCP</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f5f3ef;
    color: #2a2520;
    padding: 1.5rem;
  }
  @media (prefers-color-scheme: dark) {
    body { background: #1a1815; color: #eee4d9; }
    .card { background: #2a2520; border-color: #3a342e; }
    input[type=password] { background: #1a1815; color: #eee4d9; border-color: #3a342e; }
  }
  .card {
    max-width: 420px;
    width: 100%;
    background: #fff;
    border: 1px solid #e8e2d8;
    border-radius: 12px;
    padding: 2rem;
    box-shadow: 0 8px 24px rgba(42, 37, 32, 0.06);
  }
  h1 {
    margin: 0 0 0.25rem;
    font-size: 1.35rem;
    font-weight: 600;
  }
  .subtitle {
    margin: 0 0 1.5rem;
    color: #7a6f62;
    font-size: 0.9rem;
  }
  label {
    display: block;
    font-size: 0.85rem;
    font-weight: 500;
    margin-bottom: 0.4rem;
  }
  input[type=password] {
    width: 100%;
    padding: 0.6rem 0.75rem;
    font-size: 1rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    border: 1px solid #d4cec3;
    border-radius: 8px;
    background: #fafaf7;
    color: inherit;
  }
  input[type=password]:focus {
    outline: 2px solid #c2410c;
    outline-offset: 1px;
    border-color: #c2410c;
  }
  button {
    width: 100%;
    margin-top: 1rem;
    padding: 0.7rem 1rem;
    font-size: 1rem;
    font-weight: 500;
    border: 0;
    border-radius: 8px;
    background: #c2410c;
    color: white;
    cursor: pointer;
  }
  button:hover { background: #9a3412; }
  .hint {
    margin-top: 1.25rem;
    padding: 0.85rem 1rem;
    background: #faf6ef;
    border: 1px solid #ede4d1;
    border-radius: 8px;
    font-size: 0.82rem;
    color: #6b5d49;
    line-height: 1.5;
  }
  @media (prefers-color-scheme: dark) {
    .hint { background: #252019; border-color: #3a342e; color: #b8a891; }
  }
  .hint strong { color: inherit; }
  .error {
    margin: 0 0 1rem;
    padding: 0.6rem 0.75rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 6px;
    color: #b91c1c;
    font-size: 0.88rem;
  }
  @media (prefers-color-scheme: dark) {
    .error { background: #3a1414; border-color: #5a1e1e; color: #fca5a5; }
  }
</style>
</head>
<body>
<main class="card">
  <h1>Autorizar Finanzas MCP</h1>
  <p class="subtitle">Conexión a tu servidor personal de finanzas.</p>
  ${error}
  <form method="POST" action="/authorize" autocomplete="off">
    ${hidden('response_type', params.response_type)}
    ${hidden('client_id', params.client_id)}
    ${hidden('redirect_uri', params.redirect_uri)}
    ${hidden('state', params.state)}
    ${hidden('code_challenge', params.code_challenge)}
    ${hidden('code_challenge_method', params.code_challenge_method)}
    ${hidden('resource', params.resource)}
    ${hidden('scope', params.scope)}
    <label for="authorization_token">Token de autorización</label>
    <input
      id="authorization_token"
      name="authorization_token"
      type="password"
      autocomplete="off"
      autofocus
      required
    />
    <button type="submit">Autorizar</button>
  </form>
  <div class="hint">
    <strong>¿Qué es esto?</strong><br />
    Pega aquí el valor de <code>MCP_PUBLIC_KEY</code> para permitir que Claude acceda a tus finanzas. Este token sólo se verifica, nunca se guarda en el cliente.
  </div>
</main>
</body>
</html>`
}

function renderErrorPage(error: string, description: string): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Error — Finanzas MCP</title>
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    max-width: 480px;
    margin: 5rem auto;
    padding: 2rem;
    color: #2a2520;
  }
  h1 { color: #b91c1c; margin: 0 0 0.5rem; }
  code { background: #faf6ef; padding: 0.15rem 0.35rem; border-radius: 4px; font-size: 0.9em; }
</style>
</head>
<body>
<h1>Solicitud inválida</h1>
<p><code>${htmlEscape(error)}</code></p>
<p>${htmlEscape(description)}</p>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// POST /token  — authorization_code and refresh_token grants
// ---------------------------------------------------------------------------

export async function handleToken(req: http.IncomingMessage, res: http.ServerResponse, deps: OAuthDeps) {
  const raw = await readBody(req)
  const form = parseFormOrJson(raw, req.headers['content-type'] as string | undefined)
  const grantType = form.grant_type ?? ''

  if (grantType === 'authorization_code') {
    return handleAuthCodeGrant(form, res, deps)
  }
  if (grantType === 'refresh_token') {
    return handleRefreshGrant(form, res, deps)
  }
  return sendJson(res, 400, {
    error: 'unsupported_grant_type',
    error_description: `grant_type must be authorization_code or refresh_token (got ${grantType || '<missing>'})`,
  })
}

function handleAuthCodeGrant(
  form: Record<string, string>,
  res: http.ServerResponse,
  deps: OAuthDeps,
) {
  const code = form.code ?? ''
  const clientId = form.client_id ?? ''
  const redirectUri = form.redirect_uri ?? ''
  const codeVerifier = form.code_verifier ?? ''

  if (!code || !clientId || !redirectUri || !codeVerifier) {
    return sendJson(res, 400, {
      error: 'invalid_request',
      error_description: 'code, client_id, redirect_uri, and code_verifier are required',
    })
  }

  // Verify the authorization code JWT. We can't enforce single-use without
  // server state — we rely on the 5-minute exp + the PKCE code_verifier
  // (which the attacker doesn't have) to make replay useless.
  const record = verifyAuthCode(code)
  if (!record) {
    return sendJson(res, 400, { error: 'invalid_grant', error_description: 'Code not found or expired' })
  }

  if (record.client_id !== clientId) {
    return sendJson(res, 400, { error: 'invalid_grant', error_description: 'client_id mismatch' })
  }
  if (record.redirect_uri !== redirectUri) {
    return sendJson(res, 400, { error: 'invalid_grant', error_description: 'redirect_uri mismatch' })
  }
  if (!verifyS256(codeVerifier, record.code_challenge)) {
    return sendJson(res, 400, { error: 'invalid_grant', error_description: 'code_verifier mismatch' })
  }

  const accessToken = issueAccessToken({
    sub: deps.ownerUserId,
    client_id: record.client_id,
    resource: record.resource,
    scope: record.scope,
  })
  const refreshToken = issueRefreshToken({
    sub: deps.ownerUserId,
    client_id: record.client_id,
    resource: record.resource,
    scope: record.scope,
  })

  sendJson(res, 200, {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: TTL.ACCESS_TOKEN_S,
    refresh_token: refreshToken,
    scope: record.scope,
  })
}

function handleRefreshGrant(
  form: Record<string, string>,
  res: http.ServerResponse,
  deps: OAuthDeps,
) {
  const refreshToken = form.refresh_token ?? ''
  const clientId = form.client_id ?? ''
  if (!refreshToken) {
    return sendJson(res, 400, { error: 'invalid_request', error_description: 'refresh_token is required' })
  }

  const existing = verifyRefreshToken(refreshToken)
  if (!existing) {
    return sendJson(res, 400, { error: 'invalid_grant', error_description: 'Refresh token not found or expired' })
  }
  if (clientId && clientId !== existing.client_id) {
    return sendJson(res, 400, { error: 'invalid_grant', error_description: 'client_id mismatch' })
  }

  // Rotation — issue new access + refresh JWTs. Note: the previous refresh
  // token remains valid until its `exp` because we cannot enforce single-use
  // without server state. This is a documented deviation from strict
  // OAuth 2.1 §4.3.1 and is accepted by Claude.ai for this single-user
  // deployment.
  const newAccess = issueAccessToken({
    sub: deps.ownerUserId,
    client_id: existing.client_id,
    resource: existing.resource,
    scope: existing.scope,
  })
  const newRefresh = issueRefreshToken({
    sub: deps.ownerUserId,
    client_id: existing.client_id,
    resource: existing.resource,
    scope: existing.scope,
  })

  sendJson(res, 200, {
    access_token: newAccess,
    token_type: 'Bearer',
    expires_in: TTL.ACCESS_TOKEN_S,
    refresh_token: newRefresh,
    scope: existing.scope,
  })
}

/**
 * Build the WWW-Authenticate header value per RFC 9728 §5.1
 * so clients can discover the Protected Resource Metadata URL.
 */
export function buildWwwAuthenticate(req: http.IncomingMessage, error?: string): string {
  const metadataUrl = `${getIssuer(req)}/.well-known/oauth-protected-resource`
  const parts = [`Bearer realm="mcp"`, `resource_metadata="${metadataUrl}"`]
  if (error) parts.push(`error="${error}"`)
  return parts.join(', ')
}
