'use client'

import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/format-utils'
import { TrendingDown, TrendingUp, Wallet } from 'lucide-react'

interface BudgetSummaryCardProps {
  totalBudgeted: number
  totalSpent: number
  currency?: string
}

export function BudgetSummaryCard({
  totalBudgeted,
  totalSpent,
  currency = 'MXN',
}: BudgetSummaryCardProps) {
  const available = totalBudgeted - totalSpent
  const progressPercentage = totalBudgeted > 0
    ? Math.min((totalSpent / totalBudgeted) * 100, 100)
    : 0
  const isOverBudget = totalSpent > totalBudgeted
  const isWarning = progressPercentage >= 80 && !isOverBudget

  // Determine status colors
  const getStatusColor = () => {
    if (isOverBudget) return 'text-red-500'
    if (isWarning) return 'text-amber-500'
    return 'text-emerald-500'
  }

  const getProgressColor = () => {
    if (isOverBudget) return 'bg-red-500'
    if (isWarning) return 'bg-amber-500'
    return 'bg-emerald-500'
  }

  const getStatusBg = () => {
    if (isOverBudget) return 'bg-red-500/10'
    if (isWarning) return 'bg-amber-500/10'
    return 'bg-emerald-500/10'
  }

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-card to-primary/10 shadow-lg">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />

      {/* Decorative elements */}
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
      <div className="absolute -left-4 -bottom-4 h-24 w-24 rounded-full bg-primary/10 blur-xl" />

      <CardContent className="relative p-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Resumen del Mes
          </h3>
        </div>

        {/* Main metrics grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* Total Budgeted */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Presupuestado
            </p>
            <p className="text-xl font-bold text-foreground tabular-nums">
              {formatCurrency(totalBudgeted, currency)}
            </p>
          </div>

          {/* Total Spent */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Gastado
              </p>
              <TrendingDown className="h-3 w-3 text-muted-foreground" />
            </div>
            <p className={`text-xl font-bold tabular-nums ${isOverBudget ? 'text-red-500' : 'text-foreground'}`}>
              {formatCurrency(totalSpent, currency)}
            </p>
          </div>

          {/* Available */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {isOverBudget ? 'Excedido' : 'Disponible'}
              </p>
              {!isOverBudget && <TrendingUp className="h-3 w-3 text-muted-foreground" />}
            </div>
            <p className={`text-xl font-bold tabular-nums ${getStatusColor()}`}>
              {isOverBudget ? '-' : ''}{formatCurrency(Math.abs(available), currency)}
            </p>
          </div>
        </div>

        {/* Progress section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progreso de gasto</span>
            <span className={`font-semibold ${getStatusColor()}`}>
              {progressPercentage.toFixed(0)}%
            </span>
          </div>

          {/* Custom progress bar */}
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${getProgressColor()}`}
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            />
          </div>

          {/* Status indicator */}
          {(isOverBudget || isWarning) && (
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${getStatusBg()}`}>
              <div className={`h-2 w-2 rounded-full ${getProgressColor()} animate-pulse`} />
              <span className={`text-xs font-medium ${getStatusColor()}`}>
                {isOverBudget
                  ? `Has excedido tu presupuesto por ${formatCurrency(Math.abs(available), currency)}`
                  : `Atención: Has usado el ${progressPercentage.toFixed(0)}% de tu presupuesto`
                }
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
