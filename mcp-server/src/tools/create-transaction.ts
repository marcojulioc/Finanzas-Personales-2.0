import { z } from 'zod'
import { findByName } from '../fuzzy-match.js'
import type { ToolContext, BankAccount, CreditCard } from '../types.js'

const inputSchema = z.object({
  type: z.enum(['income', 'expense', 'transfer']),
  amount: z.number().positive(),
  description: z.string().min(1),
  accountName: z.string().min(1),
  category: z.string().optional(),
  currency: z.string().optional(),
  date: z.string().optional(),
  targetAccountName: z.string().optional(),
  targetCardName: z.string().optional(),
})

export const createTransactionTool = {
  name: 'create_transaction',
  description: [
    'Create a financial transaction (income, expense, or transfer).',
    '',
    'IMPORTANT — BEFORE CALLING THIS TOOL:',
    '1. Summarize in Spanish what will be created: type, amount, currency, account, category, date, and (if transfer) destination.',
    '2. Ask the user to confirm explicitly (sí/no).',
    '3. Only invoke this tool after the user confirms.',
    '',
    'Account/card names are matched fuzzily. Currency defaults to the account currency. Date defaults to today.',
    'For transfers, both accountName (source) and targetAccountName (destination) are required and must use the same currency.',
  ].join('\n'),
  inputSchema,
  handler: async (rawInput: unknown, ctx: ToolContext) => {
    const input = inputSchema.parse(rawInput)

    const accounts = await ctx.api.get<BankAccount[]>('/accounts')
    const sourceAccount = findByName(accounts, input.accountName)
    if (!sourceAccount) {
      throw new Error(`No account matching "${input.accountName}". Call list_accounts for options.`)
    }

    const payload: Record<string, unknown> = {
      type: input.type,
      amount: input.amount,
      description: input.description,
      bankAccountId: sourceAccount.id,
      currency: input.currency ?? sourceAccount.currency,
      category: input.category ?? (input.type === 'transfer' ? 'Transferencia' : 'Otros'),
      date: input.date ?? new Date().toISOString(),
    }

    if (input.type === 'transfer') {
      if (!input.targetAccountName) {
        throw new Error('targetAccountName required for transfer')
      }
      const targetAccount = findByName(accounts, input.targetAccountName)
      if (!targetAccount) {
        throw new Error(`No target account matching "${input.targetAccountName}"`)
      }
      payload.targetAccountId = targetAccount.id
    }

    if (input.targetCardName) {
      const cards = await ctx.api.get<CreditCard[]>('/cards')
      const targetCard = findByName(cards, input.targetCardName)
      if (!targetCard) {
        throw new Error(`No card matching "${input.targetCardName}"`)
      }
      payload.targetCardId = targetCard.id
      payload.isCardPayment = true
    }

    const created = await ctx.api.post<{ id: string; type: string; amount: string }>(
      '/transactions',
      payload,
    )

    return {
      id: created.id,
      type: created.type,
      amount: created.amount,
      account: sourceAccount.name,
      success: true,
    }
  },
}
