'use client'

import useSWR from 'swr'

export interface CreditCardBalance {
  id: string
  creditCardId: string
  currency: string
  creditLimit: number
  balance: number
}

export interface CreditCard {
  id: string
  name: string
  bankName: string
  cutOffDay: number
  paymentDueDay: number
  color: string | null
  isActive: boolean
  balances: CreditCardBalance[]
}

export function useCards() {
  const { data, error, isLoading, mutate } = useSWR<CreditCard[]>('/api/cards')

  return {
    cards: data ?? [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}

// Helper function to calculate total debt across all currencies (with exchange rate approximation)
export function getTotalDebt(card: CreditCard, primaryCurrency: string = 'USD'): number {
  const exchangeRate = 17 // Approximate USD to other currencies
  return card.balances.reduce((sum, b) => {
    if (b.currency === primaryCurrency) {
      return sum + Number(b.balance)
    }
    // Convert to primary currency (simplified)
    if (b.currency === 'USD' && primaryCurrency !== 'USD') {
      return sum + Number(b.balance) * exchangeRate
    }
    if (b.currency !== 'USD' && primaryCurrency === 'USD') {
      return sum + Number(b.balance) / exchangeRate
    }
    return sum + Number(b.balance)
  }, 0)
}

// Helper function to calculate total credit limit
export function getTotalLimit(card: CreditCard, primaryCurrency: string = 'USD'): number {
  const exchangeRate = 17
  return card.balances.reduce((sum, b) => {
    if (b.currency === primaryCurrency) {
      return sum + Number(b.creditLimit)
    }
    if (b.currency === 'USD' && primaryCurrency !== 'USD') {
      return sum + Number(b.creditLimit) * exchangeRate
    }
    if (b.currency !== 'USD' && primaryCurrency === 'USD') {
      return sum + Number(b.creditLimit) / exchangeRate
    }
    return sum + Number(b.creditLimit)
  }, 0)
}
