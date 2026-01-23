'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ArrowLeft, Check, Coins } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  CURRENCIES,
  CURRENCIES_BY_REGION,
  REGION_ORDER,
  POPULAR_CURRENCIES,
} from '@/lib/currencies'

export default function OnboardingCurrenciesPage() {
  const router = useRouter()
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>(['USD'])
  const [primaryCurrency, setPrimaryCurrency] = useState<string>('USD')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const toggleCurrency = (code: string) => {
    setSelectedCurrencies((prev) => {
      if (prev.includes(code)) {
        // No permitir deseleccionar si es la unica moneda
        if (prev.length === 1) {
          toast.error('Debes tener al menos una moneda seleccionada')
          return prev
        }
        // Si es la moneda primaria, cambiar a otra
        if (code === primaryCurrency) {
          const remaining = prev.filter((c) => c !== code)
          setPrimaryCurrency(remaining[0])
        }
        return prev.filter((c) => c !== code)
      } else {
        return [...prev, code]
      }
    })
  }

  const handleSetPrimary = (code: string) => {
    if (!selectedCurrencies.includes(code)) {
      setSelectedCurrencies((prev) => [...prev, code])
    }
    setPrimaryCurrency(code)
  }

  const handleSubmit = async () => {
    if (selectedCurrencies.length === 0) {
      toast.error('Selecciona al menos una moneda')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/user/currencies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currencies: selectedCurrencies,
          primaryCurrency,
        }),
      })

      if (!response.ok) {
        throw new Error('Error al guardar las monedas')
      }

      router.push('/onboarding/accounts')
    } catch (error) {
      console.error('Error saving currencies:', error)
      toast.error('Error al guardar las monedas')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Coins className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle>Selecciona tus monedas</CardTitle>
            <CardDescription>
              Elige las monedas que usas en tus transacciones diarias
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Monedas populares */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Monedas populares
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {POPULAR_CURRENCIES.map((code) => {
              const currency = CURRENCIES[code]
              const isSelected = selectedCurrencies.includes(code)
              const isPrimary = primaryCurrency === code

              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => toggleCurrency(code)}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/50'
                  }`}
                >
                  <span className="text-2xl">{currency.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{code}</span>
                      {isPrimary && (
                        <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                          Principal
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {currency.name}
                    </p>
                  </div>
                  {isSelected && (
                    <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Todas las monedas por region */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            Todas las monedas
          </h3>
          {REGION_ORDER.map((region) => (
            <div key={region}>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {region}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CURRENCIES_BY_REGION[region as keyof typeof CURRENCIES_BY_REGION].map((code) => {
                  const currency = CURRENCIES[code]
                  const isSelected = selectedCurrencies.includes(code)
                  const isPrimary = primaryCurrency === code

                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => toggleCurrency(code)}
                      className={`flex items-center gap-2 p-2 rounded-lg border transition-all text-left ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-muted-foreground/50'
                      }`}
                    >
                      <span className="text-lg">{currency.flag}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium">{code}</span>
                          {isPrimary && (
                            <span className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Moneda principal */}
        {selectedCurrencies.length > 1 && (
          <div className="p-4 bg-muted/50 rounded-lg">
            <h3 className="text-sm font-medium mb-2">Moneda principal</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Esta sera tu moneda por defecto para nuevas transacciones
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedCurrencies.map((code) => {
                const currency = CURRENCIES[code]
                const isPrimary = primaryCurrency === code

                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handleSetPrimary(code)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all ${
                      isPrimary
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted-foreground/20'
                    }`}
                  >
                    <span>{currency.flag}</span>
                    <span>{code}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Resumen */}
        <div className="p-4 border rounded-lg">
          <p className="text-sm">
            <span className="text-muted-foreground">Monedas seleccionadas: </span>
            <span className="font-medium">
              {selectedCurrencies.map((c) => CURRENCIES[c].flag + ' ' + c).join(', ')}
            </span>
          </p>
        </div>

        {/* Botones */}
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => router.push('/onboarding')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Atras
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Continuar'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
