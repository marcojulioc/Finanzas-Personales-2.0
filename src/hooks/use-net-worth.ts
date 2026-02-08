'use client'

import useSWR from 'swr'

export interface NetWorthData {
  primaryCurrency: string
  current: {
    totalAssets: number
    totalLiabilities: number
    netWorth: number
    accounts: {
      id: string
      name: string
      bankName: string
      balance: number
      currency: string
      balanceConverted: number
      color: string | null
    }[]
    cards: {
      id: string
      name: string
      bankName: string
      totalDebt: number
      balances: {
        currency: string
        balance: number
        balanceConverted: number
      }[]
      color: string | null
    }[]
    loans: {
      id: string
      name: string
      institution: string
      remainingBalance: number
      currency: string
      balanceConverted: number
      color: string | null
    }[]
  }
  history: {
    date: string
    totalAssets: number
    totalLiabilities: number
    netWorth: number
  }[]
}

export function useNetWorth() {
  const { data, error, isLoading, mutate } = useSWR<NetWorthData>(
    '/api/net-worth'
  )

  return {
    data,
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}
