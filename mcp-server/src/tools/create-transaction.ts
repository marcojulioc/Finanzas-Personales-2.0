import { z } from 'zod'
import { findByName } from '../fuzzy-match.js'
import type { ToolContext, BankAccount, CreditCard } from '../types.js'

const inputSchema = z.object({
  type: z.enum(['income', 'expense', 'transfer']),
  amount: z.number().positive(),
  description: z.string().min(1),
  /** Source bank account. Use for income, transfers, and expenses paid from a bank account. */
  accountName: z.string().min(1).optional(),
  /** Source credit card. Use ONLY for expenses charged to a credit card (creates card debt). */
  cardName: z.string().min(1).optional(),
  category: z.string().optional(),
  currency: z.string().optional(),
  date: z.string().optional(),
  targetAccountName: z.string().optional(),
  targetCardName: z.string().optional(),
})

function resolveOne<T extends { name: string }>(
  items: T[],
  query: string,
  label: string,
): T {
  const matches = findByName(items, query)
  if (matches.length === 0) {
    throw new Error(`No ${label} matching "${query}". Call list_accounts for options.`)
  }
  if (matches.length > 1) {
    const names = matches.map((m) => `"${m.name}"`).join(', ')
    throw new Error(
      `Ambiguous: "${query}" matches multiple ${label}s: ${names}. Be more specific.`,
    )
  }
  return matches[0]
}

export const createTransactionTool = {
  name: 'create_transaction',
  description: [
    'Create a financial transaction (income, expense, or transfer).',
    '',
    'IMPORTANT — BEFORE CALLING THIS TOOL:',
    '1. Summarize in Spanish what will be created: type, amount, currency, source (account o tarjeta), category, date, and (if transfer or card payment) destination.',
    '2. Ask the user to confirm explicitly (sí/no).',
    '3. Only invoke this tool after the user confirms.',
    '',
    'SOURCE — exactly ONE of `accountName` or `cardName` is required:',
    '• `accountName` — use when the money comes from or goes into a BANK ACCOUNT. Phrases like "de mi cuenta X", "a mi cuenta X", "en BHD", etc.',
    '• `cardName` — use when charging an EXPENSE to a credit card (creates debt on the card). Phrases like "con mi tarjeta X", "cargar a Popular 4866".',
    '',
    'Rules:',
    '• type="income" → only `accountName` is allowed (no income-to-card concept).',
    '• type="transfer" → only `accountName` allowed; also requires `targetAccountName`. Both accounts must share the same currency.',
    '• type="expense" → either `accountName` or `cardName`, never both.',
    '• Card payments (paying off a card balance): use `accountName` (the bank account paying) + `targetCardName` (the card being paid). Do NOT use `cardName` for this — you cannot pay a card from a card.',
    '',
    'Matching: account and card names are matched fuzzily (case/accent-insensitive substring). ' +
      'If the query matches more than one item the tool throws an ambiguity error — pass a more specific name.',
    '',
    'Currency:',
    '• Defaults to the bank account currency (for `accountName` flows).',
    '• Defaults to the card currency if the card has exactly one balance currency (for `cardName` flows).',
    '• Must be specified explicitly when the card has multiple currencies.',
    'Date defaults to today.',
  ].join('\n'),
  inputSchema,
  handler: async (rawInput: unknown, ctx: ToolContext) => {
    const input = inputSchema.parse(rawInput)

    // --- Validate source: exactly one of accountName / cardName ---
    const hasAccount = input.accountName != null
    const hasCard = input.cardName != null
    if (hasAccount === hasCard) {
      throw new Error(
        'Exactly one of `accountName` or `cardName` must be provided (not both, not neither).',
      )
    }

    // --- Type-specific restrictions ---
    if (hasCard) {
      if (input.type === 'income') {
        throw new Error('`cardName` cannot be used with type="income". Income must go to a bank account.')
      }
      if (input.type === 'transfer') {
        throw new Error('`cardName` cannot be used with type="transfer". Transfers are bank-to-bank.')
      }
      if (input.targetCardName) {
        throw new Error(
          'Cannot combine `cardName` with `targetCardName`: a credit card cannot pay another card. ' +
            'For card payments use `accountName` (source bank) + `targetCardName` (card being paid).',
        )
      }
    }

    const payload: Record<string, unknown> = {
      type: input.type,
      amount: input.amount,
      description: input.description,
      category: input.category ?? (input.type === 'transfer' ? 'Transferencia' : 'Otros'),
      date: input.date ?? new Date().toISOString(),
    }

    let sourceName: string

    if (hasAccount) {
      const accounts = await ctx.api.get<BankAccount[]>('/accounts')
      const sourceAccount = resolveOne(accounts, input.accountName!, 'account')
      payload.bankAccountId = sourceAccount.id
      payload.currency = input.currency ?? sourceAccount.currency
      sourceName = sourceAccount.name

      if (input.type === 'transfer') {
        if (!input.targetAccountName) {
          throw new Error('targetAccountName required for transfer')
        }
        const targetAccount = resolveOne(accounts, input.targetAccountName, 'target account')
        payload.targetAccountId = targetAccount.id
      }

      if (input.targetCardName) {
        const cards = await ctx.api.get<CreditCard[]>('/cards')
        const targetCard = resolveOne(cards, input.targetCardName, 'card')
        payload.targetCardId = targetCard.id
        payload.isCardPayment = true
      }
    } else {
      // cardName path (expense only, enforced above)
      const cards = await ctx.api.get<CreditCard[]>('/cards')
      const sourceCard = resolveOne(cards, input.cardName!, 'card')
      payload.creditCardId = sourceCard.id

      if (input.currency) {
        payload.currency = input.currency
      } else if (sourceCard.balances.length === 1) {
        payload.currency = sourceCard.balances[0].currency
      } else if (sourceCard.balances.length === 0) {
        throw new Error(
          `Card "${sourceCard.name}" has no balance records on file. Please specify currency explicitly.`,
        )
      } else {
        const currencies = sourceCard.balances.map((b) => b.currency).join(', ')
        throw new Error(
          `Card "${sourceCard.name}" has multiple currencies (${currencies}). Please specify currency.`,
        )
      }
      sourceName = sourceCard.name
    }

    const created = await ctx.api.post<{ id: string; type: string; amount: string }>(
      '/transactions',
      payload,
    )

    return {
      id: created.id,
      type: created.type,
      amount: created.amount,
      account: sourceName,
      success: true,
    }
  },
}
