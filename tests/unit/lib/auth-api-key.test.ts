import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual('@/lib/auth')
  return {
    ...actual,
    auth: vi.fn(),
  }
})

import { authenticateRequest } from '@/lib/auth-api-key'
import { auth } from '@/lib/auth'

describe('authenticateRequest', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    vi.resetAllMocks()
    process.env = {
      ...OLD_ENV,
      INTERNAL_API_KEY: 'test-internal-key',
      OWNER_USER_ID: 'owner-123',
    }
  })

  function makeReq(headers: Record<string, string>): NextRequest {
    return new NextRequest('http://localhost/api/test', { headers })
  }

  it('returns owner identity when X-API-Key matches INTERNAL_API_KEY', async () => {
    const req = makeReq({ 'x-api-key': 'test-internal-key' })
    const result = await authenticateRequest(req)
    expect(result).toEqual({ userId: 'owner-123', via: 'mcp' })
    expect(auth).not.toHaveBeenCalled()
  })

  it('falls back to NextAuth session when X-API-Key missing', async () => {
    ;(auth as any).mockResolvedValue({ user: { id: 'user-456' } })
    const req = makeReq({})
    const result = await authenticateRequest(req)
    expect(result).toEqual({ userId: 'user-456', via: 'session' })
  })

  it('returns null when X-API-Key wrong and no session', async () => {
    ;(auth as any).mockResolvedValue(null)
    const req = makeReq({ 'x-api-key': 'wrong-key' })
    const result = await authenticateRequest(req)
    expect(result).toBeNull()
  })

  it('does not accept empty string API key as valid', async () => {
    ;(auth as any).mockResolvedValue(null)
    const req = makeReq({ 'x-api-key': '' })
    const result = await authenticateRequest(req)
    expect(result).toBeNull()
  })
})
