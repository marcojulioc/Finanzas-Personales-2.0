'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'
import { LazyBudgetForm } from '@/components/lazy-forms'
import { BudgetSummaryCard } from '@/components/budget-summary-card'
import { Loader2, PencilIcon, TrashIcon, ChevronLeft, ChevronRight, Calendar, Copy, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/format-utils'
import { Progress } from '@/components/ui/progress'
import { useBudgets, usePreviousMonthBudgets, type Budget } from '@/hooks/use-budgets'

// Helper to get first day of a month in UTC
function getMonthStart(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1))
}

// Helper to format month for display
function formatMonthDisplay(date: Date): string {
  const formatted = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

// Helper to format date for API (YYYY-MM-DD)
function formatDateForApi(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper to check if a date is in the current month
function isDateInCurrentMonth(date: Date): boolean {
  const now = getMonthStart(new Date())
  return date.getTime() === now.getTime()
}

// Helper to get days remaining in a month
function getDaysRemaining(monthDate: Date): number {
  const now = new Date()
  const currentMonthStart = getMonthStart(now)
  const targetMonthStart = getMonthStart(monthDate)

  // If it's a future month, return total days
  if (targetMonthStart > currentMonthStart) {
    const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
    return nextMonth.getDate()
  }

  // If it's a past month, return 0
  if (targetMonthStart < currentMonthStart) {
    return 0
  }

  // Current month - calculate remaining days
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return lastDay - now.getDate()
}

export default function BudgetsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [budgetToDelete, setBudgetToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Month navigation state
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => getMonthStart(new Date()))
  const [isCopying, setIsCopying] = useState(false)

  // SWR hooks for data fetching
  const { budgets, isLoading, isError, error, mutate } = useBudgets(selectedMonth)
  const { hasBudgets: previousMonthHasBudgets } = usePreviousMonthBudgets(selectedMonth)

  // Check if selected month is current month
  const isCurrentMonth = isDateInCurrentMonth(selectedMonth)

  // Navigate to previous month
  const goToPreviousMonth = () => {
    setSelectedMonth(prev => getMonthStart(new Date(prev.getFullYear(), prev.getMonth() - 1, 1)))
  }

  // Navigate to next month
  const goToNextMonth = () => {
    setSelectedMonth(prev => getMonthStart(new Date(prev.getFullYear(), prev.getMonth() + 1, 1)))
  }

  // Navigate to current month
  const goToCurrentMonth = () => {
    setSelectedMonth(getMonthStart(new Date()))
  }

  const copyFromPreviousMonth = async () => {
    setIsCopying(true)
    try {
      const prevMonth = getMonthStart(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1))
      const response = await fetch('/api/budgets/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromMonth: formatDateForApi(prevMonth),
          toMonth: formatDateForApi(selectedMonth),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al copiar presupuestos')
      }

      toast.success(data.message)
      mutate()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al copiar presupuestos'
      toast.error(message)
    } finally {
      setIsCopying(false)
    }
  }

  const handleNewBudgetClick = () => {
    setEditingBudget(null)
    setIsFormOpen(true)
  }

  const handleEditBudget = (budget: Budget) => {
    setEditingBudget(budget)
    setIsFormOpen(true)
  }

  const handleDeleteBudget = (id: string) => {
    setBudgetToDelete(id)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteBudget = async () => {
    if (!budgetToDelete) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/budgets/${budgetToDelete}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Error al eliminar el presupuesto')
      }
      toast.success('Presupuesto eliminado correctamente.')
      mutate()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al eliminar el presupuesto'
      toast.error(message)
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
      setBudgetToDelete(null)
    }
  }

  const handleFormSuccess = () => {
    setIsFormOpen(false)
    mutate()
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="text-center text-destructive">
        <p>Error: {error?.message ?? 'Error al cargar los presupuestos'}</p>
        <Button onClick={() => mutate()} className="mt-4">Reintentar</Button>
      </div>
    )
  }

  const daysRemaining = getDaysRemaining(selectedMonth)

  // Calculate totals for summary card
  const totalBudgeted = budgets.reduce((sum, b) => sum + b.amount, 0)
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Presupuestos</h2>
        <Button onClick={handleNewBudgetClick}>
          <Plus className="mr-2 h-4 w-4" />
          Crear presupuesto
        </Button>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 min-w-[200px] justify-center">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-lg font-medium">{formatMonthDisplay(selectedMonth)}</span>
        </div>
        <Button variant="outline" size="icon" onClick={goToNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        {!isCurrentMonth && (
          <Button variant="ghost" size="sm" onClick={goToCurrentMonth} className="ml-2">
            Hoy
          </Button>
        )}
      </div>

      <Separator />

      {/* Summary Card - only show when there are budgets */}
      {budgets.length > 0 && (
        <BudgetSummaryCard
          totalBudgeted={totalBudgeted}
          totalSpent={totalSpent}
        />
      )}

      {budgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">Sin presupuestos</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            No tienes presupuestos para {formatMonthDisplay(selectedMonth).toLowerCase()}.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleNewBudgetClick}>
              <Plus className="mr-2 h-4 w-4" />
              Crear presupuesto
            </Button>
            {previousMonthHasBudgets && (
              <Button variant="outline" onClick={copyFromPreviousMonth} disabled={isCopying}>
                {isCopying ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                Copiar del mes anterior
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Summary bar */}
          {isCurrentMonth && daysRemaining > 0 && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg py-2 px-4">
              <Calendar className="h-4 w-4" />
              <span>{daysRemaining} {daysRemaining === 1 ? 'día restante' : 'días restantes'} en el mes</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {budgets.map((budget) => {
              const progressValue = Math.min((budget.spent / budget.amount) * 100, 100);
              const available = budget.amount - budget.spent;
              const isOverBudget = budget.spent > budget.amount;
              const isWarning = progressValue >= 80 && progressValue < 100;
              const progressColor = isOverBudget ? "bg-destructive" : isWarning ? "bg-amber-500" : "bg-primary";

              return (
                <Card key={budget.id} className={isOverBudget ? "border-destructive/50" : ""}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{budget.category.icon}</span>
                      <div>
                        <CardTitle className="text-base font-semibold">
                          {budget.category.name}
                        </CardTitle>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditBudget(budget)}>
                        <PencilIcon className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteBudget(budget.id)}>
                        <TrashIcon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Available/Over budget amount - prominent */}
                    <div className="text-center py-2">
                      {isOverBudget ? (
                        <>
                          <p className="text-xs text-destructive font-medium uppercase tracking-wide">Excedido</p>
                          <p className="text-3xl font-bold text-destructive">
                            -{formatCurrency(Math.abs(available))}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Disponible</p>
                          <p className={`text-3xl font-bold ${isWarning ? 'text-amber-500' : 'text-foreground'}`}>
                            {formatCurrency(available)}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1.5">
                      <Progress value={progressValue} className="h-2" indicatorColor={progressColor} />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Gastado: {formatCurrency(budget.spent)}</span>
                        <span>de {formatCurrency(budget.amount)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* Create/Edit Budget Dialog */}
      <AlertDialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{editingBudget ? 'Editar Presupuesto' : 'Crear Nuevo Presupuesto'}</AlertDialogTitle>
            <AlertDialogDescription>
              {editingBudget ? 'Actualiza los detalles de tu presupuesto.' : 'Establece un límite de gasto para una categoría en este mes.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <LazyBudgetForm
            initialData={editingBudget ? {
              id: editingBudget.id,
              categoryId: editingBudget.categoryId,
              amount: editingBudget.amount,
              month: new Date(editingBudget.month),
            } : undefined}
            selectedMonth={selectedMonth}
            onSuccess={handleFormSuccess}
            onCancel={() => setIsFormOpen(false)}
          />
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente tu presupuesto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteBudget} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isDeleting}>
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}