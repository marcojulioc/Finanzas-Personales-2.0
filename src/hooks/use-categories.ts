'use client'

import useSWR from 'swr'
import { useMemo } from 'react'

interface Category {
  id: string
  name: string
  icon: string
  color: string
  type: 'income' | 'expense'
  isDefault: boolean
  isActive: boolean
}

export function useCategories() {
  const { data, error, isLoading, mutate } = useSWR<Category[]>('/api/categories')

  const categories = data ?? []

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories]
  )

  const incomeCategories = useMemo(
    () => categories.filter((c) => c.type === 'income'),
    [categories]
  )

  return {
    categories,
    expenseCategories,
    incomeCategories,
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}
