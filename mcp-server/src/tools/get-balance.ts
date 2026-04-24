import { z } from 'zod'
import { findByName } from '../fuzzy-match.js'
import type { ToolContext, BankAccount, CreditCard } from '../types.js'

const inputSchema = z.object({
  accountName: z.string().min(1),
})

export const getBalanceTool = {
  name: 'get_balance',
  description:
    'Get the current balance of a bank account or the outstanding debt of a credit card. ' +
    'accountName can be the name of either — the tool searches both bank accounts and credit cards. ' +
    'Matching is case/accent-insensitive and supports substrings, so "Popular" matches ' +
    '"Banco Popular Dominicano". If the query matches more than one item (across either space) ' +
    'the tool throws an ambiguity error listing the candidates; pass a more specific name.',
  inputSchema,
  handler: async (input: z.infer<typeof inputSchema>, ctx: ToolContext) => {
    const parsed = inputSchema.parse(input)
    const [accounts, cards] = await Promise.all([
      ctx.api.get<BankAccount[]>('/accounts'),
      ctx.api.get<CreditCard[]>('/cards'),
    ])

    const accountMatches = findByName(accounts, parsed.accountName)
    const cardMatches = findByName(cards, parsed.accountName)
    const total = accountMatches.length + cardMatches.length

    if (total === 0) {
      throw new Error(
        `No account or card matching "${parsed.accountName}". Call list_accounts to see options.`,
      )
    }
    if (total > 1) {
      const names = [
        ...accountMatches.map((a) => `account "${a.name}"`),
        ...cardMatches.map((c) => `card "${c.name}"`),
      ]
      throw new Error(
        `Ambiguous: "${parsed.accountName}" matches multiple: ${names.join(', ')}. Be more specific.`,
      )
    }

    if (accountMatches.length === 1) {
      const a = accountMatches[0]
      return {
        type: 'account' as const,
        name: a.name,
        balance: a.balance,
        currency: a.currency,
      }
    }

    const c = cardMatches[0]
    return {
      type: 'card' as const,
      name: c.name,
      balances: c.balances.map((b) => ({ currency: b.currency, debt: b.balance })),
    }
  },
}
