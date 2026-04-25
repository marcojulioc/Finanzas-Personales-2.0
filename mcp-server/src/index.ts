import http from 'node:http'
import crypto from 'node:crypto'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { ApiClient } from './api-client.js'
import { buildMcpServer } from './server.js'
import { verifyAccessToken } from './oauth/store.js'
import {
  handleAuthorizeGet,
  handleAuthorizePost,
  handleAuthServerMetadata,
  handleProtectedResourceMetadata,
  handleRegister,
  handleToken,
  buildWwwAuthenticate,
  getResourceUri,
} from './oauth/handlers.js'

const PORT = Number(process.env.PORT ?? 3333)
const APP_URL = process.env.APP_URL
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY
const MCP_PUBLIC_KEY = process.env.MCP_PUBLIC_KEY
const OWNER_USER_ID = process.env.OWNER_USER_ID

if (!APP_URL || !INTERNAL_API_KEY || !MCP_PUBLIC_KEY || !OWNER_USER_ID) {
  console.error('Missing required env vars: APP_URL, INTERNAL_API_KEY, MCP_PUBLIC_KEY, OWNER_USER_ID')
  process.exit(1)
}

const api = new ApiClient(APP_URL.replace(/\/$/, '') + '/api', INTERNAL_API_KEY)

const oauthDeps = {
  authorizationToken: MCP_PUBLIC_KEY!,
  ownerUserId: OWNER_USER_ID!,
}

async function readJsonBody(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  if (chunks.length === 0) return undefined
  const raw = Buffer.concat(chunks).toString('utf8')
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

function unauthorized(req: http.IncomingMessage, res: http.ServerResponse, errorCode?: string) {
  res.writeHead(401, {
    'content-type': 'application/json',
    'www-authenticate': buildWwwAuthenticate(req, errorCode),
  })
  res.end(JSON.stringify({ error: 'unauthorized' }))
}

/**
 * Authenticate an incoming /mcp request. Two paths, in order:
 *   1. OAuth: Bearer is a JWT signed with the derived JWT key (the
 *      normal path used by Claude.ai). Stateless — survives restarts.
 *   2. Legacy: Bearer == MCP_PUBLIC_KEY exactly (for curl/debugging),
 *      compared with crypto.timingSafeEqual.
 *
 * For OAuth tokens we also enforce audience binding (RFC 8707): if the
 * token was issued with a `resource` parameter, it must match this
 * server's canonical /mcp URI or its issuer origin. Legacy fallback
 * tokens skip this check since they aren't bound to a resource.
 */
function authenticateMcp(req: http.IncomingMessage): { ok: true } | { ok: false; error: string } {
  const authHeader = (req.headers['authorization'] as string | undefined) ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return { ok: false, error: 'invalid_token' }

  // 1. JWT access-token path
  const claims = verifyAccessToken(token)
  if (claims) {
    if (claims.resource) {
      const expectedResource = getResourceUri(req)
      // Accept either the exact /mcp URI or the issuer origin (both are canonical per spec).
      const issuer = expectedResource.replace(/\/mcp$/, '')
      if (claims.resource !== expectedResource && claims.resource !== issuer) {
        return { ok: false, error: 'invalid_token' }
      }
    }
    return { ok: true }
  }

  // 2. Legacy static-key fallback (kept for debugging; timing-safe compare).
  // This is intentionally NOT a JWT path — it lets cURL hit /mcp by sending
  // the raw MCP_PUBLIC_KEY value, which is convenient for ad-hoc testing.
  const expected = MCP_PUBLIC_KEY!
  const tokenBuf = Buffer.from(token)
  const expectedBuf = Buffer.from(expected)
  if (tokenBuf.length === expectedBuf.length && crypto.timingSafeEqual(tokenBuf, expectedBuf)) {
    return { ok: true }
  }

  return { ok: false, error: 'invalid_token' }
}

const server = http.createServer(async (req, res) => {
  const rawUrl = req.url ?? '/'
  // Strip query string for path routing
  const path = rawUrl.split('?')[0]

  try {
    if (req.method === 'GET' && path === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
      return
    }

    if (req.method === 'GET' && path === '/.well-known/oauth-protected-resource') {
      return handleProtectedResourceMetadata(req, res)
    }
    if (req.method === 'GET' && path === '/.well-known/oauth-authorization-server') {
      return handleAuthServerMetadata(req, res)
    }
    if (req.method === 'POST' && path === '/register') {
      return handleRegister(req, res, oauthDeps)
    }
    if (req.method === 'GET' && path === '/authorize') {
      return handleAuthorizeGet(req, res, oauthDeps)
    }
    if (req.method === 'POST' && path === '/authorize') {
      return handleAuthorizePost(req, res, oauthDeps)
    }
    if (req.method === 'POST' && path === '/token') {
      return handleToken(req, res, oauthDeps)
    }

    if (path === '/mcp') {
      const auth = authenticateMcp(req)
      if (!auth.ok) {
        return unauthorized(req, res, auth.error)
      }

      const body = await readJsonBody(req)
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
      const mcpServer = buildMcpServer(api)
      await mcpServer.connect(transport)
      await transport.handleRequest(req, res, body)
      return
    }

    res.writeHead(404, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: 'not found' }))
  } catch (err) {
    console.error('Unhandled request error', err)
    if (!res.headersSent) {
      res.writeHead(500, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: 'internal_server_error' }))
    } else {
      res.end()
    }
  }
})

server.listen(PORT, () => {
  console.log(`finanzas-mcp listening on :${PORT}`)
})
