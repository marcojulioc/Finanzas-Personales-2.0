import crypto from 'node:crypto'

/**
 * Minimal HS256 JWT primitives (RFC 7519) using only `node:crypto`.
 *
 * Used by the MCP OAuth layer to issue stateless artifacts (auth codes,
 * access/refresh tokens, DCR client_ids) so the server survives Railway
 * restarts without invalidating Claude.ai sessions.
 *
 * Intentionally minimal:
 *   - HS256 only (alg=HS256). Anything else, including `none`, is rejected.
 *   - Verifies signature in constant time, then validates `exp` (if present).
 *   - Caller is responsible for setting/checking the `typ` discriminator
 *     (e.g. "code"/"access"/"refresh"/"client") and any other domain claims.
 *
 * No external JWT library is used so we keep the dependency surface tiny —
 * the MCP server already only depends on the MCP SDK and zod.
 */

const HEADER = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')

/**
 * Derive a 32-byte signing key from a base secret. Domain-bound to
 * `:jwt-signing-v1` so:
 *   - rotating MCP_PUBLIC_KEY invalidates every JWT (kill switch),
 *   - the legacy `Bearer == MCP_PUBLIC_KEY` debug path on /mcp still
 *     compares against the raw secret (different bytes, different purpose).
 */
export function deriveSigningKey(secret: string): Buffer {
  return crypto.createHash('sha256').update(`${secret}:jwt-signing-v1`).digest()
}

/**
 * Sign a payload with HS256 and return a compact JWT string.
 * The header is fixed to {alg:"HS256",typ:"JWT"} — anything else is
 * a security smell for our use case.
 */
export function signJWT(payload: object, key: Buffer): string {
  const payloadSeg = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signingInput = `${HEADER}.${payloadSeg}`
  const sig = crypto.createHmac('sha256', key).update(signingInput).digest('base64url')
  return `${signingInput}.${sig}`
}

/**
 * Verify a JWT signed with HS256 and return the parsed payload, or null if:
 *   - the token is malformed (not exactly 3 base64url segments),
 *   - the header alg is not HS256,
 *   - the signature does not validate under `key`,
 *   - the payload JSON does not parse,
 *   - the `exp` claim (if present) is in the past (UNIX seconds).
 *
 * Caller MUST additionally check the `typ` discriminator on the returned
 * payload. This function is type-unaware on purpose — the JWT primitive
 * is shared across token kinds.
 */
export function verifyJWT<T = unknown>(token: string, key: Buffer): T | null {
  if (typeof token !== 'string' || token.length === 0) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [headerSeg, payloadSeg, sigSeg] = parts

  // Validate header.alg explicitly. We do NOT accept alg=none or any other alg.
  let header: { alg?: string; typ?: string }
  try {
    header = JSON.parse(Buffer.from(headerSeg, 'base64url').toString('utf8'))
  } catch {
    return null
  }
  if (!header || header.alg !== 'HS256') return null

  // Recompute signature.
  const signingInput = `${headerSeg}.${payloadSeg}`
  const expectedSig = crypto.createHmac('sha256', key).update(signingInput).digest()
  let providedSig: Buffer
  try {
    providedSig = Buffer.from(sigSeg, 'base64url')
  } catch {
    return null
  }
  if (providedSig.length !== expectedSig.length) return null
  if (!crypto.timingSafeEqual(providedSig, expectedSig)) return null

  // Parse payload.
  let payload: { exp?: number } & Record<string, unknown>
  try {
    payload = JSON.parse(Buffer.from(payloadSeg, 'base64url').toString('utf8'))
  } catch {
    return null
  }
  if (!payload || typeof payload !== 'object') return null

  // exp check (UNIX seconds).
  if (typeof payload.exp === 'number') {
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp < now) return null
  }

  return payload as T
}
