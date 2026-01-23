'use client'

import React, { useState, useEffect } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, TrendingUp, TrendingDown, Wallet, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { getCategoryById } from '@/lib/categories'

interface ReportData {
  period: {
    start: string
    end: string
    label: string
  }
  summary: {
    totalIncome: number
    totalExpenses: number
    netBalance: number
    avgDailySpending: number
    avgMonthlySpending: number
    transactionCount: number
  }
  categoryDistribution: {
    category: string
    amount: number
    percentage: number
  }[]
  monthlySummary: {
    month: string
    monthLabel: string
    income: number
    expenses: number
    balance: number
  }[]
  balanceTrend: {
    date: string
    balance: number
  }[]
  dailySpending: {
    date: string
    amount: number
  }[]
}

const PERIOD_OPTIONS = [
  { value: 'month', label: 'Este mes' },
  { value: '3months', label: 'Últimos 3 meses' },
  { value: '6months', label: 'Últimos 6 meses' },
  { value: 'year', label: 'Último año' },
]

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [period, setPeriod] = useState('6months')

  const fetchReports = async (selectedPeriod: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/reports?period=${selectedPeriod}`)
      if (!response.ok) {
        throw new Error('Error al cargar los reportes')
      }
      const result = await response.json()
      setData(result.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchReports(period)
  }, [period])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center text-muted-foreground py-12">
        <p>No hay datos disponibles para mostrar.</p>
        <Button onClick={() => fetchReports(period)} className="mt-4">
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reportes</h2>
          <p className="text-muted-foreground">Visualiza tus finanzas de un vistazo</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Seleccionar período" />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Ingresos Totales"
          value={formatCurrency(data.summary.totalIncome)}
          icon={<TrendingUp className="h-4 w-4" />}
          trend="up"
          color="text-success"
        />
        <KPICard
          title="Gastos Totales"
          value={formatCurrency(data.summary.totalExpenses)}
          icon={<TrendingDown className="h-4 w-4" />}
          trend="down"
          color="text-destructive"
        />
        <KPICard
          title="Balance Neto"
          value={formatCurrency(data.summary.netBalance)}
          icon={<Wallet className="h-4 w-4" />}
          trend={data.summary.netBalance >= 0 ? 'up' : 'down'}
          color={data.summary.netBalance >= 0 ? 'text-success' : 'text-destructive'}
        />
        <KPICard
          title="Transacciones"
          value={data.summary.transactionCount.toString()}
          icon={<Calendar className="h-4 w-4" />}
          subtitle={`Prom. diario: ${formatCurrency(data.summary.avgDailySpending)}`}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Donut Chart - Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Gastos</CardTitle>
            <CardDescription>Por categoría en el período seleccionado</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryDonutChart data={data.categoryDistribution} />
          </CardContent>
        </Card>

        {/* Bar Chart - Income vs Expenses */}
        <Card>
          <CardHeader>
            <CardTitle>Ingresos vs Gastos</CardTitle>
            <CardDescription>Comparativa mensual</CardDescription>
          </CardHeader>
          <CardContent>
            <IncomeExpenseBarChart data={data.monthlySummary} />
          </CardContent>
        </Card>
      </div>

      {/* Full Width Charts */}
      <Card>
        <CardHeader>
          <CardTitle>Tendencia de Balance</CardTitle>
          <CardDescription>Evolución de tu balance en el tiempo</CardDescription>
        </CardHeader>
        <CardContent>
          <BalanceAreaChart data={data.balanceTrend} />
        </CardContent>
      </Card>

      {/* Calendar Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad de Gastos</CardTitle>
          <CardDescription>Intensidad de gastos por día</CardDescription>
        </CardHeader>
        <CardContent>
          <SpendingCalendarHeatmap data={data.dailySpending} />
        </CardContent>
      </Card>
    </div>
  )
}

// KPI Card Component
function KPICard({
  title,
  value,
  icon,
  trend,
  color,
  subtitle,
}: {
  title: string
  value: string
  icon: React.ReactNode
  trend?: 'up' | 'down'
  color?: string
  subtitle?: string
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className={`p-2 rounded-full bg-muted ${color}`}>{icon}</div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {trend && (
            <span className={trend === 'up' ? 'text-success' : 'text-destructive'}>
              {trend === 'up' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
            </span>
          )}
        </div>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}

// Donut Chart Component
function CategoryDonutChart({
  data,
}: {
  data: { category: string; amount: number; percentage: number }[]
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No hay gastos en este período
      </div>
    )
  }

  const chartData = data.map((item) => {
    const category = getCategoryById(item.category)
    return {
      name: category?.name || item.category,
      value: item.amount,
      percentage: item.percentage,
      color: category?.color || '#6b7280',
      icon: category?.icon || '?',
    }
  })

  const total = chartData.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="flex flex-col lg:flex-row items-center gap-4">
      <div className="w-full lg:w-1/2 h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatCurrency(Number(value) || 0)}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="text-center -mt-[180px] pointer-events-none">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-xl font-bold">{formatCurrency(total)}</p>
        </div>
      </div>
      <div className="w-full lg:w-1/2 space-y-2">
        {chartData.slice(0, 6).map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm">
                {item.icon} {item.name}
              </span>
            </div>
            <div className="text-right">
              <span className="text-sm font-medium">{formatCurrency(item.value)}</span>
              <span className="text-xs text-muted-foreground ml-2">
                {item.percentage.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
        {chartData.length > 6 && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            +{chartData.length - 6} categorías más
          </p>
        )}
      </div>
    </div>
  )
}

// Bar Chart Component
function IncomeExpenseBarChart({
  data,
}: {
  data: { month: string; monthLabel: string; income: number; expenses: number; balance: number }[]
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No hay datos en este período
      </div>
    )
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="monthLabel"
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
          />
          <YAxis
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
          />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value) || 0)}
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
          />
          <Legend />
          <Bar
            dataKey="income"
            name="Ingresos"
            fill="#10b981"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="expenses"
            name="Gastos"
            fill="#ef4444"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Area Chart Component
function BalanceAreaChart({
  data,
}: {
  data: { date: string; balance: number }[]
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No hay datos en este período
      </div>
    )
  }

  // Format data for chart
  const chartData = data.map((item) => ({
    ...item,
    dateLabel: new Date(item.date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
    }),
  }))

  const minBalance = Math.min(...data.map((d) => d.balance))
  const maxBalance = Math.max(...data.map((d) => d.balance))
  const lastBalance = chartData[chartData.length - 1]?.balance ?? 0
  const isPositive = lastBalance >= 0

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={isPositive ? '#10b981' : '#ef4444'}
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor={isPositive ? '#10b981' : '#ef4444'}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
            className="text-muted-foreground"
          />
          <YAxis
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            tick={{ fontSize: 12 }}
            domain={[Math.min(minBalance * 0.9, 0), maxBalance * 1.1]}
            className="text-muted-foreground"
          />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value) || 0)}
            labelFormatter={(label) => `Fecha: ${label}`}
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
          />
          <Area
            type="monotone"
            dataKey="balance"
            name="Balance"
            stroke={isPositive ? '#10b981' : '#ef4444'}
            strokeWidth={2}
            fill="url(#balanceGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// Calendar Heatmap Component
function SpendingCalendarHeatmap({
  data,
}: {
  data: { date: string; amount: number }[]
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
        No hay gastos en este período
      </div>
    )
  }

  // Create a map of date -> amount
  const spendingMap = new Map(data.map((d) => [d.date, d.amount]))

  // Calculate intensity levels
  const amounts = data.map((d) => d.amount)
  const maxAmount = Math.max(...amounts)
  const getIntensity = (amount: number): string => {
    if (amount === 0) return 'bg-muted'
    const ratio = amount / maxAmount
    if (ratio < 0.25) return 'bg-emerald-200 dark:bg-emerald-900'
    if (ratio < 0.5) return 'bg-amber-200 dark:bg-amber-800'
    if (ratio < 0.75) return 'bg-orange-300 dark:bg-orange-700'
    return 'bg-red-400 dark:bg-red-600'
  }

  // Generate last 12 weeks of dates
  const weeks: { date: Date; amount: number }[][] = []
  const today = new Date()
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - 83) // ~12 weeks

  // Align to start of week (Sunday)
  startDate.setDate(startDate.getDate() - startDate.getDay())

  let currentWeek: { date: Date; amount: number }[] = []
  const currentDate = new Date(startDate)

  while (currentDate <= today) {
    const dateKey = currentDate.toISOString().slice(0, 10)
    currentWeek.push({
      date: new Date(currentDate),
      amount: spendingMap.get(dateKey) ?? 0,
    })

    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }

    currentDate.setDate(currentDate.getDate() + 1)
  }

  if (currentWeek.length > 0) {
    weeks.push(currentWeek)
  }

  const dayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex flex-col gap-1 min-w-fit">
        {/* Day labels */}
        <div className="flex gap-1 mb-1">
          <div className="w-8" /> {/* Spacer for alignment */}
          {dayLabels.map((day, i) => (
            <div key={i} className="w-4 text-[10px] text-muted-foreground text-center">
              {i % 2 === 1 ? day.charAt(0) : ''}
            </div>
          ))}
        </div>

        {/* Weeks grid */}
        <div className="flex gap-1">
          <div className="flex flex-col justify-around text-[10px] text-muted-foreground w-8">
            {(() => {
              const firstWeek = weeks[0]
              const firstDay = firstWeek?.[0]
              const midWeek = weeks[Math.floor(weeks.length / 2)]
              const midDay = midWeek?.[0]

              if (!firstDay) return null

              return (
                <>
                  <span>
                    {new Date(firstDay.date).toLocaleDateString('es-ES', { month: 'short' })}
                  </span>
                  {weeks.length > 6 && midDay && (
                    <span>
                      {new Date(midDay.date).toLocaleDateString('es-ES', { month: 'short' })}
                    </span>
                  )}
                </>
              )
            })()}
          </div>

          <div className="flex gap-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {week.map((day, dayIndex) => (
                  <div
                    key={dayIndex}
                    className={`w-4 h-4 rounded-sm ${getIntensity(day.amount)} transition-colors cursor-default`}
                    title={`${day.date.toLocaleDateString('es-ES')}: ${formatCurrency(day.amount)}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
          <span>Menos</span>
          <div className="flex gap-1">
            <div className="w-4 h-4 rounded-sm bg-muted" />
            <div className="w-4 h-4 rounded-sm bg-emerald-200 dark:bg-emerald-900" />
            <div className="w-4 h-4 rounded-sm bg-amber-200 dark:bg-amber-800" />
            <div className="w-4 h-4 rounded-sm bg-orange-300 dark:bg-orange-700" />
            <div className="w-4 h-4 rounded-sm bg-red-400 dark:bg-red-600" />
          </div>
          <span>Más</span>
        </div>
      </div>
    </div>
  )
}
