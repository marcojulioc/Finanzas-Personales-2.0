'use client'

import useSWR from 'swr'

export interface CreditCard {
  id: string
  name: string
  bankName: string
  cutOffDay: number
  paymentDueDay: number
  limitMXN: number
  limitUSD: number
  balanceMXN: number
  balanceUSD: number
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
