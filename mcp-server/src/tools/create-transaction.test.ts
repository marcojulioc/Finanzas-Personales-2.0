import { describe, it, expect, vi } from 'vitest'
import { createTransactionTool } from './create-transaction.js'

const mockAccounts = [
  { id: 'a1', name: 'Banco Popular Dominicano', currency: 'DOP', balance: '1000.00' },
  { id: 'a2', name: 'BHD Dólares', currency: 'USD', balance: '500.00' },
]
const mockCards = [
  { id: 'c1', name: 'Visa Popular', balances: [] },
]

function mockClient() {
  return {
    get: vi.fn((path: string) => {
      if (path === '/accounts') return Promise.resolve(mockAccounts)
      if (path === '/cards') return Promise.resolve(mockCards)
      throw new Error('unexpected ' + path)
    }),
    post: vi.fn().mockResolvedValue({ id: 'tx-new', type: 'income', amount: '500.00' }),
  }
}

describe('create_transaction tool', () => {
  it('resolves account name, infers currency, posts income', async () => {
    const api = mockClient()
    const result = await createTransactionTool.handler(
      { type: 'income', amount: 500, description: 'Bono', accountName: 'Popular', category: 'Bono' },
      { api: api as any },
    )

    expect(api.post).toHaveBeenCalledWith('/transactions', expect.objectContaining({
      type: 'income',
      amount: 500,
      bankAccountId: 'a1',
      currency: 'DOP',
      category: 'Bono',
      description: 'Bono',
    }))
    expect(result).toMatchObject({ id: 'tx-new', success: true })
  })

  it('handles transfer with target account', async () => {
    const api = mockClient()
    await createTransactionTool.handler(
      { type: 'transfer', amount: 100, description: 't', accountName: 'Popular', targetAccountName: 'BHD' },
      { api: api as any },
    )
    expect(api.post).toHaveBeenCalledWith('/transactions', expect.objectContaining({
      type: 'transfer',
      bankAccountId: 'a1',
      targetAccountId: 'a2',
    }))
  })

  it('throws on unknown account', async () => {
    const api = mockClient()
    await expect(
      createTransactionTool.handler(
        { type: 'income', amount: 1, description: 'x', accountName: 'Santander' },
        { api: api as any },
      ),
    ).rejects.toThrow(/no account matching/i)
  })

  it('throws on transfer without targetAccountName', async () => {
    const api = mockClient()
    await expect(
      createTransactionTool.handler(
        { type: 'transfer', amount: 1, description: 'x', accountName: 'Popular' },
        { api: api as any },
      ),
    ).rejects.toThrow(/targetAccountName required/i)
  })
})
