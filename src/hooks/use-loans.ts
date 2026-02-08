'use client'

import useSWR from 'swr'

export interface Loan {
  id: string
  name: string
  institution: string
  originalAmount: number
  remainingBalance: number
  currency: string
  monthlyPayment: number
  interestRate: number
  startDate: string
  endDate: string | null
  frequency: string
  color: string | null
  isActive: boolean
}

export function useLoans() {
  const { data, error, isLoading, mutate } = useSWR<Loan[]>('/api/loans')

  return {
    loans: data ?? [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}
