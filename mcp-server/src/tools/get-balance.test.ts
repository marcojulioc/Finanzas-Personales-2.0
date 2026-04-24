import { describe, it, expect, vi } from 'vitest'
import { getBalanceTool } from './get-balance.js'

function mockClient(accounts: unknown[], cards: unknown[]) {
  return {
    get: vi.fn((path: string) => {
      if (path === '/accounts') return Promise.resolve(accounts)
      if (path === '/cards') return Promise.resolve(cards)
      throw new Error('unexpected ' + path)
    }),
  } as any
}

describe('get_balance tool', () => {
  it('returns matched bank account balance', async () => {
    const api = mockClient(
      [
        { id: 'a1', name: 'Banco Popular Dominicano', currency: 'DOP', balance: '15420.50' },
        { id: 'a2', name: 'BHD Dólares', currency: 'USD', balance: '1200.00' },
      ],
      [],
    )

    const result = await getBalanceTool.handler({ accountName: 'Popular' }, { api })

    expect(result).toEqual({
      type: 'account',
      name: 'Banco Popular Dominicano',
      balance: '15420.50',
      currency: 'DOP',
    })
  })

  it('returns card balances when name matches a credit card', async () => {
    const api = mockClient(
      [{ id: 'a1', name: 'BHD Dólares', currency: 'USD', balance: '100.00' }],
      [
        {
          id: 'c1',
          name: 'Popular 4866',
          balances: [
            { currency: 'DOP', balance: '2500.00' },
            { currency: 'USD', balance: '75.00' },
          ],
        },
      ],
    )

    const result = await getBalanceTool.handler({ accountName: 'Popular 4866' }, { api })

    expect(result).toEqual({
      type: 'card',
      name: 'Popular 4866',
      balances: [
        { currency: 'DOP', debt: '2500.00' },
        { currency: 'USD', debt: '75.00' },
      ],
    })
  })

  it('throws when nothing matches in either accounts or cards', async () => {
    const api = mockClient(
      [{ id: 'a1', name: 'Popular', currency: 'DOP', balance: '0' }],
      [{ id: 'c1', name: 'Visa', balances: [] }],
    )

    await expect(
      getBalanceTool.handler({ accountName: 'Santander' }, { api }),
    ).rejects.toThrow(/no account or card matching/i)
  })

  it('throws ambiguity error when the same query matches a bank account and a card', async () => {
    const api = mockClient(
      [{ id: 'a1', name: 'Popular', currency: 'DOP', balance: '100.00' }],
      [{ id: 'c1', name: 'Popular', balances: [{ currency: 'DOP', balance: '50.00' }] }],
    )

    await expect(
      getBalanceTool.handler({ accountName: 'Popular' }, { api }),
    ).rejects.toThrow(/ambiguous/i)
  })

  it('throws ambiguity error when multiple bank accounts match', async () => {
    const api = mockClient(
      [
        { id: 'a1', name: 'Popular DOP', currency: 'DOP', balance: '100.00' },
        { id: 'a2', name: 'Popular USD', currency: 'USD', balance: '50.00' },
      ],
      [],
    )

    await expect(
      getBalanceTool.handler({ accountName: 'Popular' }, { api }),
    ).rejects.toThrow(/ambiguous/i)
  })

  it('throws ambiguity error when multiple cards match', async () => {
    const api = mockClient(
      [],
      [
        { id: 'c1', name: 'Popular 8695', balances: [] },
        { id: 'c2', name: 'Popular 4866', balances: [] },
      ],
    )

    await expect(
      getBalanceTool.handler({ accountName: 'Popular' }, { api }),
    ).rejects.toThrow(/ambiguous/i)
  })

  it('exact match wins over substring (no ambiguity when exact-normalized hits one)', async () => {
    const api = mockClient(
      [
        { id: 'a1', name: 'Popular', currency: 'DOP', balance: '100.00' },
        { id: 'a2', name: 'Popular Extra', currency: 'USD', balance: '50.00' },
      ],
      [],
    )

    const result = await getBalanceTool.handler({ accountName: 'Popular' }, { api })
    expect(result).toMatchObject({ type: 'account', name: 'Popular' })
  })
})
