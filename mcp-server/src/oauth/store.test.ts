import { describe, it, expect, beforeEach } from 'vitest'
import { OAuthStore } from './store.js'

describe('OAuthStore', () => {
  let store: OAuthStore

  beforeEach(() => {
    store = new OAuthStore()
  })

  describe('client registration', () => {
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

  describe('authorization codes', () => {
    it('issues, looks up once, and deletes the code after consumption', () => {
      const rec = store.issueAuthCode({
        client_id: 'c1',
        redirect_uri: 'https://a/cb',
        code_challenge: 'challenge',
        code_challenge_method: 'S256',
        resource: 'https://mcp/mcp',
        scope: 'mcp',
      })
      expect(rec.code).toMatch(/^[a-f0-9]{64}$/)

      const first = store.consumeAuthCode(rec.code)
      expect(first).toBeDefined()
      expect(first?.redirect_uri).toBe('https://a/cb')

      // Codes are one-time.
      const second = store.consumeAuthCode(rec.code)
      expect(second).toBeUndefined()
    })

    it('returns undefined for expired authorization codes', () => {
      const rec = store.issueAuthCode({
        client_id: 'c1',
        redirect_uri: 'https://a/cb',
        code_challenge: 'challenge',
        code_challenge_method: 'S256',
        resource: null,
        scope: 'mcp',
      })
      store._forceExpire(rec.code)
      expect(store.consumeAuthCode(rec.code)).toBeUndefined()
    })

    it('returns undefined for unknown codes', () => {
      expect(store.consumeAuthCode('does-not-exist')).toBeUndefined()
    })
  })

  describe('token pairs', () => {
    it('issues distinct access and refresh tokens with expected TTLs', () => {
      const { access, refresh } = store.issueTokenPair({
        client_id: 'c1',
        resource: 'https://mcp/mcp',
        scope: 'mcp',
      })
      expect(access.token).not.toEqual(refresh.token)
      expect(access.kind).toBe('access')
      expect(refresh.kind).toBe('refresh')

      const now = Date.now()
      // access ~24h, refresh ~30d
      expect(access.expires_at - now).toBeGreaterThan(20 * 60 * 60 * 1000)
      expect(refresh.expires_at - access.expires_at).toBeGreaterThan(20 * 24 * 60 * 60 * 1000)
    })

    it('getToken returns the record for valid tokens', () => {
      const { access } = store.issueTokenPair({ client_id: 'c1', resource: null, scope: 'mcp' })
      const rec = store.getToken(access.token)
      expect(rec?.kind).toBe('access')
      expect(rec?.client_id).toBe('c1')
    })

    it('getToken returns undefined and evicts expired tokens', () => {
      const { access } = store.issueTokenPair({ client_id: 'c1', resource: null, scope: 'mcp' })
      expect(store._stats().tokens).toBe(2)
      store._forceExpire(access.token)
      expect(store.getToken(access.token)).toBeUndefined()
      // The expired access token was evicted; the refresh is still there.
      expect(store._stats().tokens).toBe(1)
    })

    it('rotateRefresh returns a new pair and invalidates the old refresh + access', () => {
      const pair = store.issueTokenPair({ client_id: 'c1', resource: 'https://mcp/mcp', scope: 'mcp' })
      const rotated = store.rotateRefresh(pair.refresh.token)
      expect(rotated).toBeDefined()
      expect(rotated!.access.token).not.toEqual(pair.access.token)
      expect(rotated!.refresh.token).not.toEqual(pair.refresh.token)

      // Old refresh and its sibling access are now gone.
      expect(store.getToken(pair.refresh.token)).toBeUndefined()
      expect(store.getToken(pair.access.token)).toBeUndefined()
      // New pair is stored.
      expect(store.getToken(rotated!.access.token)?.kind).toBe('access')
      expect(store.getToken(rotated!.refresh.token)?.kind).toBe('refresh')
    })

    it('rotateRefresh refuses access tokens and unknown refresh tokens', () => {
      const pair = store.issueTokenPair({ client_id: 'c1', resource: null, scope: 'mcp' })
      expect(store.rotateRefresh(pair.access.token)).toBeUndefined()
      expect(store.rotateRefresh('unknown')).toBeUndefined()
    })
  })
})
