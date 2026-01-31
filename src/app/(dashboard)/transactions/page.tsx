'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Plus,
  Trash2,
  Pencil,
  Receipt,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  Landmark,
  CreditCard as CreditCardIcon,
} from 'lucide-react'
import { z } from 'zod'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import {
  DialogFooter,
} from '@/components/ui/dialog'
import { ResponsiveDialog } from '@/components/responsive-dialog'
import { SwipeableTransactionItem } from '@/components/swipeable-transaction-item'
import { FloatingActionButton } from '@/components/floating-action-button'
import { PullToRefresh } from '@/components/pull-to-refresh'
import { motion } from 'framer-motion'
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
import { Badge } from '@/components/ui/badge'
import type { Category } from '@/lib/categories'
import { formatCurrency, formatDate } from '@/lib/format-utils'
import { useUserCurrencies } from '@/hooks/use-user-currencies'
import { useTransactions } from '@/hooks/use-transactions'
import { useAccounts } from '@/hooks/use-accounts'
import { useCards } from '@/hooks/use-cards'
import { useCategories } from '@/hooks/use-categories'
import { TransactionPageSkeleton } from '@/components/skeletons'

interface Transaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  currency: string
  category: string
  description: string | null
  date: string
  bankAccountId: string | null
  creditCardId: string | null
  isCardPayment: boolean
  targetCardId: string | null
  bankAccount: { id: string; name: string; color: string | null } | null
  creditCard: { id: string; name: string; color: string | null } | null
}

const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive('El monto debe ser mayor a 0'),
  currency: z.string().min(1, 'Selecciona una moneda'),
  category: z.string().min(1, 'Selecciona una categoría'),
  description: z.string().max(100).optional(),
  date: z.string().min(1, 'Selecciona una fecha'),
  sourceType: z.enum(['account', 'card', 'cash']),
  bankAccountId: z.string().optional(),
  creditCardId: z.string().optional(),
  isCardPayment: z.boolean(),
  targetCardId: z.string().optional(),
})

type TransactionFormData = z.infer<typeof transactionSchema>

export default function TransactionsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // URL filters
  const urlBankAccountId = searchParams.get('bankAccountId')
  const urlCreditCardId = searchParams.get('creditCardId')
  const shouldOpenNewForm = searchParams.get('new') === 'true'

  // Filters and pagination state
  const [page, setPage] = useState(1)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')

  // Dialog states - open automatically if ?new=true
  const [isDialogOpen, setIsDialogOpen] = useState(shouldOpenNewForm)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null)

  // SWR hooks
  const { transactions, pagination, isLoading, mutate } = useTransactions({
    page,
    type: filterType,
    category: filterCategory,
    bankAccountId: urlBankAccountId || undefined,
    creditCardId: urlCreditCardId || undefined,
  })
  const { accounts } = useAccounts()
  const { cards } = useCards()

  // Get the active filter source name
  const activeFilterSource = urlBankAccountId
    ? accounts.find(a => a.id === urlBankAccountId)
    : urlCreditCardId
    ? cards.find(c => c.id === urlCreditCardId)
    : null

  const clearSourceFilter = () => {
    router.push('/transactions')
  }
  const { categories: userCategories, expenseCategories, incomeCategories } = useCategories()

  // User currencies
  const { currencyOptions, primaryCurrency } = useUserCurrencies()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'expense',
      currency: primaryCurrency || 'USD',
      sourceType: 'account',
      isCardPayment: false,
      date: new Date().toISOString().split('T')[0],
    },
  })

  const watchType = watch('type')
  const watchSourceType = watch('sourceType')
  const watchIsCardPayment = watch('isCardPayment')

  // Filter handlers that reset page to 1
  const handleFilterTypeChange = (value: string) => {
    setFilterType(value)
    setPage(1)
  }

  const handleFilterCategoryChange = (value: string) => {
    setFilterCategory(value)
    setPage(1)
  }

  const openCreateDialog = () => {
    setEditingTransaction(null)
    reset({
      type: 'expense',
      amount: undefined,
      currency: primaryCurrency || 'USD',
      category: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      sourceType: 'account',
      bankAccountId: accounts[0]?.id || '',
      creditCardId: '',
      isCardPayment: false,
      targetCardId: '',
    })
    setIsDialogOpen(true)
  }

  // Clean up URL when dialog closes (remove ?new=true)
  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open && shouldOpenNewForm) {
      router.replace('/transactions')
    }
  }

  const openEditDialog = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    const sourceType = transaction.bankAccountId
      ? 'account'
      : transaction.creditCardId
      ? 'card'
      : 'cash'

    reset({
      type: transaction.type,
      amount: Number(transaction.amount),
      currency: transaction.currency,
      category: transaction.category,
      description: transaction.description || '',
      date: new Date(transaction.date).toISOString().split('T')[0],
      sourceType,
      bankAccountId: transaction.bankAccountId || '',
      creditCardId: transaction.creditCardId || '',
      isCardPayment: transaction.isCardPayment,
      targetCardId: transaction.targetCardId || '',
    })
    setIsDialogOpen(true)
  }

  const onSubmit = async (data: TransactionFormData) => {
    try {
      const payload = {
        type: data.type,
        amount: data.amount,
        currency: data.currency,
        category: data.category,
        description: data.description || undefined,
        date: new Date(data.date),
        bankAccountId: data.sourceType === 'account' ? data.bankAccountId : undefined,
        creditCardId: data.sourceType === 'card' ? data.creditCardId : undefined,
        isCardPayment: data.isCardPayment,
        targetCardId: data.isCardPayment ? data.targetCardId : undefined,
      }

      if (editingTransaction) {
        const response = await fetch(`/api/transactions/${editingTransaction.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const result = await response.json()
          throw new Error(result.error || 'Error al actualizar')
        }
        toast.success('Transaccion actualizada correctamente')
      } else {
        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const result = await response.json()
          throw new Error(result.error || 'Error al crear')
        }
        toast.success('Transaccion registrada correctamente')
      }

      handleDialogClose(false)
      mutate()
    } catch (error) {
      console.error('Error saving transaction:', error)
      toast.error(error instanceof Error ? error.message : 'Error al guardar la transaccion')
    }
  }

  const handleDelete = async () => {
    if (!deletingTransactionId) return

    try {
      const response = await fetch(`/api/transactions/${deletingTransactionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Error al eliminar')
      }

      toast.success('Transaccion eliminada correctamente')
      setIsDeleteDialogOpen(false)
      setDeletingTransactionId(null)
      mutate()
    } catch (error) {
      console.error('Error deleting transaction:', error)
      toast.error(error instanceof Error ? error.message : 'Error al eliminar la transaccion')
    }
  }

  // Use filtered categories from hook based on transaction type
  const categories = watchType === 'expense' ? expenseCategories : incomeCategories

  const handleRefresh = async () => {
    await mutate()
  }

  if (isLoading) {
    return <TransactionPageSkeleton />
  }

  return (
    <PullToRefresh onRefresh={handleRefresh} className="min-h-[calc(100vh-12rem)]">
      <div className="space-y-6">
        {/* FAB para mobile */}
        <FloatingActionButton onClick={openCreateDialog} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Transacciones</h1>
          <p className="text-muted-foreground">
            Historial de ingresos y gastos
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Transaccion
        </Button>
      </div>

      {/* Filtro de cuenta/tarjeta activo */}
      {activeFilterSource && (
        <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
          {urlBankAccountId ? (
            <Landmark className="w-4 h-4 text-primary" />
          ) : (
            <CreditCardIcon className="w-4 h-4 text-primary" />
          )}
          <span className="text-sm font-medium">
            Mostrando transacciones de: <strong>{activeFilterSource.name}</strong>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSourceFilter}
            className="ml-auto h-7 px-2"
          >
            <X className="w-4 h-4 mr-1" />
            Quitar filtro
          </Button>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            <Select value={filterType} onValueChange={handleFilterTypeChange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="income">Ingresos</SelectItem>
                <SelectItem value="expense">Gastos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={handleFilterCategoryChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {userCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.icon} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de transacciones */}
      {transactions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Receipt className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay transacciones</p>
            <Button className="mt-4" onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Registrar tu primera transaccion
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {transactions.map((transaction, index) => {
                  // Buscar categoría por nombre en las categorías del usuario
                  const category = userCategories.find(
                    (cat: Category) => cat.name === transaction.category
                  )
                  return (
                    <motion.div
                      key={transaction.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                    >
                      <SwipeableTransactionItem
                        transaction={transaction}
                        category={category}
                        onEdit={() => openEditDialog(transaction)}
                        onDelete={() => {
                          setDeletingTransactionId(transaction.id)
                          setIsDeleteDialogOpen(true)
                        }}
                      />
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Paginacion */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Mostrando {(pagination.page - 1) * pagination.limit + 1} -{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
                {pagination.total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={pagination.page <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Dialog para crear/editar */}
      <ResponsiveDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        title={editingTransaction ? 'Editar Transaccion' : 'Nueva Transaccion'}
        description={
          editingTransaction
            ? 'Modifica los datos de la transaccion'
            : 'Registra un nuevo ingreso o gasto'
        }
        className="max-w-lg max-h-[90vh] overflow-y-auto"
      >

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
              <Label>
                {watchType === 'expense' ? 'Pagar con' : 'Recibir en'}
              </Label>
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

            {/* Categoria */}
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={watch('category')}
                onValueChange={(value) => setValue('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoria" />
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

            {/* Pago de tarjeta (solo para gastos desde cuenta) */}
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
                      Es pago de tarjeta de credito
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

            {/* Descripcion */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripcion (opcional)</Label>
              <Input
                id="description"
                placeholder="Ej: Almuerzo con amigos"
                {...register('description')}
              />
            </div>

            {/* Fecha */}
            <div className="space-y-2">
              <Label htmlFor="date">Fecha</Label>
              <Input id="date" type="date" {...register('date')} />
              {errors.date && (
                <p className="text-sm text-danger">{errors.date.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogClose(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Guardando...'
                  : editingTransaction
                  ? 'Guardar cambios'
                  : 'Crear transaccion'}
              </Button>
            </DialogFooter>
          </form>
      </ResponsiveDialog>

      {/* Dialog de confirmacion para eliminar */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar transaccion?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. El balance de la cuenta/tarjeta
              asociada sera actualizado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingTransactionId(null)}>
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
    </PullToRefresh>
  )
}
