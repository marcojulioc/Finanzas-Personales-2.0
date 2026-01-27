'use client'

import useSWR from 'swr'

interface BudgetCategory {
  id: string
  name: string
  icon: string
  color: string
  type: string
}

export interface Budget {
  id: string
  userId: string
  categoryId: string
  category: BudgetCategory
  amount: number
  spent: number
  month: string | Date
  createdAt: string | Date
  updatedAt: string | Date
}

// Helper to format date for API (YYYY-MM-DD)
function formatDateForApi(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function useBudgets(month: Date) {
  const monthParam = formatDateForApi(month)
  const { data, error, isLoading, mutate } = useSWR<Budget[]>(
    `/api/budgets?month=${monthParam}`
  )

  return {
    budgets: data ?? [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}

export function usePreviousMonthBudgets(currentMonth: Date) {
  const prevMonth = new Date(
    Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth() - 1, 1)
  )
  const monthParam = formatDateForApi(prevMonth)
  const { data, error, isLoading } = useSWR<Budget[]>(
    `/api/budgets?month=${monthParam}`
  )

  return {
    hasBudgets: (data?.length ?? 0) > 0,
    isLoading,
    isError: !!error,
  }
}
