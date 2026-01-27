'use client'

import useSWR from 'swr'

export interface Transaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  currency: string
  category: string
  description: string | null
  date: string
  bankAccountId: string | null
  creditCardId: string | null
  isCardPayment: boolean
  targetCardId: string | null
  bankAccount: { id: string; name: string; color: string | null } | null
  creditCard: { id: string; name: string; color: string | null } | null
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface UseTransactionsParams {
  page?: number
  limit?: number
  type?: string
  category?: string
  bankAccountId?: string
  creditCardId?: string
  startDate?: string
  endDate?: string
  search?: string
}

export function useTransactions(params: UseTransactionsParams = {}) {
  const {
    page = 1,
    limit = 20,
    type,
    category,
    bankAccountId,
    creditCardId,
    startDate,
    endDate,
    search,
  } = params

  const searchParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  })
  if (type && type !== 'all') searchParams.append('type', type)
  if (category && category !== 'all') searchParams.append('category', category)
  if (bankAccountId) searchParams.append('bankAccountId', bankAccountId)
  if (creditCardId) searchParams.append('creditCardId', creditCardId)
  if (startDate) searchParams.append('startDate', startDate)
  if (endDate) searchParams.append('endDate', endDate)
  if (search) searchParams.append('search', search)

  const key = `/api/transactions?${searchParams.toString()}`

  // Custom fetcher for transactions since response includes pagination
  const { data, error, isLoading, mutate } = useSWR<{
    transactions: Transaction[]
    pagination: Pagination
  }>(key, async (url: string) => {
    const res = await fetch(url)
    if (!res.ok) {
      let errorMessage = `Error ${res.status}: ${res.statusText}`
      try {
        const errorData = await res.json()
        if (errorData.error) {
          errorMessage = errorData.error
        }
      } catch {
        // Response wasn't JSON, use default message
      }
      throw new Error(errorMessage)
    }
    const json = await res.json()
    return {
      transactions: json.data ?? [],
      pagination: json.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
    }
  })

  return {
    transactions: data?.transactions ?? [],
    pagination: data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}
