import http from 'node:http'
import crypto from 'node:crypto'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { ApiClient } from './api-client.js'
import { buildMcpServer } from './server.js'

const PORT = Number(process.env.PORT ?? 3333)
const APP_URL = process.env.APP_URL
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY
const MCP_PUBLIC_KEY = process.env.MCP_PUBLIC_KEY

if (!APP_URL || !INTERNAL_API_KEY || !MCP_PUBLIC_KEY) {
  console.error('Missing required env vars: APP_URL, INTERNAL_API_KEY, MCP_PUBLIC_KEY')
  process.exit(1)
}

const api = new ApiClient(APP_URL.replace(/\/$/, '') + '/api', INTERNAL_API_KEY)

async function readBody(req: http.IncomingMessage): Promise<unknown> {
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

const server = http.createServer(async (req, res) => {
  const url = req.url ?? '/'

  if (req.method === 'GET' && url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: true }))
    return
  }

  if (url === '/mcp') {
    const authHeader = (req.headers['authorization'] as string | undefined) ?? ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    const expected = MCP_PUBLIC_KEY!
    const tokenBuf = Buffer.from(token)
    const expectedBuf = Buffer.from(expected)
    const valid =
      tokenBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(tokenBuf, expectedBuf)
    if (!valid) {
      res.writeHead(401, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: 'unauthorized' }))
      return
    }

    const body = await readBody(req)
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    const mcpServer = buildMcpServer(api)
    await mcpServer.connect(transport)
    await transport.handleRequest(req, res, body)
    return
  }

  res.writeHead(404, { 'content-type': 'application/json' })
  res.end(JSON.stringify({ error: 'not found' }))
})

server.listen(PORT, () => {
  console.log(`finanzas-mcp listening on :${PORT}`)
})
