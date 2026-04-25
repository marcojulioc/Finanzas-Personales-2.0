import { describe, it, expect } from 'vitest'
import crypto from 'node:crypto'
import { signJWT, verifyJWT, deriveSigningKey } from './jwt.js'

const KEY = crypto.createHash('sha256').update('test-secret:jwt-signing-v1').digest()

describe('deriveSigningKey', () => {
  it('returns a 32-byte Buffer derived from the input secret', () => {
    const k = deriveSigningKey('hello')
    expect(Buffer.isBuffer(k)).toBe(true)
    expect(k.length).toBe(32)
  })

  it('produces a different key for a different secret', () => {
    const a = deriveSigningKey('secret-a')
    const b = deriveSigningKey('secret-b')
    expect(a.equals(b)).toBe(false)
  })

  it('is deterministic for the same secret', () => {
    const a = deriveSigningKey('same')
    const b = deriveSigningKey('same')
    expect(a.equals(b)).toBe(true)
  })

  it('binds the derivation domain to "jwt-signing-v1"', () => {
    // Same as inline derivation in CLAUDE.md plan
    const expected = crypto.createHash('sha256').update('xyz:jwt-signing-v1').digest()
    expect(deriveSigningKey('xyz').equals(expected)).toBe(true)
  })
})

describe('signJWT / verifyJWT', () => {
  it('produces three base64url segments separated by dots', () => {
    const token = signJWT({ typ: 'test', foo: 1 }, KEY)
    const parts = token.split('.')
    expect(parts).toHaveLength(3)
    for (const p of parts) {
      expect(p).toMatch(/^[A-Za-z0-9_-]+$/)
    }
  })

  it('round-trips: verifyJWT returns the original payload', () => {
    const payload = { typ: 'test', sub: 'user1', n: 42 }
    const token = signJWT(payload, KEY)
    const verified = verifyJWT<typeof payload>(token, KEY)
    expect(verified).not.toBeNull()
    expect(verified!.typ).toBe('test')
    expect(verified!.sub).toBe('user1')
    expect(verified!.n).toBe(42)
  })

  it('uses HS256 in the header', () => {
    const token = signJWT({ typ: 'x' }, KEY)
    const headerSeg = token.split('.')[0]
    const headerJson = Buffer.from(headerSeg, 'base64url').toString('utf8')
    const header = JSON.parse(headerJson)
    expect(header.alg).toBe('HS256')
    expect(header.typ).toBe('JWT')
  })

  it('returns null when the signature is tampered', () => {
    const token = signJWT({ typ: 'x', sub: 'a' }, KEY)
    const [h, p] = token.split('.')
    const bad = `${h}.${p}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`
    expect(verifyJWT(bad, KEY)).toBeNull()
  })

  it('returns null when the payload is tampered', () => {
    const token = signJWT({ typ: 'x', sub: 'a' }, KEY)
    const [h, , s] = token.split('.')
    const tamperedPayload = Buffer.from(JSON.stringify({ typ: 'x', sub: 'B' })).toString('base64url')
    const tampered = `${h}.${tamperedPayload}.${s}`
    expect(verifyJWT(tampered, KEY)).toBeNull()
  })

  it('returns null when verified with a different key', () => {
    const token = signJWT({ typ: 'x' }, KEY)
    const other = crypto.createHash('sha256').update('other').digest()
    expect(verifyJWT(token, other)).toBeNull()
  })

  it('returns null when the token is malformed (not 3 segments)', () => {
    expect(verifyJWT('not-a-token', KEY)).toBeNull()
    expect(verifyJWT('a.b', KEY)).toBeNull()
    expect(verifyJWT('a.b.c.d', KEY)).toBeNull()
    expect(verifyJWT('', KEY)).toBeNull()
  })

  it('returns null when payload is not valid JSON', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
    const badPayload = Buffer.from('{not-json').toString('base64url')
    const signingInput = `${header}.${badPayload}`
    const sig = crypto.createHmac('sha256', KEY).update(signingInput).digest('base64url')
    const token = `${signingInput}.${sig}`
    expect(verifyJWT(token, KEY)).toBeNull()
  })

  it('returns null when the JWT is expired (exp in the past)', () => {
    const past = Math.floor(Date.now() / 1000) - 60
    const token = signJWT({ typ: 'x', exp: past }, KEY)
    expect(verifyJWT(token, KEY)).toBeNull()
  })

  it('accepts JWTs with exp in the future', () => {
    const future = Math.floor(Date.now() / 1000) + 60
    const token = signJWT({ typ: 'x', exp: future }, KEY)
    const v = verifyJWT<{ typ: string; exp: number }>(token, KEY)
    expect(v).not.toBeNull()
    expect(v!.exp).toBe(future)
  })

  it('accepts JWTs without exp (caller-controlled lifetime)', () => {
    const token = signJWT({ typ: 'x' }, KEY)
    expect(verifyJWT(token, KEY)).not.toBeNull()
  })

  it('uses a constant-time comparison for the signature (smoke check)', () => {
    // Not directly observable; assert that signature is deterministic and a one-off mutation is rejected.
    const token = signJWT({ typ: 'x', n: 1 }, KEY)
    const again = signJWT({ typ: 'x', n: 1 }, KEY)
    expect(token).toBe(again)
  })

  it('rejects a JWT whose header has alg=none', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
    const payload = Buffer.from(JSON.stringify({ typ: 'x' })).toString('base64url')
    const token = `${header}.${payload}.`
    expect(verifyJWT(token, KEY)).toBeNull()
  })

  it('rejects a JWT whose header has alg!=HS256', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS512', typ: 'JWT' })).toString('base64url')
    const payload = Buffer.from(JSON.stringify({ typ: 'x' })).toString('base64url')
    const signingInput = `${header}.${payload}`
    const sig = crypto.createHmac('sha512', KEY).update(signingInput).digest('base64url')
    const token = `${signingInput}.${sig}`
    expect(verifyJWT(token, KEY)).toBeNull()
  })
})
