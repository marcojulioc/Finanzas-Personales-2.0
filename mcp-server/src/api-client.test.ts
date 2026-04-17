import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiClient } from './api-client.js'

describe('ApiClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('sends X-API-Key header and parses JSON data', async () => {
    ;(fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ id: 'a1' }] }),
    })
    const client = new ApiClient('http://api.test', 'secret-key')
    const result = await client.get('/accounts')

    expect(fetch).toHaveBeenCalledWith('http://api.test/accounts', expect.objectContaining({
      headers: expect.objectContaining({ 'x-api-key': 'secret-key' }),
    }))
    expect(result).toEqual([{ id: 'a1' }])
  })

  it('throws descriptive error on non-2xx', async () => {
    ;(fetch as any).mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ error: 'Datos inválidos' }),
    })
    const client = new ApiClient('http://api.test', 'k')
    await expect(client.get('/bad')).rejects.toThrow(/422.*Datos inválidos/)
  })

  it('sends POST with JSON body', async () => {
    ;(fetch as any).mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ data: { id: 'x' } }),
    })
    const client = new ApiClient('http://api.test', 'k')
    await client.post('/transactions', { type: 'income', amount: 5 })

    expect(fetch).toHaveBeenCalledWith('http://api.test/transactions', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ type: 'income', amount: 5 }),
      headers: expect.objectContaining({
        'content-type': 'application/json',
        'x-api-key': 'k',
      }),
    }))
  })
})
