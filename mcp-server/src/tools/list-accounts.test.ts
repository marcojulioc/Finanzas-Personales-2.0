import { describe, it, expect, vi } from 'vitest'
import { listAccountsTool } from './list-accounts.js'

describe('list_accounts tool', () => {
  it('returns aggregated accounts, cards, and categories', async () => {
    const mockClient = {
      get: vi.fn((path: string) => {
        if (path === '/accounts') return Promise.resolve([{ id: 'a1', name: 'Popular', currency: 'DOP', balance: '100.00' }])
        if (path === '/cards') return Promise.resolve([
          { id: 'c1', name: 'Visa', balances: [{ currency: 'DOP', balance: '50.00' }, { currency: 'USD', balance: '10.00' }] },
        ])
        if (path.startsWith('/categories')) return Promise.resolve([{ name: 'Bono' }, { name: 'Salario' }])
        throw new Error('unexpected ' + path)
      }),
    } as any

    const result = await listAccountsTool.handler({}, { api: mockClient })

    expect(result.bankAccounts).toHaveLength(1)
    expect(result.bankAccounts[0]).toMatchObject({ id: 'a1', name: 'Popular', currency: 'DOP' })
    expect(result.creditCards).toHaveLength(1)
    expect(result.creditCards[0]).toEqual({
      id: 'c1',
      name: 'Visa',
      balances: [
        { currency: 'DOP', debt: '50.00' },
        { currency: 'USD', debt: '10.00' },
      ],
    })
    expect(result.categories).toContain('Bono')
  })
})
