import { describe, it, expect, vi } from 'vitest'
import { createTransactionTool } from './create-transaction.js'

const mockAccounts = [
  { id: 'a1', name: 'Banco Popular Dominicano', currency: 'DOP', balance: '1000.00' },
  { id: 'a2', name: 'BHD Dólares', currency: 'USD', balance: '500.00' },
]

const mockCards = [
  {
    id: 'c1',
    name: 'Popular 4866',
    balances: [{ currency: 'DOP', balance: '0.00' }],
  },
  {
    id: 'c2',
    name: 'Visa Multimoneda',
    balances: [
      { currency: 'DOP', balance: '0.00' },
      { currency: 'USD', balance: '0.00' },
    ],
  },
  {
    id: 'c3',
    name: 'Mastercard Empty',
    balances: [],
  },
]

function mockClient(overrides: { accounts?: unknown[]; cards?: unknown[] } = {}) {
  const accounts = overrides.accounts ?? mockAccounts
  const cards = overrides.cards ?? mockCards
  return {
    get: vi.fn((path: string) => {
      if (path === '/accounts') return Promise.resolve(accounts)
      if (path === '/cards') return Promise.resolve(cards)
      throw new Error('unexpected ' + path)
    }),
    post: vi.fn().mockResolvedValue({ id: 'tx-new', type: 'expense', amount: '500.00' }),
  }
}

describe('create_transaction tool', () => {
  describe('bank-account flows', () => {
    it('resolves account name, infers currency, posts income', async () => {
      const api = mockClient()
      const result = await createTransactionTool.handler(
        { type: 'income', amount: 500, description: 'Bono', accountName: 'Popular Dominicano', category: 'Bono' },
        { api: api as any },
      )

      expect(api.post).toHaveBeenCalledWith(
        '/transactions',
        expect.objectContaining({
          type: 'income',
          amount: 500,
          bankAccountId: 'a1',
          currency: 'DOP',
          category: 'Bono',
          description: 'Bono',
        }),
      )
      expect(api.post).toHaveBeenCalledWith(
        '/transactions',
        expect.not.objectContaining({ creditCardId: expect.anything() }),
      )
      expect(result).toMatchObject({ id: 'tx-new', success: true })
    })

    it('handles transfer with target account', async () => {
      const api = mockClient()
      await createTransactionTool.handler(
        {
          type: 'transfer',
          amount: 100,
          description: 't',
          accountName: 'Popular Dominicano',
          targetAccountName: 'BHD',
        },
        { api: api as any },
      )
      expect(api.post).toHaveBeenCalledWith(
        '/transactions',
        expect.objectContaining({
          type: 'transfer',
          bankAccountId: 'a1',
          targetAccountId: 'a2',
        }),
      )
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
          { type: 'transfer', amount: 1, description: 'x', accountName: 'Popular Dominicano' },
          { api: api as any },
        ),
      ).rejects.toThrow(/targetAccountName required/i)
    })

    it('throws on ambiguous accountName', async () => {
      const api = mockClient({
        accounts: [
          { id: 'a1', name: 'Popular 8695', currency: 'DOP', balance: '100' },
          { id: 'a2', name: 'Popular 4866', currency: 'DOP', balance: '200' },
        ],
      })
      await expect(
        createTransactionTool.handler(
          { type: 'income', amount: 1, description: 'x', accountName: 'Popular' },
          { api: api as any },
        ),
      ).rejects.toThrow(/ambiguous/i)
    })

    it('throws on ambiguous targetAccountName for transfers', async () => {
      const api = mockClient({
        accounts: [
          { id: 'a1', name: 'Popular', currency: 'DOP', balance: '100' },
          { id: 'a2', name: 'BHD One', currency: 'DOP', balance: '100' },
          { id: 'a3', name: 'BHD Two', currency: 'DOP', balance: '100' },
        ],
      })
      await expect(
        createTransactionTool.handler(
          {
            type: 'transfer',
            amount: 1,
            description: 'x',
            accountName: 'Popular',
            targetAccountName: 'BHD',
          },
          { api: api as any },
        ),
      ).rejects.toThrow(/ambiguous/i)
    })
  })

  describe('credit-card flows', () => {
    it('charges expense to credit card when cardName provided (no bankAccountId)', async () => {
      const api = mockClient()
      await createTransactionTool.handler(
        { type: 'expense', amount: 200, description: 'Compra', cardName: 'Popular 4866' },
        { api: api as any },
      )
      const posted = api.post.mock.calls[0][1] as Record<string, unknown>
      expect(posted.creditCardId).toBe('c1')
      expect(posted.bankAccountId).toBeUndefined()
      expect(posted.type).toBe('expense')
    })

    it('defaults currency from card when card has a single-currency balance', async () => {
      const api = mockClient()
      await createTransactionTool.handler(
        { type: 'expense', amount: 100, description: 'x', cardName: 'Popular 4866' },
        { api: api as any },
      )
      expect(api.post).toHaveBeenCalledWith(
        '/transactions',
        expect.objectContaining({ currency: 'DOP', creditCardId: 'c1' }),
      )
    })

    it('uses explicit currency when provided, even with single-currency card', async () => {
      const api = mockClient()
      await createTransactionTool.handler(
        {
          type: 'expense',
          amount: 100,
          description: 'x',
          cardName: 'Popular 4866',
          currency: 'USD',
        },
        { api: api as any },
      )
      expect(api.post).toHaveBeenCalledWith(
        '/transactions',
        expect.objectContaining({ currency: 'USD', creditCardId: 'c1' }),
      )
    })

    it('requires explicit currency when card has multiple-currency balances', async () => {
      const api = mockClient()
      await expect(
        createTransactionTool.handler(
          { type: 'expense', amount: 100, description: 'x', cardName: 'Multimoneda' },
          { api: api as any },
        ),
      ).rejects.toThrow(/multiple currencies/i)
    })

    it('requires explicit currency when card has no balance records', async () => {
      const api = mockClient()
      await expect(
        createTransactionTool.handler(
          { type: 'expense', amount: 100, description: 'x', cardName: 'Mastercard Empty' },
          { api: api as any },
        ),
      ).rejects.toThrow(/currency/i)
    })

    it('throws on ambiguous cardName', async () => {
      const api = mockClient({
        cards: [
          { id: 'c1', name: 'Popular 4866', balances: [] },
          { id: 'c2', name: 'Popular 8695', balances: [] },
        ],
      })
      await expect(
        createTransactionTool.handler(
          { type: 'expense', amount: 1, description: 'x', cardName: 'Popular' },
          { api: api as any },
        ),
      ).rejects.toThrow(/ambiguous/i)
    })

    it('throws on unknown cardName', async () => {
      const api = mockClient()
      await expect(
        createTransactionTool.handler(
          { type: 'expense', amount: 1, description: 'x', cardName: 'Diners' },
          { api: api as any },
        ),
      ).rejects.toThrow(/no card matching/i)
    })
  })

  describe('input validation', () => {
    it('rejects when both accountName and cardName provided', async () => {
      const api = mockClient()
      await expect(
        createTransactionTool.handler(
          {
            type: 'expense',
            amount: 1,
            description: 'x',
            accountName: 'Popular',
            cardName: 'Popular 4866',
          },
          { api: api as any },
        ),
      ).rejects.toThrow(/exactly one/i)
    })

    it('rejects when neither accountName nor cardName provided', async () => {
      const api = mockClient()
      await expect(
        createTransactionTool.handler(
          { type: 'expense', amount: 1, description: 'x' },
          { api: api as any },
        ),
      ).rejects.toThrow(/exactly one/i)
    })

    it('rejects cardName for type=income', async () => {
      const api = mockClient()
      await expect(
        createTransactionTool.handler(
          { type: 'income', amount: 1, description: 'x', cardName: 'Popular 4866' },
          { api: api as any },
        ),
      ).rejects.toThrow(/income.*card|card.*income/i)
    })

    it('rejects cardName for type=transfer', async () => {
      const api = mockClient()
      await expect(
        createTransactionTool.handler(
          {
            type: 'transfer',
            amount: 1,
            description: 'x',
            cardName: 'Popular 4866',
            targetAccountName: 'BHD',
          },
          { api: api as any },
        ),
      ).rejects.toThrow(/transfer.*card|card.*transfer/i)
    })

    it('rejects cardName combined with targetCardName', async () => {
      const api = mockClient()
      await expect(
        createTransactionTool.handler(
          {
            type: 'expense',
            amount: 1,
            description: 'x',
            cardName: 'Popular 4866',
            targetCardName: 'Visa Multimoneda',
          },
          { api: api as any },
        ),
      ).rejects.toThrow(/cannot.*pay|targetCardName/i)
    })
  })

  describe('card payments (existing path, still via accountName)', () => {
    it('still supports accountName + targetCardName for card payments', async () => {
      const api = mockClient()
      await createTransactionTool.handler(
        {
          type: 'expense',
          amount: 500,
          description: 'Pago tarjeta',
          accountName: 'Popular Dominicano',
          targetCardName: 'Popular 4866',
        },
        { api: api as any },
      )
      expect(api.post).toHaveBeenCalledWith(
        '/transactions',
        expect.objectContaining({
          bankAccountId: 'a1',
          targetCardId: 'c1',
          isCardPayment: true,
        }),
      )
    })
  })
})
