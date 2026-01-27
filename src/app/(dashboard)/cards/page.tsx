'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, Pencil, CreditCard as CreditCardIcon } from 'lucide-react'
import { z } from 'zod'
import { toast } from 'sonner'
import { useCards, type CreditCard } from '@/hooks/use-cards'
import { useUserCurrencies } from '@/hooks/use-user-currencies'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { COMMON_BANKS, ACCOUNT_COLORS } from '@/lib/onboarding-store'
import { formatCurrency } from '@/lib/format-utils'

const cardSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  bankName: z.string().min(1, 'Selecciona un banco'),
  cutOffDay: z.number().int().min(1).max(31),
  paymentDueDay: z.number().int().min(1).max(31),
  currency: z.string().min(1, 'Selecciona una moneda'),
  creditLimit: z.number().min(0),
  balance: z.number().min(0),
})

type CardFormData = z.infer<typeof cardSchema>

export default function CardsPage() {
  const { cards, isLoading, mutate } = useCards()
  const { currencyOptions, primaryCurrency } = useUserCurrencies()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null)
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState<string>(ACCOUNT_COLORS[2])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CardFormData>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      cutOffDay: 15,
      paymentDueDay: 25,
      currency: primaryCurrency || 'USD',
      creditLimit: 0,
      balance: 0,
    },
  })

  const days = Array.from({ length: 31 }, (_, i) => i + 1)

  const openCreateDialog = () => {
    setEditingCard(null)
    setSelectedColor(ACCOUNT_COLORS[(cards.length + 2) % ACCOUNT_COLORS.length] || ACCOUNT_COLORS[0])
    reset({
      name: '',
      bankName: '',
      cutOffDay: 15,
      paymentDueDay: 25,
      currency: primaryCurrency || 'USD',
      creditLimit: 0,
      balance: 0,
    })
    setIsDialogOpen(true)
  }

  const openEditDialog = (card: CreditCard) => {
    setEditingCard(card)
    setSelectedColor(card.color || ACCOUNT_COLORS[2])
    reset({
      name: card.name,
      bankName: card.bankName,
      cutOffDay: card.cutOffDay,
      paymentDueDay: card.paymentDueDay,
      currency: card.currency,
      creditLimit: Number(card.creditLimit),
      balance: Number(card.balance),
    })
    setIsDialogOpen(true)
  }

  const onSubmit = async (data: CardFormData) => {
    try {
      const payload = { ...data, color: selectedColor }

      if (editingCard) {
        const response = await fetch(`/api/cards/${editingCard.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const result = await response.json()
          throw new Error(result.error || 'Error al actualizar')
        }
        toast.success('Tarjeta actualizada correctamente')
      } else {
        const response = await fetch('/api/cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const result = await response.json()
          throw new Error(result.error || 'Error al crear')
        }
        toast.success('Tarjeta creada correctamente')
      }

      setIsDialogOpen(false)
      mutate()
    } catch (error) {
      console.error('Error saving card:', error)
      toast.error(error instanceof Error ? error.message : 'Error al guardar la tarjeta')
    }
  }

  const handleDelete = async () => {
    if (!deletingCardId) return

    try {
      const response = await fetch(`/api/cards/${deletingCardId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const result = await response.json()
        toast.error(result.error || 'Error al eliminar')
        return
      }

      toast.success('Tarjeta eliminada correctamente')
      setIsDeleteDialogOpen(false)
      setDeletingCardId(null)
      mutate()
    } catch (error) {
      console.error('Error deleting card:', error)
      toast.error('Error al eliminar la tarjeta')
    }
  }

  const getUsagePercent = (balance: number, limit: number) => {
    if (limit <= 0) return 0
    return Math.min((balance / limit) * 100, 100)
  }

  const getUsageColor = (percent: number) => {
    if (percent > 80) return 'bg-danger'
    if (percent > 50) return 'bg-warning'
    return 'bg-success'
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Mis Tarjetas</h1>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Mis Tarjetas</h1>
          <p className="text-muted-foreground">
            Gestiona tus tarjetas de crédito
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Tarjeta
        </Button>
      </div>

      {cards.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CreditCardIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No tienes tarjetas registradas
            </p>
            <Button className="mt-4" onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar tu primera tarjeta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {cards.map((card) => {
            const balance = Number(card.balance)
            const limit = Number(card.creditLimit)
            const usagePercent = getUsagePercent(balance, limit)

            return (
              <Card key={card.id} className="relative overflow-hidden">
                <div
                  className="absolute top-0 left-0 w-full h-1"
                  style={{ backgroundColor: card.color || ACCOUNT_COLORS[2] }}
                />
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor: `${card.color || ACCOUNT_COLORS[2]}20`,
                        }}
                      >
                        <CreditCardIcon
                          className="w-5 h-5"
                          style={{ color: card.color || ACCOUNT_COLORS[2] }}
                        />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{card.name}</CardTitle>
                        <CardDescription>
                          {card.bankName} • Corte: día {card.cutOffDay} • Pago: día{' '}
                          {card.paymentDueDay}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(card)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-danger hover:text-danger"
                        onClick={() => {
                          setDeletingCardId(card.id)
                          setIsDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Límite ({card.currency})
                      </span>
                      <span className="font-mono">
                        {formatCurrency(balance, card.currency)} /{' '}
                        {formatCurrency(limit, card.currency)}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${getUsageColor(usagePercent)}`}
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-right">
                      {usagePercent.toFixed(0)}% utilizado
                    </p>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Deuda actual
                      </span>
                      <span className="text-xl font-bold font-mono text-danger">
                        -{formatCurrency(balance, card.currency)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Disponible: {formatCurrency(limit - balance, card.currency)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Dialog para crear/editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCard ? 'Editar Tarjeta' : 'Nueva Tarjeta'}
            </DialogTitle>
            <DialogDescription>
              {editingCard
                ? 'Modifica los datos de tu tarjeta'
                : 'Agrega una nueva tarjeta de crédito'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
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
                <Label htmlFor="bankName">Banco</Label>
                <Select
                  value={watch('bankName')}
                  onValueChange={(value) => setValue('bankName', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Banco" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_BANKS.map((bank) => (
                      <SelectItem key={bank} value={bank}>
                        {bank}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <Label>Moneda</Label>
              <Select
                value={watch('currency')}
                onValueChange={(value) => setValue('currency', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona moneda" />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.flag} {currency.name} ({currency.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="creditLimit">Límite de crédito</Label>
                <Input
                  id="creditLimit"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('creditLimit', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="balance">Deuda actual</Label>
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('balance', { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {ACCOUNT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full transition-transform ${
                      selectedColor === color
                        ? 'ring-2 ring-offset-2 ring-primary scale-110'
                        : ''
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Guardando...'
                  : editingCard
                  ? 'Guardar cambios'
                  : 'Crear tarjeta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación para eliminar */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tarjeta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Las transacciones asociadas a
              esta tarjeta se mantendrán pero sin referencia a la tarjeta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingCardId(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-danger hover:bg-danger/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
