'use client'

import useSWR from 'swr'

export interface ReportData {
  period: {
    start: string
    end: string
    label: string
  }
  summary: {
    totalIncome: number
    totalExpenses: number
    netBalance: number
    avgDailySpending: number
    avgMonthlySpending: number
    transactionCount: number
  }
  categoryDistribution: {
    category: string
    amount: number
    percentage: number
  }[]
  monthlySummary: {
    month: string
    monthLabel: string
    income: number
    expenses: number
    balance: number
  }[]
  balanceTrend: {
    date: string
    balance: number
  }[]
  dailySpending: {
    date: string
    amount: number
  }[]
}

export function useReports(period: string) {
  const { data, error, isLoading, mutate } = useSWR<ReportData>(
    `/api/reports?period=${period}`
  )

  return {
    data,
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}
