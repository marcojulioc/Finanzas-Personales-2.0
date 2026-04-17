import { describe, it, expect } from 'vitest'
import crypto from 'node:crypto'
import { base64UrlEncode, verifyS256 } from './pkce.js'

describe('PKCE S256', () => {
  // RFC 7636 Appendix B test vector:
  //   code_verifier  = dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
  //   code_challenge = E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
  it('matches RFC 7636 Appendix B test vector', () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
    const challenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'
    expect(verifyS256(verifier, challenge)).toBe(true)
  })

  it('rejects a verifier that does not match the challenge', () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
    const wrong = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    expect(verifyS256(verifier, wrong)).toBe(false)
  })

  it('rejects a verifier that is too short (< 43 chars per RFC 7636)', () => {
    const short = 'a'.repeat(42)
    const challenge = base64UrlEncode(crypto.createHash('sha256').update(short).digest())
    expect(verifyS256(short, challenge)).toBe(false)
  })

  it('rejects a verifier that is too long (> 128 chars per RFC 7636)', () => {
    const long = 'a'.repeat(129)
    const challenge = base64UrlEncode(crypto.createHash('sha256').update(long).digest())
    expect(verifyS256(long, challenge)).toBe(false)
  })

  it('rejects a verifier containing non-unreserved characters', () => {
    // '$' is not in the unreserved set per RFC 7636
    const bad = 'a'.repeat(42) + '$'
    const challenge = base64UrlEncode(crypto.createHash('sha256').update(bad).digest())
    expect(verifyS256(bad, challenge)).toBe(false)
  })

  it('round-trips a freshly generated verifier', () => {
    const verifier = crypto.randomBytes(48).toString('base64url')
    const challenge = base64UrlEncode(crypto.createHash('sha256').update(verifier).digest())
    expect(verifyS256(verifier, challenge)).toBe(true)
  })

  it('base64UrlEncode strips padding and replaces url-unsafe chars', () => {
    // Bytes chosen to force both + and / and = in std base64
    const buf = Buffer.from([0xfb, 0xff, 0xbf])
    const std = buf.toString('base64') // "+/+/"
    expect(std).toContain('+')
    expect(std).toContain('/')
    const url = base64UrlEncode(buf)
    expect(url).not.toContain('+')
    expect(url).not.toContain('/')
    expect(url).not.toContain('=')
  })
})
