'use client'

import useSWR from 'swr'
import { useMemo } from 'react'
import { CURRENCIES, type CurrencyInfo } from '@/lib/currencies'

interface UserCurrenciesResponse {
  currencies: string[]
  primaryCurrency: string
}

interface UserCurrenciesData {
  currencies: string[]
  primaryCurrency: string
  currencyOptions: CurrencyInfo[]
  isLoading: boolean
  error: string | null
}

export function useUserCurrencies(): UserCurrenciesData {
  const { data, error, isLoading } = useSWR<UserCurrenciesResponse>(
    '/api/user/currencies',
    async (url: string) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Error fetching currencies')
      const json = await res.json()
      return json.data
    }
  )

  const currencies = data?.currencies ?? ['USD']
  const primaryCurrency = data?.primaryCurrency ?? 'USD'

  const currencyOptions = useMemo(() => {
    return currencies
      .map((code) => CURRENCIES[code])
      .filter(Boolean) as CurrencyInfo[]
  }, [currencies])

  return {
    currencies,
    primaryCurrency,
    currencyOptions,
    isLoading,
    error: error ? (error instanceof Error ? error.message : 'Error') : null,
  }
}
