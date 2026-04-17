import crypto from 'node:crypto'

/**
 * PKCE (RFC 7636) S256 verification.
 *
 * The server stored `code_challenge` + `code_challenge_method` at /authorize
 * time. At /token time the client sends `code_verifier`. We recompute
 * BASE64URL(SHA256(code_verifier)) and compare with constant-time equality
 * against the stored challenge.
 */

/** Base64url-encode a Buffer (RFC 4648 §5, no padding). */
export function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Verify an S256 PKCE code_verifier against a stored code_challenge.
 * Returns true iff BASE64URL(SHA256(code_verifier)) === code_challenge.
 * Uses timingSafeEqual where inputs are comparable lengths.
 */
export function verifyS256(codeVerifier: string, codeChallenge: string): boolean {
  if (typeof codeVerifier !== 'string' || typeof codeChallenge !== 'string') {
    return false
  }
  // RFC 7636: verifier length must be 43..128 chars (unreserved chars only).
  if (codeVerifier.length < 43 || codeVerifier.length > 128) {
    return false
  }
  if (!/^[A-Za-z0-9\-._~]+$/.test(codeVerifier)) {
    return false
  }

  const hash = crypto.createHash('sha256').update(codeVerifier).digest()
  const computed = base64UrlEncode(hash)

  const a = Buffer.from(computed)
  const b = Buffer.from(codeChallenge)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}
