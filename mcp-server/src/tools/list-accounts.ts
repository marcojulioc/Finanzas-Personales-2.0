import { z } from 'zod'
import type { ToolContext, BankAccount, CreditCard, Category } from '../types.js'

export const listAccountsTool = {
  name: 'list_accounts',
  description:
    'List all active bank accounts, credit cards, and available categories. ' +
    'Always call this first when the user references an account/card/category by name, ' +
    'so you know their exact IDs and spellings before creating a transaction.',
  inputSchema: z.object({}),
  handler: async (_input: unknown, ctx: ToolContext) => {
    const [accounts, cards, catsIncome, catsExpense] = await Promise.all([
      ctx.api.get<BankAccount[]>('/accounts'),
      ctx.api.get<CreditCard[]>('/cards'),
      ctx.api.get<Category[]>('/categories?type=income'),
      ctx.api.get<Category[]>('/categories?type=expense'),
    ])

    const categories = Array.from(
      new Set([...catsIncome, ...catsExpense].map((c) => c.name)),
    ).sort()

    return {
      bankAccounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        currency: a.currency,
        balance: a.balance,
      })),
      creditCards: cards.map((c) => ({
        id: c.id,
        name: c.name,
        balances: c.balances.map((b) => ({ currency: b.currency, debt: b.balance })),
      })),
      categories,
    }
  },
}
