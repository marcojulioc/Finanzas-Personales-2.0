'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, ArrowRight, ArrowLeft, CreditCard } from 'lucide-react'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getOnboardingState,
  saveOnboardingState,
  generateId,
  COMMON_BANKS,
  ACCOUNT_COLORS,
  type CreditCardDraft,
} from '@/lib/onboarding-store'
import { CURRENCIES } from '@/lib/currencies'

const cardSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  bankName: z.string().min(1, 'Selecciona un banco'),
  cutOffDay: z.number().int().min(1).max(31),
  paymentDueDay: z.number().int().min(1).max(31),
  limitMXN: z.number().min(0),
  limitUSD: z.number().min(0),
  balanceMXN: z.number().min(0),
  balanceUSD: z.number().min(0),
})

type CardFormData = z.infer<typeof cardSchema>

export default function OnboardingCardsPage() {
  const router = useRouter()
  const [cards, setCards] = useState<CreditCardDraft[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [primaryCurrency, setPrimaryCurrency] = useState<string>('MXN')

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CardFormData>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      cutOffDay: 15,
      paymentDueDay: 25,
      limitMXN: 0,
      limitUSD: 0,
      balanceMXN: 0,
      balanceUSD: 0,
    },
  })

  useEffect(() => {
    const state = getOnboardingState()
    setCards(state.creditCards)
    if (state.creditCards.length === 0) {
      setIsAdding(true)
    }

    // Obtener la moneda primaria del usuario
    fetch('/api/user/currencies')
      .then((res) => res.json())
      .then((data) => {
        if (data.data?.primaryCurrency) {
          setPrimaryCurrency(data.data.primaryCurrency)
        }
      })
      .catch(console.error)
  }, [])

  const onSubmit = (data: CardFormData) => {
    const state = getOnboardingState()

    if (editingId) {
      const index = state.creditCards.findIndex((c) => c.id === editingId)
      if (index !== -1) {
        state.creditCards[index] = {
          ...state.creditCards[index]!,
          ...data,
          color: ACCOUNT_COLORS[(index + 2) % ACCOUNT_COLORS.length],
        }
      }
      setEditingId(null)
    } else {
      const newCard: CreditCardDraft = {
        id: generateId(),
        ...data,
        color: ACCOUNT_COLORS[(state.creditCards.length + 2) % ACCOUNT_COLORS.length],
      }
      state.creditCards.push(newCard)
    }

    saveOnboardingState(state)
    setCards([...state.creditCards])
    setIsAdding(false)
    reset({
      name: '',
      bankName: '',
      cutOffDay: 15,
      paymentDueDay: 25,
      limitMXN: 0,
      limitUSD: 0,
      balanceMXN: 0,
      balanceUSD: 0,
    })
  }

  const handleDelete = (id: string) => {
    const state = getOnboardingState()
    state.creditCards = state.creditCards.filter((c) => c.id !== id)
    saveOnboardingState(state)
    setCards([...state.creditCards])
  }

  const handleEdit = (card: CreditCardDraft) => {
    setEditingId(card.id)
    setIsAdding(true)
    setValue('name', card.name)
    setValue('bankName', card.bankName)
    setValue('cutOffDay', card.cutOffDay)
    setValue('paymentDueDay', card.paymentDueDay)
    setValue('limitMXN', card.limitMXN)
    setValue('limitUSD', card.limitUSD)
    setValue('balanceMXN', card.balanceMXN)
    setValue('balanceUSD', card.balanceUSD)
  }

  const handleCancel = () => {
    setIsAdding(false)
    setEditingId(null)
    reset()
  }

  const handleContinue = () => {
    router.push('/onboarding/summary')
  }

  const handleBack = () => {
    router.push('/onboarding/accounts')
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  const getPrimaryCurrencyLabel = () => {
    const currency = CURRENCIES[primaryCurrency]
    return currency ? `${currency.name} (${primaryCurrency})` : `Moneda local (${primaryCurrency})`
  }

  const days = Array.from({ length: 31 }, (_, i) => i + 1)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <CardTitle>Tus Tarjetas de Crédito</CardTitle>
            <CardDescription>
              Agrega tus tarjetas para llevar control de tus gastos a crédito
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lista de tarjetas existentes */}
        {cards.length > 0 && !isAdding && (
          <div className="space-y-3">
            {cards.map((card) => (
              <div
                key={card.id}
                className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: card.color }}
                    />
                    <div>
                      <p className="font-medium">{card.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {card.bankName} • Corte: día {card.cutOffDay} • Pago: día{' '}
                        {card.paymentDueDay}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(card)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-danger hover:text-danger"
                      onClick={() => handleDelete(card.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {(card.limitMXN > 0 || card.balanceMXN > 0) && (
                    <div>
                      <p className="text-muted-foreground">{getPrimaryCurrencyLabel()}</p>
                      <p>
                        Deuda:{' '}
                        <span className="font-mono text-danger">
                          {formatCurrency(card.balanceMXN, primaryCurrency)}
                        </span>
                      </p>
                      <p>
                        Límite:{' '}
                        <span className="font-mono">
                          {formatCurrency(card.limitMXN, primaryCurrency)}
                        </span>
                      </p>
                    </div>
                  )}
                  {(card.limitUSD > 0 || card.balanceUSD > 0) && (
                    <div>
                      <p className="text-muted-foreground">Dólares (USD)</p>
                      <p>
                        Deuda:{' '}
                        <span className="font-mono text-danger">
                          {formatCurrency(card.balanceUSD, 'USD')}
                        </span>
                      </p>
                      <p>
                        Límite:{' '}
                        <span className="font-mono">
                          {formatCurrency(card.limitUSD, 'USD')}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Formulario para agregar/editar */}
        {isAdding && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la tarjeta</Label>
                <Input
                  id="name"
                  placeholder="Ej: Visa Oro"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-danger">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bankName">Banco emisor</Label>
                <Select
                  value={watch('bankName')}
                  onValueChange={(value) => setValue('bankName', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un banco" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_BANKS.map((bank) => (
                      <SelectItem key={bank} value={bank}>
                        {bank}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.bankName && (
                  <p className="text-sm text-danger">{errors.bankName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Día de corte</Label>
                <Select
                  value={watch('cutOffDay')?.toString()}
                  onValueChange={(value) => setValue('cutOffDay', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        Día {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Día de pago</Label>
                <Select
                  value={watch('paymentDueDay')?.toString()}
                  onValueChange={(value) =>
                    setValue('paymentDueDay', parseInt(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        Día {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <p className="font-medium">{getPrimaryCurrencyLabel()}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="limitMXN">Límite de crédito</Label>
                  <Input
                    id="limitMXN"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...register('limitMXN', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="balanceMXN">Deuda actual</Label>
                  <Input
                    id="balanceMXN"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...register('balanceMXN', { valueAsNumber: true })}
                  />
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <p className="font-medium">Dólares (USD) - Opcional</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="limitUSD">Límite de crédito</Label>
                  <Input
                    id="limitUSD"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...register('limitUSD', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="balanceUSD">Deuda actual</Label>
                  <Input
                    id="balanceUSD"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...register('balanceUSD', { valueAsNumber: true })}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit">
                {editingId ? 'Guardar cambios' : 'Agregar tarjeta'}
              </Button>
              {(cards.length > 0 || editingId) && (
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        )}

        {/* Botón para agregar más */}
        {!isAdding && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar otra tarjeta
          </Button>
        )}

        <p className="text-sm text-muted-foreground">
          Puedes agregar más tarjetas después en Configuración
        </p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Atrás
        </Button>
        <Button onClick={handleContinue}>
          {cards.length === 0 ? 'Saltar' : 'Continuar'}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  )
}
