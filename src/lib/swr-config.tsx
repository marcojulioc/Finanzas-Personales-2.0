'use client'

import { SWRConfig } from 'swr'
import { ReactNode } from 'react'

const fetcher = async (url: string) => {
  const res = await fetch(url)

  if (!res.ok) {
    // Try to get error details from API response
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
  return json.data
}

interface SWRProviderProps {
  children: ReactNode
}

export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false,
        revalidateIfStale: true,
        dedupingInterval: 2000,
      }}
    >
      {children}
    </SWRConfig>
  )
}
