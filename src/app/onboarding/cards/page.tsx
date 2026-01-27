'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, ArrowRight, ArrowLeft, CreditCard, X } from 'lucide-react'
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

const balanceSchema = z.object({
  currency: z.string().min(1, 'Selecciona una moneda'),
  creditLimit: z.number().min(0, 'El límite no puede ser negativo'),
  balance: z.number().min(0, 'La deuda no puede ser negativa'),
})

const cardSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  bankName: z.string().min(1, 'Selecciona un banco'),
  cutOffDay: z.number().int().min(1).max(31),
  paymentDueDay: z.number().int().min(1).max(31),
  balances: z.array(balanceSchema).min(1, 'Agrega al menos una moneda'),
})

type CardFormData = z.infer<typeof cardSchema>

export default function OnboardingCardsPage() {
  const router = useRouter()
  const [cards, setCards] = useState<CreditCardDraft[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [primaryCurrency, setPrimaryCurrency] = useState<string>('DOP')

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CardFormData>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      cutOffDay: 15,
      paymentDueDay: 25,
      balances: [{ currency: 'DOP', creditLimit: 0, balance: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'balances',
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
          // Set default currency for form
          setValue('balances.0.currency', data.data.primaryCurrency)
        }
      })
      .catch(console.error)
  }, [setValue])

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
      balances: [{ currency: primaryCurrency, creditLimit: 0, balance: 0 }],
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
    setValue('balances', card.balances)
  }

  const handleCancel = () => {
    setIsAdding(false)
    setEditingId(null)
    reset({
      name: '',
      bankName: '',
      cutOffDay: 15,
      paymentDueDay: 25,
      balances: [{ currency: primaryCurrency, creditLimit: 0, balance: 0 }],
    })
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

  const currencyOptions = Object.entries(CURRENCIES).map(([code, data]) => ({
    code,
    name: data.name,
    flag: data.flag,
  }))

  const days = Array.from({ length: 31 }, (_, i) => i + 1)

  const addCurrency = () => {
    const usedCurrencies = fields.map((f) => watch(`balances.${fields.indexOf(f)}.currency`))
    const availableCurrency = currencyOptions.find((c) => !usedCurrencies.includes(c.code))
    append({
      currency: availableCurrency?.code || 'USD',
      creditLimit: 0,
      balance: 0,
    })
  }

  const getTotalDebt = (balances: { currency: string; balance: number }[]) => {
    return balances.reduce((sum, b) => sum + b.balance, 0)
  }

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
                <div className="space-y-1">
                  {card.balances.map((balance, idx) => (
                    <div key={idx} className="text-sm flex justify-between">
                      <span className="text-muted-foreground">{balance.currency}</span>
                      <div>
                        <span className="font-mono text-danger">
                          Deuda: {formatCurrency(balance.balance, balance.currency)}
                        </span>
                        <span className="text-muted-foreground mx-2">|</span>
                        <span className="font-mono">
                          Límite: {formatCurrency(balance.creditLimit, balance.currency)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {card.balances.length > 1 && getTotalDebt(card.balances) > 0 && (
                    <p className="text-sm font-medium text-danger mt-2">
                      Deuda total (mixta): {card.balances.map((b) =>
                        b.balance > 0 ? `${formatCurrency(b.balance, b.currency)}` : null
                      ).filter(Boolean).join(' + ')}
                    </p>
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

            {/* Multi-currency balances */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Monedas y límites</Label>
                {fields.length < currencyOptions.length && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCurrency}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Agregar moneda
                  </Button>
                )}
              </div>

              {errors.balances?.message && (
                <p className="text-sm text-danger">{errors.balances.message}</p>
              )}

              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="p-4 border rounded-lg space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <Select
                      value={watch(`balances.${index}.currency`)}
                      onValueChange={(value) =>
                        setValue(`balances.${index}.currency`, value)
                      }
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Moneda" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencyOptions.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.flag} {currency.name} ({currency.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-danger hover:text-danger"
                        onClick={() => remove(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Límite de crédito</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...register(`balances.${index}.creditLimit`, {
                          valueAsNumber: true,
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Deuda actual</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...register(`balances.${index}.balance`, {
                          valueAsNumber: true,
                        })}
                      />
                    </div>
                  </div>
                </div>
              ))}
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
