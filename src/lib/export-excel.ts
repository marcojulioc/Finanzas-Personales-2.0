import * as XLSX from 'xlsx'
import { parseLocalDate } from '@/lib/format-utils'

interface ExportTransaction {
  date: string
  type: 'income' | 'expense' | 'transfer'
  category: string
  description: string | null
  amount: string | number
  currency: string
  bankAccount?: { name: string } | null
  creditCard?: { name: string } | null
}

interface ExportSummary {
  totalIncome: number
  totalExpenses: number
  netBalance: number
  transactionCount: number
}

const TYPE_LABELS: Record<string, string> = {
  income: 'Ingreso',
  expense: 'Gasto',
  transfer: 'Transferencia',
}

function formatDateForReport(dateString: string): string {
  const date = parseLocalDate(dateString)
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function getAccountName(t: ExportTransaction): string {
  if (t.bankAccount?.name) return t.bankAccount.name
  if (t.creditCard?.name) return t.creditCard.name
  return 'Efectivo'
}

export function generateExcel(
  transactions: ExportTransaction[],
  summary: ExportSummary,
  periodLabel: string,
  fileName: string
) {
  const wb = XLSX.utils.book_new()

  // -- Summary sheet data --
  const summaryData = [
    ['Reporte de Finanzas Personales'],
    [periodLabel],
    [`Generado el ${new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}`],
    [],
    ['Resumen'],
    ['Ingresos Totales', summary.totalIncome],
    ['Gastos Totales', summary.totalExpenses],
    ['Balance Neto', summary.netBalance],
    ['Transacciones', summary.transactionCount],
  ]

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)

  // Style column widths
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 20 }]

  XLSX.utils.book_append_sheet(wb, summarySheet, 'Resumen')

  // -- Transactions sheet --
  const headers = ['Fecha', 'Tipo', 'Categoria', 'Descripcion', 'Cuenta', 'Moneda', 'Monto']

  const rows = transactions.map((t) => {
    const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount
    return [
      formatDateForReport(t.date),
      TYPE_LABELS[t.type] || t.type,
      t.category,
      t.description || '',
      getAccountName(t),
      t.currency,
      amount,
    ]
  })

  const transactionsData = [headers, ...rows]

  // Add SUM formulas at the bottom
  const dataLength = rows.length
  const sumRowIndex = dataLength + 1 // 0-indexed: header is row 0, data starts at row 1
  transactionsData.push([
    '',
    '',
    '',
    '',
    '',
    'TOTAL Ingresos:',
    { f: `SUMPRODUCT((B2:B${dataLength + 1}="Ingreso")*G2:G${dataLength + 1})` } as unknown as string,
  ])
  transactionsData.push([
    '',
    '',
    '',
    '',
    '',
    'TOTAL Gastos:',
    { f: `SUMPRODUCT((B2:B${dataLength + 1}="Gasto")*G2:G${dataLength + 1})` } as unknown as string,
  ])

  const transactionsSheet = XLSX.utils.aoa_to_sheet(transactionsData)

  // Column widths
  transactionsSheet['!cols'] = [
    { wch: 12 }, // Fecha
    { wch: 15 }, // Tipo
    { wch: 18 }, // Categoría
    { wch: 30 }, // Descripción
    { wch: 20 }, // Cuenta
    { wch: 8 },  // Moneda
    { wch: 15 }, // Monto
  ]

  XLSX.utils.book_append_sheet(wb, transactionsSheet, 'Transacciones')

  // Generate and download
  XLSX.writeFile(wb, `${fileName}.xlsx`)
}
