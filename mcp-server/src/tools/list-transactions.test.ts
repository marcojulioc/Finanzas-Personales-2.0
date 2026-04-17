import { describe, it, expect, vi } from 'vitest'
import { listTransactionsTool } from './list-transactions.js'

describe('list_transactions tool', () => {
  it('returns formatted recent transactions', async () => {
    const mockClient = {
      get: vi.fn().mockResolvedValue([
        {
          id: 't1',
          type: 'income',
          amount: '500.00',
          description: 'Bono',
          category: 'Ingresos varios',
          date: '2026-04-15T00:00:00Z',
          bankAccount: { name: 'Popular' },
        },
      ]),
    } as any

    const result = await listTransactionsTool.handler({ limit: 10 }, { api: mockClient })

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      type: 'income',
      amount: '500.00',
      description: 'Bono',
      account: 'Popular',
    })
    expect(mockClient.get).toHaveBeenCalledWith(expect.stringContaining('limit=10'))
  })

  it('defaults limit to 10 and computes startDate when days provided', async () => {
    const mockClient = { get: vi.fn().mockResolvedValue([]) } as any
    await listTransactionsTool.handler({ days: 7 }, { api: mockClient })

    const call = mockClient.get.mock.calls[0][0] as string
    expect(call).toContain('limit=10')
    expect(call).toContain('startDate=')
  })
})
