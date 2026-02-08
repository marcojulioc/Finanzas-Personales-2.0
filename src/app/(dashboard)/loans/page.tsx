'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, Pencil, Banknote } from 'lucide-react'
import { z } from 'zod'
import { toast } from 'sonner'

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
import { formatCurrency, formatDate } from '@/lib/format-utils'
import { useUserCurrencies } from '@/hooks/use-user-currencies'
import { useLoans, type Loan } from '@/hooks/use-loans'
import { AccountSkeletonGrid } from '@/components/skeletons'

const loanFormSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(50),
  institution: z.string().min(1, 'Selecciona una institución'),
  originalAmount: z.number().positive('Debe ser mayor a 0'),
  remainingBalance: z.number().min(0, 'No puede ser negativo'),
  currency: z.string().min(1, 'Selecciona una moneda'),
  monthlyPayment: z.number().positive('Debe ser mayor a 0'),
  interestRate: z.number().min(0).max(100),
  startDate: z.string().min(1, 'Fecha requerida'),
  endDate: z.string().optional(),
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'yearly']),
  color: z.string().optional(),
})

type LoanFormData = z.infer<typeof loanFormSchema>

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Diario',
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  yearly: 'Anual',
}

export default function LoansPage() {
  const { loans, isLoading, mutate } = useLoans()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null)
  const [deletingLoanId, setDeletingLoanId] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState<string>(ACCOUNT_COLORS[0])

  const { currencyOptions, primaryCurrency } = useUserCurrencies()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoanFormData>({
    resolver: zodResolver(loanFormSchema),
    defaultValues: {
      currency: primaryCurrency || 'USD',
      frequency: 'monthly',
      interestRate: 0,
      remainingBalance: 0,
      originalAmount: 0,
      monthlyPayment: 0,
    },
  })

  const openCreateDialog = () => {
    setEditingLoan(null)
    setSelectedColor(ACCOUNT_COLORS[loans.length % ACCOUNT_COLORS.length] || ACCOUNT_COLORS[0])
    reset({
      name: '',
      institution: '',
      originalAmount: 0,
      remainingBalance: 0,
      currency: primaryCurrency || 'USD',
      monthlyPayment: 0,
      interestRate: 0,
      startDate: '',
      endDate: '',
      frequency: 'monthly',
    })
    setIsDialogOpen(true)
  }

  const openEditDialog = (loan: Loan) => {
    setEditingLoan(loan)
    setSelectedColor(loan.color || ACCOUNT_COLORS[0])
    reset({
      name: loan.name,
      institution: loan.institution,
      originalAmount: Number(loan.originalAmount),
      remainingBalance: Number(loan.remainingBalance),
      currency: loan.currency,
      monthlyPayment: Number(loan.monthlyPayment),
      interestRate: Number(loan.interestRate),
      startDate: String(loan.startDate).slice(0, 10),
      endDate: loan.endDate ? String(loan.endDate).slice(0, 10) : '',
      frequency: loan.frequency as LoanFormData['frequency'],
    })
    setIsDialogOpen(true)
  }

  const onSubmit = async (data: LoanFormData) => {
    try {
      const payload = {
        ...data,
        color: selectedColor,
        startDate: data.startDate,
        endDate: data.endDate || null,
      }

      if (editingLoan) {
        const response = await fetch(`/api/loans/${editingLoan.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const result = await response.json()
          throw new Error(result.error || 'Error al actualizar')
        }
        toast.success('Préstamo actualizado correctamente')
      } else {
        const response = await fetch('/api/loans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const result = await response.json()
          throw new Error(result.error || 'Error al crear')
        }
        toast.success('Préstamo creado correctamente')
      }

      setIsDialogOpen(false)
      mutate()
    } catch (error) {
      console.error('Error saving loan:', error)
      toast.error(error instanceof Error ? error.message : 'Error al guardar el préstamo')
    }
  }

  const handleDelete = async () => {
    if (!deletingLoanId) return

    try {
      const response = await fetch(`/api/loans/${deletingLoanId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const result = await response.json()
        toast.error(result.error || 'Error al eliminar')
        return
      }

      toast.success('Préstamo eliminado correctamente')
      setIsDeleteDialogOpen(false)
      setDeletingLoanId(null)
      mutate()
    } catch (error) {
      console.error('Error deleting loan:', error)
      toast.error('Error al eliminar el préstamo')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Mis Préstamos</h1>
            <p className="text-muted-foreground">Gestiona tus préstamos y deudas</p>
          </div>
        </div>
        <AccountSkeletonGrid count={3} />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Mis Préstamos</h1>
          <p className="text-muted-foreground">
            Gestiona tus préstamos y deudas
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Préstamo
        </Button>
      </div>

      {loans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Banknote className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No tienes préstamos registrados
            </p>
            <Button className="mt-4" onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar tu primer préstamo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loans.map((loan) => {
            const original = Number(loan.originalAmount)
            const remaining = Number(loan.remainingBalance)
            const paid = original - remaining
            const progress = original > 0 ? (paid / original) * 100 : 0

            return (
              <Card key={loan.id} className="relative overflow-hidden">
                <div
                  className="absolute top-0 left-0 w-full h-1"
                  style={{ backgroundColor: loan.color || ACCOUNT_COLORS[0] }}
                />
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor: `${loan.color || ACCOUNT_COLORS[0]}20`,
                        }}
                      >
                        <Banknote
                          className="w-5 h-5"
                          style={{ color: loan.color || ACCOUNT_COLORS[0] }}
                        />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{loan.name}</CardTitle>
                        <CardDescription>{loan.institution}</CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(loan)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-danger hover:text-danger"
                        onClick={() => {
                          setDeletingLoanId(loan.id)
                          setIsDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="pt-1">
                      <p className="text-sm text-muted-foreground">Balance restante</p>
                      <p className="text-2xl font-bold font-mono text-destructive">
                        {formatCurrency(remaining, loan.currency)}
                      </p>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Monto original</span>
                      <span className="font-mono">{formatCurrency(original, loan.currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Cuota</span>
                      <span className="font-mono">
                        {formatCurrency(Number(loan.monthlyPayment), loan.currency)}
                        <span className="text-muted-foreground text-xs ml-1">
                          / {FREQUENCY_LABELS[loan.frequency]?.toLowerCase() || loan.frequency}
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tasa de interés</span>
                      <span>{Number(loan.interestRate)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Inicio</span>
                      <span>{formatDate(String(loan.startDate))}</span>
                    </div>
                    {loan.endDate && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Fin</span>
                        <span>{formatDate(String(loan.endDate))}</span>
                      </div>
                    )}

                    {/* Progress bar */}
                    <div className="pt-2 border-t">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{progress.toFixed(1)}% pagado</span>
                        <span>{formatCurrency(paid, loan.currency)} de {formatCurrency(original, loan.currency)}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min(progress, 100)}%`,
                            backgroundColor: loan.color || ACCOUNT_COLORS[0],
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Dialog para crear/editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingLoan ? 'Editar Préstamo' : 'Nuevo Préstamo'}
            </DialogTitle>
            <DialogDescription>
              {editingLoan
                ? 'Modifica los datos de tu préstamo'
                : 'Agrega un nuevo préstamo'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del préstamo</Label>
              <Input
                id="name"
                placeholder="Ej: Préstamo personal"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-danger">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="institution">Institución</Label>
              <Select
                value={watch('institution')}
                onValueChange={(value) => setValue('institution', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una institución" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_BANKS.map((bank) => (
                    <SelectItem key={bank} value={bank}>
                      {bank}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.institution && (
                <p className="text-sm text-danger">{errors.institution.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="originalAmount">Monto original</Label>
                <Input
                  id="originalAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...register('originalAmount', { valueAsNumber: true })}
                />
                {errors.originalAmount && (
                  <p className="text-sm text-danger">{errors.originalAmount.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="remainingBalance">Balance restante</Label>
                <Input
                  id="remainingBalance"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...register('remainingBalance', { valueAsNumber: true })}
                />
                {errors.remainingBalance && (
                  <p className="text-sm text-danger">{errors.remainingBalance.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                        {currency.flag} {currency.name} ({currency.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="monthlyPayment">Cuota</Label>
                <Input
                  id="monthlyPayment"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...register('monthlyPayment', { valueAsNumber: true })}
                />
                {errors.monthlyPayment && (
                  <p className="text-sm text-danger">{errors.monthlyPayment.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="interestRate">Tasa de interés (%)</Label>
                <Input
                  id="interestRate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="0.00"
                  {...register('interestRate', { valueAsNumber: true })}
                />
                {errors.interestRate && (
                  <p className="text-sm text-danger">{errors.interestRate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Frecuencia</Label>
                <Select
                  value={watch('frequency')}
                  onValueChange={(value: LoanFormData['frequency']) =>
                    setValue('frequency', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diario</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="biweekly">Quincenal</SelectItem>
                    <SelectItem value="monthly">Mensual</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Fecha de inicio</Label>
                <Input
                  id="startDate"
                  type="date"
                  {...register('startDate')}
                />
                {errors.startDate && (
                  <p className="text-sm text-danger">{errors.startDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">Fecha de fin (opcional)</Label>
                <Input
                  id="endDate"
                  type="date"
                  {...register('endDate')}
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
                  : editingLoan
                  ? 'Guardar cambios'
                  : 'Crear préstamo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación para eliminar */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar préstamo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El préstamo será eliminado
              de tu registro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingLoanId(null)}>
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
