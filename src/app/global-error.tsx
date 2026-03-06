'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <html lang="es">
      <body className="bg-background text-foreground">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
          <div className="rounded-full bg-red-100 p-4 dark:bg-red-900/20">
            <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold">Error inesperado</h1>
          <p className="text-muted-foreground text-center max-w-md">
            Ha ocurrido un error grave en la aplicación. Por favor intenta recargar la página.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <pre className="mt-2 max-w-lg overflow-auto rounded bg-gray-100 dark:bg-gray-800 p-4 text-xs">
              {error.message}
            </pre>
          )}
          <div className="flex gap-3">
            <Button onClick={reset} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Intentar de nuevo
            </Button>
            <Button onClick={() => window.location.href = '/dashboard'} className="gap-2">
              Ir al inicio
            </Button>
          </div>
        </div>
      </body>
    </html>
  )
}
