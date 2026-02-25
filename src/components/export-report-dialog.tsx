'use client'

import React, { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, FileText, FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'

type PeriodType = 'month' | 'quarter' | 'all'
type ExportFormat = 'pdf' | 'excel'

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

const MONTH_NAMES_CAP = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const QUARTERS = [
  { value: '1', label: 'Q1 (Enero - Marzo)', months: [0, 1, 2] },
  { value: '2', label: 'Q2 (Abril - Junio)', months: [3, 4, 5] },
  { value: '3', label: 'Q3 (Julio - Septiembre)', months: [6, 7, 8] },
  { value: '4', label: 'Q4 (Octubre - Diciembre)', months: [9, 10, 11] },
]

function getDateRange(periodType: PeriodType, month: number, year: number, quarter: string): { startDate: string; endDate: string } {
  if (periodType === 'all') {
    return { startDate: '', endDate: '' }
  }

  if (periodType === 'month') {
    const start = new Date(year, month, 1)
    const end = new Date(year, month + 1, 0)
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    }
  }

  // quarter
  const q = QUARTERS.find((q) => q.value === quarter)!
  const startMonth = q.months[0]!
  const endMonth = q.months[2]!
  const start = new Date(year, startMonth, 1)
  const end = new Date(year, endMonth + 1, 0)
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

function getPeriodLabel(periodType: PeriodType, month: number, year: number, quarter: string): string {
  if (periodType === 'all') return 'Todo el historial'
  if (periodType === 'month') return `${MONTH_NAMES_CAP[month]} ${year}`
  const q = QUARTERS.find((q) => q.value === quarter)!
  return `Q${quarter} ${year} (${q.label.split('(')[1]}`
}

function getFileName(periodType: PeriodType, month: number, year: number, quarter: string): string {
  if (periodType === 'all') return 'reporte-completo'
  if (periodType === 'month') return `reporte-mensual-${MONTH_NAMES[month]}-${year}`
  return `reporte-trimestral-Q${quarter}-${year}`
}

function getAvailableYears(): number[] {
  const currentYear = new Date().getFullYear()
  const years: number[] = []
  for (let y = currentYear; y >= currentYear - 5; y--) {
    years.push(y)
  }
  return years
}

function mapActivePeriod(activePeriod: string): { periodType: PeriodType; month: number; year: number; quarter: string } {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const currentQuarter = Math.floor(currentMonth / 3) + 1

  switch (activePeriod) {
    case 'month':
      return { periodType: 'month', month: currentMonth, year: currentYear, quarter: currentQuarter.toString() }
    case '3months':
      return { periodType: 'quarter', month: currentMonth, year: currentYear, quarter: currentQuarter.toString() }
    default:
      return { periodType: 'all', month: currentMonth, year: currentYear, quarter: currentQuarter.toString() }
  }
}

interface ExportReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activePeriod: string
}

export function ExportReportDialog({ open, onOpenChange, activePeriod }: ExportReportDialogProps) {
  const defaults = mapActivePeriod(activePeriod)
  const [periodType, setPeriodType] = useState<PeriodType>(defaults.periodType)
  const [month, setMonth] = useState(defaults.month)
  const [year, setYear] = useState(defaults.year)
  const [quarter, setQuarter] = useState(defaults.quarter)
  const [format, setFormat] = useState<ExportFormat>('pdf')
  const [isExporting, setIsExporting] = useState(false)

  // Reset defaults when dialog opens
  React.useEffect(() => {
    if (open) {
      const d = mapActivePeriod(activePeriod)
      setPeriodType(d.periodType)
      setMonth(d.month)
      setYear(d.year)
      setQuarter(d.quarter)
    }
  }, [open, activePeriod])

  const handleExport = useCallback(async () => {
    setIsExporting(true)
    try {
      const { startDate, endDate } = getDateRange(periodType, month, year, quarter)
      const periodLabel = getPeriodLabel(periodType, month, year, quarter)
      const fileName = getFileName(periodType, month, year, quarter)

      // Fetch all transactions for the period
      const params = new URLSearchParams()
      params.set('limit', 'all')
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)

      const response = await fetch(`/api/transactions?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Error al obtener transacciones')
      }

      const result = await response.json()
      // Exclude transfers — they are internal movements, not income/expenses
      const transactions = (result.data || []).filter((t: { type: string }) => t.type !== 'transfer')

      if (transactions.length === 0) {
        toast.error('No hay transacciones en el periodo seleccionado')
        setIsExporting(false)
        return
      }

      // Calculate summary from transactions
      const summary = transactions.reduce(
        (acc: { totalIncome: number; totalExpenses: number; netBalance: number; transactionCount: number }, t: { type: string; amount: string | number }) => {
          const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount
          if (t.type === 'income') {
            acc.totalIncome += amount
          } else if (t.type === 'expense') {
            acc.totalExpenses += amount
          }
          acc.transactionCount++
          return acc
        },
        { totalIncome: 0, totalExpenses: 0, netBalance: 0, transactionCount: 0 }
      )
      summary.netBalance = summary.totalIncome - summary.totalExpenses

      // Dynamic import to keep bundle size small
      if (format === 'pdf') {
        const { generatePDF } = await import('@/lib/export-pdf')
        generatePDF(transactions, summary, periodLabel, fileName)
      } else {
        const { generateExcel } = await import('@/lib/export-excel')
        generateExcel(transactions, summary, periodLabel, fileName)
      }

      toast.success(`Reporte ${format === 'pdf' ? 'PDF' : 'Excel'} descargado`)
      onOpenChange(false)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Error al generar el reporte')
    } finally {
      setIsExporting(false)
    }
  }, [periodType, month, year, quarter, format, onOpenChange])

  const availableYears = getAvailableYears()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar Reporte</DialogTitle>
          <DialogDescription>
            Selecciona el periodo y formato para descargar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Period Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de periodo</label>
            <div className="flex gap-2">
              {([
                { value: 'month', label: 'Mes' },
                { value: 'quarter', label: 'Trimestre' },
                { value: 'all', label: 'Todo' },
              ] as const).map((option) => (
                <Button
                  key={option.value}
                  variant={periodType === option.value ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setPeriodType(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Month Selector */}
          {periodType === 'month' && (
            <div className="flex gap-3">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium">Mes</label>
                <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES_CAP.map((name, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-28 space-y-2">
                <label className="text-sm font-medium">Ano</label>
                <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Quarter Selector */}
          {periodType === 'quarter' && (
            <div className="flex gap-3">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium">Trimestre</label>
                <Select value={quarter} onValueChange={setQuarter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUARTERS.map((q) => (
                      <SelectItem key={q.value} value={q.value}>
                        {q.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-28 space-y-2">
                <label className="text-sm font-medium">Ano</label>
                <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Format Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Formato</label>
            <div className="flex gap-2">
              <Button
                variant={format === 'pdf' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setFormat('pdf')}
              >
                <FileText className="h-4 w-4" />
                PDF
              </Button>
              <Button
                variant={format === 'excel' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setFormat('excel')}
              >
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              'Descargar reporte'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
