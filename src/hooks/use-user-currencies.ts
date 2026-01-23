'use client'

import { useState, useEffect } from 'react'
import { CURRENCIES, type CurrencyInfo } from '@/lib/currencies'

interface UserCurrenciesData {
  currencies: string[]
  primaryCurrency: string
  currencyOptions: CurrencyInfo[]
  isLoading: boolean
  error: string | null
}

export function useUserCurrencies(): UserCurrenciesData {
  const [currencies, setCurrencies] = useState<string[]>(['USD'])
  const [primaryCurrency, setPrimaryCurrency] = useState<string>('USD')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUserCurrencies() {
      try {
        const response = await fetch('/api/user/currencies')
        if (!response.ok) {
          throw new Error('Error fetching currencies')
        }
        const result = await response.json()
        if (result.data) {
          setCurrencies(result.data.currencies || ['USD'])
          setPrimaryCurrency(result.data.primaryCurrency || 'USD')
        }
      } catch (err) {
        console.error('Error fetching user currencies:', err)
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserCurrencies()
  }, [])

  const currencyOptions = currencies
    .map((code) => CURRENCIES[code])
    .filter(Boolean) as CurrencyInfo[]

  return {
    currencies,
    primaryCurrency,
    currencyOptions,
    isLoading,
    error,
  }
}
