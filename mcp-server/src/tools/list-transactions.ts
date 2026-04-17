import { z } from 'zod'
import type { ToolContext, Transaction } from '../types.js'

const inputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(10),
  accountName: z.string().optional(),
  days: z.number().int().min(1).max(365).optional(),
})

export const listTransactionsTool = {
  name: 'list_transactions',
  description:
    'List recent transactions, optionally filtered. Useful for questions like ' +
    '"¿cuánto gasté esta semana?" or "muéstrame mis últimos 5 movimientos".',
  inputSchema,
  handler: async (rawInput: unknown, ctx: ToolContext) => {
    const input = inputSchema.parse(rawInput)
    const params = new URLSearchParams({ limit: String(input.limit) })
    if (input.days) {
      const startDate = new Date(Date.now() - input.days * 86400000).toISOString()
      params.set('startDate', startDate)
    }
    const txns = await ctx.api.get<Transaction[]>(`/transactions?${params.toString()}`)
    return txns.map((t) => ({
      date: t.date,
      type: t.type,
      amount: t.amount,
      description: t.description,
      category: t.category,
      account: t.bankAccount?.name ?? t.creditCard?.name ?? null,
    }))
  },
}
