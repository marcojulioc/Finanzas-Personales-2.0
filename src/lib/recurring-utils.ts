import { db } from '@/lib/db'
import { RecurringFrequency } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

// Re-export for convenience in server components
export { FREQUENCY_LABELS } from './recurring-constants'

/**
 * Calculate the next due date based on frequency
 */
export function calculateNextDueDate(
  frequency: RecurringFrequency,
  fromDate: Date
): Date {
  const date = new Date(fromDate)

  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1)
      break
    case 'weekly':
      date.setDate(date.getDate() + 7)
      break
    case 'biweekly':
      date.setDate(date.getDate() + 14)
      break
    case 'monthly':
      // Handle month-end edge cases (e.g., Jan 31 -> Feb 28)
      const originalDay = date.getDate()
      date.setMonth(date.getMonth() + 1)
      // If the day changed (e.g., 31 -> 3), set to last day of intended month
      if (date.getDate() !== originalDay) {
        date.setDate(0) // Go to last day of previous month
      }
      break
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1)
      // Handle Feb 29 in non-leap years
      if (date.getMonth() === 1 && date.getDate() !== fromDate.getDate()) {
        date.setDate(28)
      }
      break
  }

  return date
}

/**
 * Get all due dates that need to be generated
 */
export function getDueDates(
  frequency: RecurringFrequency,
  startDate: Date,
  lastGenerated: Date | null,
  endDate: Date | null,
  untilDate: Date = new Date()
): Date[] {
  const dates: Date[] = []

  // Start from lastGenerated + 1 period, or startDate if never generated
  let currentDate = lastGenerated
    ? calculateNextDueDate(frequency, lastGenerated)
    : new Date(startDate)

  // Generate dates up to today (or endDate if earlier)
  const limitDate = endDate && endDate < untilDate ? endDate : untilDate

  while (currentDate <= limitDate) {
    dates.push(new Date(currentDate))
    currentDate = calculateNextDueDate(frequency, currentDate)

    // Safety limit to prevent infinite loops
    if (dates.length > 365) break
  }

  return dates
}

/**
 * Generate all pending recurring transactions for a user
 * Returns the number of transactions generated
 */
export async function generatePendingTransactions(userId: string): Promise<number> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Get all active recurring transactions for this user
  const recurringTransactions = await db.recurringTransaction.findMany({
    where: {
      userId,
      isActive: true,
      nextDueDate: {
        lte: today,
      },
    },
  })

  let generatedCount = 0

  for (const recurring of recurringTransactions) {
    // Get dates that need to be generated
    const dueDates = getDueDates(
      recurring.frequency,
      recurring.startDate,
      recurring.lastGeneratedDate,
      recurring.endDate,
      today
    )

    if (dueDates.length === 0) continue

    // Use a transaction for atomicity
    await db.$transaction(async (tx) => {
      for (const dueDate of dueDates) {
        const amount = new Decimal(recurring.amount).toNumber()

        // Create the transaction
        await tx.transaction.create({
          data: {
            userId: recurring.userId,
            type: recurring.type,
            amount: recurring.amount,
            currency: recurring.currency,
            category: recurring.category,
            description: recurring.description,
            date: dueDate,
            bankAccountId: recurring.bankAccountId,
            creditCardId: recurring.creditCardId,
            isCardPayment: recurring.isCardPayment,
            targetCardId: recurring.targetCardId,
            recurringTransactionId: recurring.id,
          },
        })

        // Update bank account balance
        if (recurring.bankAccountId) {
          const balanceChange = recurring.type === 'income' ? amount : -amount
          await tx.bankAccount.update({
            where: { id: recurring.bankAccountId },
            data: {
              balance: { increment: balanceChange },
            },
          })
        }

        // Update credit card balance
        if (recurring.creditCardId) {
          const balanceField = recurring.currency === 'MXN' ? 'balanceMXN' : 'balanceUSD'
          const balanceChange = recurring.type === 'expense' ? amount : -amount
          await tx.creditCard.update({
            where: { id: recurring.creditCardId },
            data: {
              [balanceField]: { increment: balanceChange },
            },
          })
        }

        // If card payment, reduce target card debt
        if (recurring.isCardPayment && recurring.targetCardId) {
          const balanceField = recurring.currency === 'MXN' ? 'balanceMXN' : 'balanceUSD'
          await tx.creditCard.update({
            where: { id: recurring.targetCardId },
            data: {
              [balanceField]: { decrement: amount },
            },
          })
        }

        generatedCount++
      }

      // Calculate next due date (dueDates.length > 0 is guaranteed by the check above)
      const lastDate = dueDates[dueDates.length - 1]!
      const nextDueDate = calculateNextDueDate(recurring.frequency, lastDate)

      // Check if recurring should be deactivated
      const shouldDeactivate = recurring.endDate && nextDueDate > recurring.endDate

      // Update the recurring transaction
      await tx.recurringTransaction.update({
        where: { id: recurring.id },
        data: {
          lastGeneratedDate: lastDate,
          nextDueDate: nextDueDate,
          isActive: shouldDeactivate ? false : recurring.isActive,
        },
      })
    })
  }

  return generatedCount
}

/**
 * Get upcoming recurring transactions for the next N days
 */
export async function getUpcomingRecurring(
  userId: string,
  days: number = 7,
  limit: number = 5
) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const futureDate = new Date(today)
  futureDate.setDate(futureDate.getDate() + days)

  const upcoming = await db.recurringTransaction.findMany({
    where: {
      userId,
      isActive: true,
      nextDueDate: {
        gte: today,
        lte: futureDate,
      },
    },
    orderBy: { nextDueDate: 'asc' },
    take: limit,
  })

  return upcoming
}

/**
 * Toggle the active status of a recurring transaction
 */
export async function toggleRecurringStatus(
  id: string,
  userId: string
): Promise<boolean> {
  const recurring = await db.recurringTransaction.findFirst({
    where: { id, userId },
  })

  if (!recurring) {
    throw new Error('Transacción recurrente no encontrada')
  }

  const updated = await db.recurringTransaction.update({
    where: { id },
    data: { isActive: !recurring.isActive },
  })

  return updated.isActive
}

/**
 * Format a date for display (Spanish format)
 */
export function formatDateSpanish(date: Date): string {
  return new Date(date).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
