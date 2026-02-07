'use client'

import { Loader2, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  LazyAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from '@/components/lazy-charts'
import { formatCurrency, parseLocalDate } from '@/lib/format-utils'
import { useNetWorth } from '@/hooks/use-net-worth'

export function NetWorthSection() {
  const { data, isLoading } = useNetWorth()

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!data) return null

  const { current, history } = data
  const isPositive = current.netWorth >= 0

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Patrimonio Neto</CardTitle>
          <CardDescription>Resumen de activos y deudas en MXN</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Big net worth number */}
          <div className="text-center mb-6">
            <p
              className={`text-4xl font-bold font-mono ${
                isPositive ? 'text-teal-600 dark:text-teal-400' : 'text-destructive'
              }`}
            >
              {formatCurrency(current.netWorth)}
            </p>
          </div>

          {/* Two column: Assets vs Liabilities */}
          <div className="grid grid-cols-2 gap-6">
            {/* Assets */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-success" />
                <span className="text-sm font-medium text-success">Activos</span>
                <span className="ml-auto text-sm font-mono font-semibold text-success">
                  {formatCurrency(current.totalAssets)}
                </span>
              </div>
              <div className="space-y-2">
                {current.accounts.map((acc) => (
                  <div key={acc.id} className="flex items-center gap-2 text-sm">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: acc.color || '#6b7280' }}
                    />
                    <span className="truncate text-muted-foreground">{acc.name}</span>
                    <span className="ml-auto font-mono text-xs">
                      {formatCurrency(acc.balanceConverted)}
                    </span>
                  </div>
                ))}
                {current.accounts.length === 0 && (
                  <p className="text-xs text-muted-foreground">Sin cuentas</p>
                )}
              </div>
            </div>

            {/* Liabilities */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">Deudas</span>
                <span className="ml-auto text-sm font-mono font-semibold text-destructive">
                  {formatCurrency(current.totalLiabilities)}
                </span>
              </div>
              <div className="space-y-2">
                {current.cards.map((card) => (
                  <div key={card.id} className="flex items-center gap-2 text-sm">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: card.color || '#6b7280' }}
                    />
                    <span className="truncate text-muted-foreground">{card.name}</span>
                    <span className="ml-auto font-mono text-xs">
                      {formatCurrency(card.totalDebt)}
                    </span>
                  </div>
                ))}
                {current.cards.length === 0 && (
                  <p className="text-xs text-muted-foreground">Sin tarjetas</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History Chart */}
      {history.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Evolución del Patrimonio</CardTitle>
            <CardDescription>Tendencia histórica de tu patrimonio neto</CardDescription>
          </CardHeader>
          <CardContent>
            <NetWorthChart data={history} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function NetWorthChart({
  data,
}: {
  data: { date: string; totalAssets: number; totalLiabilities: number; netWorth: number }[]
}) {
  const chartData = data.map((item) => ({
    ...item,
    dateLabel: parseLocalDate(item.date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
    }),
  }))

  const values = data.map((d) => d.netWorth)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const lastValue = chartData[chartData.length - 1]?.netWorth ?? 0
  const isPositive = lastValue >= 0

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LazyAreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={isPositive ? '#14b8a6' : '#ef4444'}
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor={isPositive ? '#14b8a6' : '#ef4444'}
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
            domain={[Math.min(minValue * 0.9, 0), maxValue * 1.1]}
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
            dataKey="netWorth"
            name="Patrimonio Neto"
            stroke={isPositive ? '#14b8a6' : '#ef4444'}
            strokeWidth={2}
            fill="url(#netWorthGradient)"
          />
        </LazyAreaChart>
      </ResponsiveContainer>
    </div>
  )
}
