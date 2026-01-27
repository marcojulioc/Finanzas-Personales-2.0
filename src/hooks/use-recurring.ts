'use client'

import useSWR from 'swr'

interface BankAccount {
  id: string
  name: string
  color: string | null
}

interface CreditCardData {
  id: string
  name: string
  color: string | null
}

export interface RecurringTransaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  currency: 'MXN' | 'USD'
  category: string
  description: string | null
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'
  startDate: string
  endDate: string | null
  nextDueDate: string
  lastGeneratedDate: string | null
  isActive: boolean
  bankAccountId: string | null
  creditCardId: string | null
  isCardPayment: boolean
  targetCardId: string | null
  bankAccount: BankAccount | null
  creditCard: CreditCardData | null
  targetCard: CreditCardData | null
}

export function useRecurring() {
  const { data, error, isLoading, mutate } = useSWR<RecurringTransaction[]>('/api/recurring')

  return {
    recurringTransactions: data ?? [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}
