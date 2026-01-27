'use client'

import useSWR from 'swr'

export interface CreditCard {
  id: string
  name: string
  bankName: string
  cutOffDay: number
  paymentDueDay: number
  currency: string
  creditLimit: number
  balance: number
  color: string | null
  isActive: boolean
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
