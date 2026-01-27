'use client'

import useSWR from 'swr'

interface BankAccount {
  id: string
  name: string
  bankName: string
  accountType: 'savings' | 'checking'
  currency: string
  balance: number
  color: string | null
  isActive: boolean
}

export function useAccounts() {
  const { data, error, isLoading, mutate } = useSWR<BankAccount[]>('/api/accounts')

  return {
    accounts: data ?? [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}
