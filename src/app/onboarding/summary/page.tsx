'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Check, Loader2, AlertCircle, Landmark, CreditCard } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  getOnboardingState,
  clearOnboardingState,
  type OnboardingState,
} from '@/lib/onboarding-store'

export default function OnboardingSummaryPage() {
  const router = useRouter()
  const { update } = useSession()
  const [state, setState] = useState<OnboardingState | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setState(getOnboardingState())
  }, [])

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  const calculateTotals = () => {
    if (!state) return { totalBalance: 0, totalDebt: 0, netBalance: 0 }

    const totalBalance = state.bankAccounts.reduce((sum, acc) => {
      // Convertir USD a MXN aproximadamente para el resumen
      const amount = acc.currency === 'USD' ? acc.balance * 17 : acc.balance
      return sum + amount
    }, 0)

    const totalDebt = state.creditCards.reduce((sum, card) => {
      // Convertir USD a MXN aproximadamente para el resumen
      const debtMXN = card.balanceMXN
      const debtUSD = card.balanceUSD * 17
      return sum + debtMXN + debtUSD
    }, 0)

    return {
      totalBalance,
      totalDebt,
      netBalance: totalBalance - totalDebt,
    }
  }

  const handleBack = () => {
    router.push('/onboarding/cards')
  }

  const handleConfirm = async () => {
    if (!state) return

    // Validar que haya al menos una cuenta O una tarjeta
    if (state.bankAccounts.length === 0 && state.creditCards.length === 0) {
      setError('Debes agregar al menos una cuenta bancaria o una tarjeta de crédito')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankAccounts: state.bankAccounts,
          creditCards: state.creditCards,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error?.message || 'Error al completar el onboarding')
        return
      }

      // Limpiar localStorage
      clearOnboardingState()

      // Actualizar la sesión
      await update({ onboardingCompleted: true })

      toast.success('¡Configuración completada!')

      // Redirigir al dashboard
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Error al guardar la configuración. Intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!state) {
    return (
      <Card className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </Card>
    )
  }

  const { totalBalance, totalDebt, netBalance } = calculateTotals()
  const hasData = state.bankAccounts.length > 0 || state.creditCards.length > 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
            <Check className="w-5 h-5 text-success" />
          </div>
          <div>
            <CardTitle>¡Todo listo!</CardTitle>
            <CardDescription>
              Revisa tu información antes de continuar
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!hasData && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No has agregado ninguna cuenta ni tarjeta. Debes agregar al menos
              una para continuar.
            </AlertDescription>
          </Alert>
        )}

        {/* Cuentas Bancarias */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Landmark className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Cuentas Bancarias</h3>
          </div>
          {state.bankAccounts.length > 0 ? (
            <div className="space-y-2">
              {state.bankAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: account.color }}
                    />
                    <span>{account.name}</span>
                    <span className="text-sm text-muted-foreground">
                      ({account.bankName})
                    </span>
                  </div>
                  <span className="font-mono font-medium text-success">
                    {formatCurrency(account.balance, account.currency)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No hay cuentas agregadas
            </p>
          )}
        </div>

        <Separator />

        {/* Tarjetas de Crédito */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-5 h-5 text-secondary" />
            <h3 className="font-semibold">Tarjetas de Crédito</h3>
          </div>
          {state.creditCards.length > 0 ? (
            <div className="space-y-2">
              {state.creditCards.map((card) => (
                <div
                  key={card.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: card.color }}
                    />
                    <span>{card.name}</span>
                    <span className="text-sm text-muted-foreground">
                      ({card.bankName})
                    </span>
                  </div>
                  <div className="text-right">
                    {card.balanceMXN > 0 && (
                      <span className="font-mono text-danger">
                        -{formatCurrency(card.balanceMXN, 'MXN')}
                      </span>
                    )}
                    {card.balanceUSD > 0 && (
                      <span className="font-mono text-danger ml-2">
                        -{formatCurrency(card.balanceUSD, 'USD')}
                      </span>
                    )}
                    {card.balanceMXN === 0 && card.balanceUSD === 0 && (
                      <span className="text-muted-foreground">Sin deuda</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No hay tarjetas agregadas
            </p>
          )}
        </div>

        <Separator />

        {/* Resumen de Totales */}
        {hasData && (
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total disponible</span>
              <span className="font-mono font-medium text-success">
                {formatCurrency(totalBalance, 'MXN')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total deuda</span>
              <span className="font-mono font-medium text-danger">
                -{formatCurrency(totalDebt, 'MXN')}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="font-semibold">Balance neto</span>
              <span
                className={`font-mono font-bold text-lg ${
                  netBalance >= 0 ? 'text-success' : 'text-danger'
                }`}
              >
                {formatCurrency(netBalance, 'MXN')}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              * Los montos en USD se convirtieron aproximadamente a MXN para este
              resumen
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="ghost" onClick={handleBack} disabled={isLoading}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Editar
        </Button>
        <Button onClick={handleConfirm} disabled={isLoading || !hasData}>
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Comenzar a usar
        </Button>
      </CardFooter>
    </Card>
  )
}
