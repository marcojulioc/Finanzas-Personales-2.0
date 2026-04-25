import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  OAuthStore,
  issueAuthCode,
  verifyAuthCode,
  issueAccessToken,
  verifyAccessToken,
  issueRefreshToken,
  verifyRefreshToken,
  _resetSigningKeyCache,
  TTL,
} from './store.js'
import { signJWT, deriveSigningKey, verifyJWT } from './jwt.js'

const PREV_KEY = process.env.MCP_PUBLIC_KEY

beforeEach(() => {
  process.env.MCP_PUBLIC_KEY = 'test-mcp-key'
  _resetSigningKeyCache()
})

afterEach(() => {
  if (PREV_KEY === undefined) delete process.env.MCP_PUBLIC_KEY
  else process.env.MCP_PUBLIC_KEY = PREV_KEY
  _resetSigningKeyCache()
})

describe('issueAuthCode / verifyAuthCode', () => {
  it('round-trips and preserves the input fields', () => {
    const code = issueAuthCode({
      client_id: 'c1',
      redirect_uri: 'https://a/cb',
      resource: 'https://mcp/mcp',
      code_challenge: 'chal',
      code_challenge_method: 'S256',
      scope: 'mcp',
    })
    expect(code).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)
    const v = verifyAuthCode(code)
    expect(v).not.toBeNull()
    expect(v!.typ).toBe('code')
    expect(v!.client_id).toBe('c1')
    expect(v!.redirect_uri).toBe('https://a/cb')
    expect(v!.resource).toBe('https://mcp/mcp')
    expect(v!.code_challenge).toBe('chal')
    expect(v!.code_challenge_method).toBe('S256')
    expect(v!.scope).toBe('mcp')
    expect(v!.jti).toMatch(/^[a-f0-9]{32}$/)
    expect(v!.exp - v!.iat).toBe(TTL.AUTH_CODE_S)
  })

  it('allows resource=null', () => {
    const code = issueAuthCode({
      client_id: 'c1',
      redirect_uri: 'https://a/cb',
      resource: null,
      code_challenge: 'chal',
      code_challenge_method: 'S256',
      scope: 'mcp',
    })
    const v = verifyAuthCode(code)
    expect(v?.resource).toBeNull()
  })

  it('rejects a token whose typ is not "code"', () => {
    const access = issueAccessToken({ sub: 'u', client_id: 'c1', resource: null, scope: 'mcp' })
    expect(verifyAuthCode(access)).toBeNull()
  })

  it('rejects an expired auth code', () => {
    const key = deriveSigningKey('test-mcp-key')
    const past = Math.floor(Date.now() / 1000) - 10
    const expired = signJWT(
      {
        typ: 'code',
        client_id: 'c1',
        redirect_uri: 'https://a/cb',
        resource: null,
        code_challenge: 'chal',
        code_challenge_method: 'S256',
        scope: 'mcp',
        iat: past - 60,
        exp: past,
        jti: 'aaaa',
      },
      key,
    )
    expect(verifyAuthCode(expired)).toBeNull()
  })

  it('rejects a JWT signed with a different MCP_PUBLIC_KEY (kill switch)', () => {
    const code = issueAuthCode({
      client_id: 'c1',
      redirect_uri: 'https://a/cb',
      resource: null,
      code_challenge: 'chal',
      code_challenge_method: 'S256',
      scope: 'mcp',
    })
    process.env.MCP_PUBLIC_KEY = 'rotated-key'
    _resetSigningKeyCache()
    expect(verifyAuthCode(code)).toBeNull()
  })

  it('issues distinct jti values for back-to-back calls', () => {
    const a = verifyAuthCode(
      issueAuthCode({
        client_id: 'c1',
        redirect_uri: 'https://a/cb',
        resource: null,
        code_challenge: 'chal',
        code_challenge_method: 'S256',
        scope: 'mcp',
      }),
    )!
    const b = verifyAuthCode(
      issueAuthCode({
        client_id: 'c1',
        redirect_uri: 'https://a/cb',
        resource: null,
        code_challenge: 'chal',
        code_challenge_method: 'S256',
        scope: 'mcp',
      }),
    )!
    expect(a.jti).not.toBe(b.jti)
  })
})

describe('issueAccessToken / verifyAccessToken', () => {
  it('round-trips with sub, client_id, resource, scope', () => {
    const t = issueAccessToken({
      sub: 'user-123',
      client_id: 'c1',
      resource: 'https://mcp/mcp',
      scope: 'mcp',
    })
    const v = verifyAccessToken(t)
    expect(v).not.toBeNull()
    expect(v!.typ).toBe('access')
    expect(v!.sub).toBe('user-123')
    expect(v!.client_id).toBe('c1')
    expect(v!.resource).toBe('https://mcp/mcp')
    expect(v!.scope).toBe('mcp')
    expect(v!.exp - v!.iat).toBe(TTL.ACCESS_TOKEN_S)
  })

  it('rejects a token whose typ is not "access" (e.g. refresh)', () => {
    const refresh = issueRefreshToken({ sub: 'u', client_id: 'c1', resource: null, scope: 'mcp' })
    expect(verifyAccessToken(refresh)).toBeNull()
  })

  it('rejects an expired access token', () => {
    const key = deriveSigningKey('test-mcp-key')
    const past = Math.floor(Date.now() / 1000) - 10
    const expired = signJWT(
      { typ: 'access', sub: 'u', client_id: 'c1', resource: null, scope: 'mcp', iat: past - 60, exp: past, jti: 'a' },
      key,
    )
    expect(verifyAccessToken(expired)).toBeNull()
  })

  it('rejects garbage', () => {
    expect(verifyAccessToken('not-a-jwt')).toBeNull()
    expect(verifyAccessToken('')).toBeNull()
  })
})

describe('issueRefreshToken / verifyRefreshToken', () => {
  it('round-trips and uses the 30-day TTL', () => {
    const t = issueRefreshToken({
      sub: 'user-123',
      client_id: 'c1',
      resource: 'https://mcp/mcp',
      scope: 'mcp',
    })
    const v = verifyRefreshToken(t)
    expect(v).not.toBeNull()
    expect(v!.typ).toBe('refresh')
    expect(v!.exp - v!.iat).toBe(TTL.REFRESH_TOKEN_S)
  })

  it('rejects an access token (typ mismatch)', () => {
    const access = issueAccessToken({ sub: 'u', client_id: 'c1', resource: null, scope: 'mcp' })
    expect(verifyRefreshToken(access)).toBeNull()
  })

  it('rejects an auth code (typ mismatch)', () => {
    const code = issueAuthCode({
      client_id: 'c1',
      redirect_uri: 'https://a/cb',
      resource: null,
      code_challenge: 'chal',
      code_challenge_method: 'S256',
      scope: 'mcp',
    })
    expect(verifyRefreshToken(code)).toBeNull()
  })
})

describe('signing key derivation domain separation', () => {
  it('the JWT signing key differs from the raw MCP_PUBLIC_KEY bytes', () => {
    // Sanity check: the legacy /mcp Bearer-equals-MCP_PUBLIC_KEY path on
    // index.ts compares against the raw secret. The JWT path uses a key
    // derived via sha256(secret + ":jwt-signing-v1"). They MUST differ so
    // the legacy debug path can't be confused with a JWT.
    const raw = Buffer.from('test-mcp-key')
    const derived = deriveSigningKey('test-mcp-key')
    expect(raw.equals(derived)).toBe(false)

    // And a JWT signed with derived must NOT verify under raw.
    const t = issueAccessToken({ sub: 'u', client_id: 'c1', resource: null, scope: 'mcp' })
    expect(verifyJWT(t, raw)).toBeNull()
    expect(verifyJWT(t, derived)).not.toBeNull()
  })
})

describe('OAuthStore (client registration — still in-memory)', () => {
  let store: OAuthStore

  beforeEach(() => {
    store = new OAuthStore()
  })

  it('issues unique client_ids and echoes registered metadata', () => {
    const a = store.registerClient({ redirect_uris: ['https://a.example/cb'] })
    const b = store.registerClient({ redirect_uris: ['https://b.example/cb'] })
    expect(a.client_id).not.toEqual(b.client_id)
    expect(a.client_id).toMatch(/^[a-f0-9]{64}$/)
    expect(a.redirect_uris).toEqual(['https://a.example/cb'])
    expect(a.grant_types).toContain('authorization_code')
    expect(a.response_types).toEqual(['code'])
    expect(a.token_endpoint_auth_method).toBe('none')
    expect(typeof a.client_id_issued_at).toBe('number')
  })

  it('allows retrieving a registered client by id', () => {
    const c = store.registerClient({ redirect_uris: ['https://x.example/cb'] })
    expect(store.getClient(c.client_id)?.client_id).toBe(c.client_id)
    expect(store.getClient('unknown')).toBeUndefined()
  })
})
