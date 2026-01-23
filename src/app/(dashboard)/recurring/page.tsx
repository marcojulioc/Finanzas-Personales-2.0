'use client'

import { useEffect, useState } from 'react'
import {
  Plus,
  Trash2,
  Pencil,
  Repeat,
  Pause,
  Play,
  RefreshCw,
  Loader2,
} from 'lucide-react'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { getCategoryById } from '@/lib/categories'
import { RecurringForm } from '@/components/recurring-form'
import { FREQUENCY_LABELS } from '@/lib/recurring-constants'
import { formatCurrency } from '@/lib/utils'

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
  currency: 'MXN' | 'USD'
  category: string
  description: string | null
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'
  startDate: string
  endDate: string | null
  nextDueDate: string
  lastGeneratedDate: string | null
  isActive: boolean
  bankAccountId: string | null
  creditCardId: string | null
  isCardPayment: boolean
  targetCardId: string | null
  bankAccount: BankAccount | null
  creditCard: CreditCardData | null
  targetCard: CreditCardData | null
}

export default function RecurringPage() {
  const [recurringTransactions, setRecurringTransactions] = useState<
    RecurringTransaction[]
  >([])
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [cards, setCards] = useState<CreditCardData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingRecurring, setEditingRecurring] =
    useState<RecurringTransaction | null>(null)
  const [deletingRecurringId, setDeletingRecurringId] = useState<string | null>(
    null
  )

  const fetchRecurringTransactions = async () => {
    try {
      const response = await fetch('/api/recurring')
      const result = await response.json()
      if (result.data) {
        setRecurringTransactions(result.data)
      }
    } catch (error) {
      console.error('Error fetching recurring transactions:', error)
      toast.error('Error al cargar las transacciones recurrentes')
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
    fetchRecurringTransactions()
    fetchAccountsAndCards()
  }, [])

  const openCreateDialog = () => {
    setEditingRecurring(null)
    setIsDialogOpen(true)
  }

  const openEditDialog = (recurring: RecurringTransaction) => {
    setEditingRecurring(recurring)
    setIsDialogOpen(true)
  }

  const handleToggle = async (id: string) => {
    try {
      const response = await fetch(`/api/recurring/${id}/toggle`, {
        method: 'POST',
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Error al cambiar el estado')
      }

      const result = await response.json()
      toast.success(
        result.data.isActive
          ? 'Recurrente activada'
          : 'Recurrente pausada'
      )
      fetchRecurringTransactions()
    } catch (error) {
      console.error('Error toggling recurring:', error)
      toast.error(
        error instanceof Error
          ? error.message
          : 'Error al cambiar el estado'
      )
    }
  }

  const handleDelete = async () => {
    if (!deletingRecurringId) return

    try {
      const response = await fetch(`/api/recurring/${deletingRecurringId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Error al eliminar')
      }

      toast.success('Recurrente eliminada correctamente')
      setIsDeleteDialogOpen(false)
      setDeletingRecurringId(null)
      fetchRecurringTransactions()
    } catch (error) {
      console.error('Error deleting recurring:', error)
      toast.error(
        error instanceof Error
          ? error.message
          : 'Error al eliminar la recurrente'
      )
    }
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/recurring/generate', {
        method: 'POST',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al generar')
      }

      toast.success(result.message)
      fetchRecurringTransactions()
    } catch (error) {
      console.error('Error generating recurring transactions:', error)
      toast.error(
        error instanceof Error
          ? error.message
          : 'Error al generar transacciones'
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const getStatusBadge = (recurring: RecurringTransaction) => {
    if (!recurring.isActive) {
      return (
        <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
          Pausada
        </Badge>
      )
    }

    const endDate = recurring.endDate ? new Date(recurring.endDate) : null
    if (endDate && endDate < new Date()) {
      return (
        <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
          Finalizada
        </Badge>
      )
    }

    return (
      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        Activa
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Recurrentes</h1>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Recurrentes</h1>
          <p className="text-muted-foreground">
            Transacciones que se repiten automáticamente
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Generar pendientes
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Recurrente
          </Button>
        </div>
      </div>

      {/* Lista de recurrentes */}
      {recurringTransactions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Repeat className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No hay transacciones recurrentes
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Crea una para automatizar pagos como suscripciones, servicios o ingresos regulares.
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Crear primera recurrente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {recurringTransactions.map((recurring) => {
            const category = getCategoryById(recurring.category)
            return (
              <Card
                key={recurring.id}
                className={!recurring.isActive ? 'opacity-60' : ''}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                        style={{
                          backgroundColor: `${category?.color || '#6b7280'}20`,
                        }}
                      >
                        {category?.icon || '❓'}
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {category?.name || recurring.category}
                        </CardTitle>
                        <CardDescription>
                          {recurring.description || FREQUENCY_LABELS[recurring.frequency]}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(recurring)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Monto</span>
                    <span
                      className={`font-mono font-bold ${
                        recurring.type === 'income'
                          ? 'text-success'
                          : 'text-danger'
                      }`}
                    >
                      {recurring.type === 'income' ? '+' : '-'}
                      {formatCurrency(Number(recurring.amount), recurring.currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Frecuencia
                    </span>
                    <span className="text-sm">
                      {FREQUENCY_LABELS[recurring.frequency]}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Próxima fecha
                    </span>
                    <span className="text-sm">
                      {formatDate(recurring.nextDueDate)}
                    </span>
                  </div>

                  {(recurring.bankAccount || recurring.creditCard) && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Fuente
                      </span>
                      <Badge
                        variant="outline"
                        className="font-normal"
                        style={{
                          borderColor:
                            recurring.bankAccount?.color ||
                            recurring.creditCard?.color ||
                            undefined,
                        }}
                      >
                        {recurring.bankAccount?.name ||
                          recurring.creditCard?.name}
                      </Badge>
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex gap-1 pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleToggle(recurring.id)}
                    >
                      {recurring.isActive ? (
                        <>
                          <Pause className="w-4 h-4 mr-1" />
                          Pausar
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-1" />
                          Activar
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(recurring)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger hover:text-danger"
                      onClick={() => {
                        setDeletingRecurringId(recurring.id)
                        setIsDeleteDialogOpen(true)
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
              {editingRecurring
                ? 'Editar Recurrente'
                : 'Nueva Transacción Recurrente'}
            </DialogTitle>
            <DialogDescription>
              {editingRecurring
                ? 'Modifica los datos de la transacción recurrente'
                : 'Crea una transacción que se repita automáticamente'}
            </DialogDescription>
          </DialogHeader>

          <RecurringForm
            initialData={editingRecurring || undefined}
            accounts={accounts}
            cards={cards}
            onSuccess={() => {
              setIsDialogOpen(false)
              fetchRecurringTransactions()
            }}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación para eliminar */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar recurrente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Las transacciones ya generadas
              no serán eliminadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingRecurringId(null)}>
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
