import { describe, it, expect, vi } from 'vitest'
import { getBalanceTool } from './get-balance.js'

describe('get_balance tool', () => {
  it('returns matched account balance', async () => {
    const mockClient = {
      get: vi.fn().mockResolvedValue([
        { id: 'a1', name: 'Banco Popular Dominicano', currency: 'DOP', balance: '15420.50' },
        { id: 'a2', name: 'BHD Dólares', currency: 'USD', balance: '1200.00' },
      ]),
    } as any

    const result = await getBalanceTool.handler({ accountName: 'Popular' }, { api: mockClient })

    expect(result).toEqual({
      account: 'Banco Popular Dominicano',
      balance: '15420.50',
      currency: 'DOP',
    })
  })

  it('throws when no account matches', async () => {
    const mockClient = {
      get: vi.fn().mockResolvedValue([{ id: 'a1', name: 'Popular', currency: 'DOP', balance: '0' }]),
    } as any

    await expect(
      getBalanceTool.handler({ accountName: 'Santander' }, { api: mockClient }),
    ).rejects.toThrow(/no account matching/i)
  })
})
