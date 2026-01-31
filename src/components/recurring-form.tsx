'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Category } from '@/lib/categories'
import { useUserCurrencies } from '@/hooks/use-user-currencies'

interface BankAccount {
  id: string
  name: string
  color: string | null
}

interface CreditCardData {
  id: string
  name: string
  color: string | null
}

interface RecurringTransaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  currency: string
  category: string
  description: string | null
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'
  startDate: string
  endDate: string | null
  bankAccountId: string | null
  creditCardId: string | null
  isCardPayment: boolean
  targetCardId: string | null
}

interface RecurringFormProps {
  initialData?: RecurringTransaction
  accounts: BankAccount[]
  cards: CreditCardData[]
  onSuccess: () => void
  onCancel: () => void
}

const recurringFormSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive('El monto debe ser mayor a 0'),
  currency: z.string().min(1, 'Selecciona una moneda'),
  category: z.string().min(1, 'Selecciona una categoría'),
  description: z.string().max(100).optional(),
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'yearly']),
  startDate: z.string().min(1, 'Selecciona una fecha de inicio'),
  endDate: z.string().optional(),
  sourceType: z.enum(['account', 'card', 'cash']),
  bankAccountId: z.string().optional(),
  creditCardId: z.string().optional(),
  isCardPayment: z.boolean(),
  targetCardId: z.string().optional(),
})

type RecurringFormData = z.infer<typeof recurringFormSchema>

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Diario' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'yearly', label: 'Anual' },
]

export function RecurringForm({
  initialData,
  accounts,
  cards,
  onSuccess,
  onCancel,
}: RecurringFormProps) {
  const [userCategories, setUserCategories] = useState<Category[]>([])
  const { currencyOptions, primaryCurrency } = useUserCurrencies()

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/categories')
        const data = await res.json()
        setUserCategories(data.data || [])
      } catch (error) {
        console.error('Error fetching categories:', error)
      }
    }
    fetchCategories()
  }, [])

  const getInitialSourceType = () => {
    if (initialData?.bankAccountId) return 'account'
    if (initialData?.creditCardId) return 'card'
    return 'cash'
  }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RecurringFormData>({
    resolver: zodResolver(recurringFormSchema),
    defaultValues: {
      type: initialData?.type || 'expense',
      amount: initialData ? Number(initialData.amount) : undefined,
      currency: initialData?.currency || primaryCurrency || 'USD',
      category: initialData?.category || '',
      description: initialData?.description || '',
      frequency: initialData?.frequency || 'monthly',
      startDate: initialData
        ? new Date(initialData.startDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      endDate: initialData?.endDate
        ? new Date(initialData.endDate).toISOString().split('T')[0]
        : '',
      sourceType: getInitialSourceType(),
      bankAccountId: initialData?.bankAccountId || accounts[0]?.id || '',
      creditCardId: initialData?.creditCardId || '',
      isCardPayment: initialData?.isCardPayment || false,
      targetCardId: initialData?.targetCardId || '',
    },
  })

  const watchType = watch('type')
  const watchSourceType = watch('sourceType')
  const watchIsCardPayment = watch('isCardPayment')

  const expenseCategories = userCategories.filter((c) => c.type === 'expense')
  const incomeCategories = userCategories.filter((c) => c.type === 'income')
  const categories = watchType === 'expense' ? expenseCategories : incomeCategories

  const onSubmit = async (data: RecurringFormData) => {
    try {
      const payload = {
        type: data.type,
        amount: data.amount,
        currency: data.currency,
        category: data.category,
        description: data.description || undefined,
        frequency: data.frequency,
        startDate: new Date(data.startDate + 'T12:00:00'),
        endDate: data.endDate ? new Date(data.endDate + 'T12:00:00') : undefined,
        bankAccountId: data.sourceType === 'account' ? data.bankAccountId : undefined,
        creditCardId: data.sourceType === 'card' ? data.creditCardId : undefined,
        isCardPayment: data.isCardPayment,
        targetCardId: data.isCardPayment ? data.targetCardId : undefined,
      }

      const url = initialData
        ? `/api/recurring/${initialData.id}`
        : '/api/recurring'
      const method = initialData ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Error al guardar')
      }

      toast.success(
        initialData
          ? 'Recurrente actualizada correctamente'
          : 'Recurrente creada correctamente'
      )
      onSuccess()
    } catch (error) {
      console.error('Error saving recurring transaction:', error)
      toast.error(
        error instanceof Error ? error.message : 'Error al guardar la recurrente'
      )
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Tipo */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={watchType === 'expense' ? 'default' : 'outline'}
          className="flex-1"
          onClick={() => {
            setValue('type', 'expense')
            setValue('category', '')
          }}
        >
          Gasto
        </Button>
        <Button
          type="button"
          variant={watchType === 'income' ? 'default' : 'outline'}
          className="flex-1"
          onClick={() => {
            setValue('type', 'income')
            setValue('category', '')
            setValue('sourceType', 'account')
          }}
        >
          Ingreso
        </Button>
      </div>

      {/* Origen/Destino */}
      <div className="space-y-2">
        <Label>{watchType === 'expense' ? 'Pagar con' : 'Recibir en'}</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={watchSourceType === 'account' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setValue('sourceType', 'account')}
          >
            Cuenta
          </Button>
          {watchType === 'expense' && (
            <Button
              type="button"
              variant={watchSourceType === 'card' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setValue('sourceType', 'card')}
            >
              Tarjeta
            </Button>
          )}
          <Button
            type="button"
            variant={watchSourceType === 'cash' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setValue('sourceType', 'cash')}
          >
            Efectivo
          </Button>
        </div>
      </div>

      {watchSourceType === 'account' && accounts.length > 0 && (
        <div className="space-y-2">
          <Label>Cuenta</Label>
          <Select
            value={watch('bankAccountId')}
            onValueChange={(value) => setValue('bankAccountId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una cuenta" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {watchSourceType === 'card' && cards.length > 0 && (
        <div className="space-y-2">
          <Label>Tarjeta</Label>
          <Select
            value={watch('creditCardId')}
            onValueChange={(value) => setValue('creditCardId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una tarjeta" />
            </SelectTrigger>
            <SelectContent>
              {cards.map((card) => (
                <SelectItem key={card.id} value={card.id}>
                  {card.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Monto y moneda */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Monto</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            {...register('amount', { valueAsNumber: true })}
          />
          {errors.amount && (
            <p className="text-sm text-danger">{errors.amount.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Moneda</Label>
          <Select
            value={watch('currency')}
            onValueChange={(value) => setValue('currency', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencyOptions.map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>
                  {currency.flag} {currency.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Categoría */}
      <div className="space-y-2">
        <Label>Categoría</Label>
        <Select
          value={watch('category')}
          onValueChange={(value) => setValue('category', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona una categoría" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.name}>
                {cat.icon} {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && (
          <p className="text-sm text-danger">{errors.category.message}</p>
        )}
      </div>

      {/* Pago de tarjeta */}
      {watchType === 'expense' &&
        watchSourceType === 'account' &&
        cards.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isCardPayment"
                {...register('isCardPayment')}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isCardPayment" className="cursor-pointer">
                Es pago de tarjeta de crédito
              </Label>
            </div>

            {watchIsCardPayment && (
              <Select
                value={watch('targetCardId')}
                onValueChange={(value) => setValue('targetCardId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tarjeta a pagar" />
                </SelectTrigger>
                <SelectContent>
                  {cards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      {card.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

      {/* Descripción */}
      <div className="space-y-2">
        <Label htmlFor="description">Descripción (opcional)</Label>
        <Input
          id="description"
          placeholder="Ej: Suscripción Netflix"
          {...register('description')}
        />
      </div>

      {/* Frecuencia */}
      <div className="space-y-2">
        <Label>Frecuencia</Label>
        <Select
          value={watch('frequency')}
          onValueChange={(value: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly') =>
            setValue('frequency', value)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FREQUENCY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Fechas */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Fecha de inicio</Label>
          <Input id="startDate" type="date" {...register('startDate')} />
          {errors.startDate && (
            <p className="text-sm text-danger">{errors.startDate.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">Fecha de fin (opcional)</Label>
          <Input id="endDate" type="date" {...register('endDate')} />
        </div>
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? 'Guardar cambios' : 'Crear recurrente'}
        </Button>
      </div>
    </form>
  )
}
