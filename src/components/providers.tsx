'use client'

import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { SWRProvider } from '@/lib/swr-config'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <SWRProvider>
          {children}
          <Toaster position="top-right" richColors />
        </SWRProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
