import { z } from 'zod'
import { findByName } from '../fuzzy-match.js'
import type { ToolContext, BankAccount } from '../types.js'

const inputSchema = z.object({
  accountName: z.string().min(1),
})

export const getBalanceTool = {
  name: 'get_balance',
  description:
    'Get the current balance of a bank account. The accountName is matched fuzzily (case/accent insensitive, substring match), ' +
    'so "Popular" will match "Banco Popular Dominicano".',
  inputSchema,
  handler: async (input: z.infer<typeof inputSchema>, ctx: ToolContext) => {
    const parsed = inputSchema.parse(input)
    const accounts = await ctx.api.get<BankAccount[]>('/accounts')
    const match = findByName(accounts, parsed.accountName)
    if (!match) {
      throw new Error(`No account matching "${parsed.accountName}". Call list_accounts to see options.`)
    }
    return {
      account: match.name,
      balance: match.balance,
      currency: match.currency,
    }
  },
}
