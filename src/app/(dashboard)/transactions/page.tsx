'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Plus,
  Trash2,
  Pencil,
  Receipt,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import {
  getCategoryById,
  getCategoriesByType,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from '@/lib/categories'

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

interface Transaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  currency: 'MXN' | 'USD'
  category: string
  description: string | null
  date: string
  bankAccountId: string | null
  creditCardId: string | null
  isCardPayment: boolean
  targetCardId: string | null
  bankAccount: BankAccount | null
  creditCard: CreditCardData | null
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive('El monto debe ser mayor a 0'),
  currency: z.enum(['MXN', 'USD']),
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
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [cards, setCards] = useState<CreditCardData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null)

  // Filtros
  const [filterType, setFilterType] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')

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
      currency: 'MXN',
      sourceType: 'account',
      isCardPayment: false,
      date: new Date().toISOString().split('T')[0],
    },
  })

  const watchType = watch('type')
  const watchSourceType = watch('sourceType')
  const watchIsCardPayment = watch('isCardPayment')

  const fetchTransactions = async (page = 1) => {
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' })
      if (filterType !== 'all') params.append('type', filterType)
      if (filterCategory !== 'all') params.append('category', filterCategory)

      const response = await fetch(`/api/transactions?${params}`)
      const result = await response.json()
      if (result.data) {
        setTransactions(result.data)
        setPagination(result.pagination)
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAccountsAndCards = async () => {
    try {
      const [accountsRes, cardsRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/cards'),
      ])
      const [accountsData, cardsData] = await Promise.all([
        accountsRes.json(),
        cardsRes.json(),
      ])
      setAccounts(accountsData.data || [])
      setCards(cardsData.data || [])
    } catch (error) {
      console.error('Error fetching accounts/cards:', error)
    }
  }

  useEffect(() => {
    fetchTransactions()
    fetchAccountsAndCards()
  }, [])

  useEffect(() => {
    fetchTransactions(1)
  }, [filterType, filterCategory])

  const openCreateDialog = () => {
    setEditingTransaction(null)
    reset({
      type: 'expense',
      amount: undefined,
      currency: 'MXN',
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
        toast.success('Transacción actualizada correctamente')
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
        toast.success('Transacción registrada correctamente')
      }

      setIsDialogOpen(false)
      fetchTransactions(pagination.page)
    } catch (error) {
      console.error('Error saving transaction:', error)
      toast.error(error instanceof Error ? error.message : 'Error al guardar la transacción')
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

      toast.success('Transacción eliminada correctamente')
      setIsDeleteDialogOpen(false)
      setDeletingTransactionId(null)
      fetchTransactions(pagination.page)
    } catch (error) {
      console.error('Error deleting transaction:', error)
      toast.error(error instanceof Error ? error.message : 'Error al eliminar la transacción')
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const categories = watchType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Transacciones</h1>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Transacciones</h1>
          <p className="text-muted-foreground">
            Historial de ingresos y gastos
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Transacción
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="income">Ingresos</SelectItem>
                <SelectItem value="expense">Gastos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {[...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
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
              Registrar tu primera transacción
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {transactions.map((transaction) => {
                  const category = getCategoryById(transaction.category)
                  return (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                          style={{
                            backgroundColor: `${category?.color || '#6b7280'}20`,
                          }}
                        >
                          {category?.icon || '❓'}
                        </div>
                        <div>
                          <p className="font-medium">
                            {category?.name || transaction.category}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{formatDate(transaction.date)}</span>
                            {(transaction.bankAccount || transaction.creditCard) && (
                              <>
                                <span>•</span>
                                <Badge
                                  variant="outline"
                                  className="font-normal"
                                  style={{
                                    borderColor:
                                      transaction.bankAccount?.color ||
                                      transaction.creditCard?.color ||
                                      undefined,
                                  }}
                                >
                                  {transaction.bankAccount?.name ||
                                    transaction.creditCard?.name}
                                </Badge>
                              </>
                            )}
                            {transaction.description && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[150px]">
                                  {transaction.description}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span
                          className={`font-mono font-bold ${
                            transaction.type === 'income'
                              ? 'text-success'
                              : 'text-danger'
                          }`}
                        >
                          {transaction.type === 'income' ? '+' : '-'}
                          {formatCurrency(
                            Number(transaction.amount),
                            transaction.currency
                          )}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(transaction)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-danger hover:text-danger"
                            onClick={() => {
                              setDeletingTransactionId(transaction.id)
                              setIsDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Paginación */}
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
                  onClick={() => fetchTransactions(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchTransactions(pagination.page + 1)}
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
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTransaction ? 'Editar Transacción' : 'Nueva Transacción'}
            </DialogTitle>
            <DialogDescription>
              {editingTransaction
                ? 'Modifica los datos de la transacción'
                : 'Registra un nuevo ingreso o gasto'}
            </DialogDescription>
          </DialogHeader>

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
                  onValueChange={(value: 'MXN' | 'USD') =>
                    setValue('currency', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MXN">MXN</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
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
                    <SelectItem key={cat.id} value={cat.id}>
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
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Guardando...'
                  : editingTransaction
                  ? 'Guardar cambios'
                  : 'Crear transacción'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación para eliminar */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar transacción?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El balance de la cuenta/tarjeta
              asociada será actualizado.
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
  )
}
