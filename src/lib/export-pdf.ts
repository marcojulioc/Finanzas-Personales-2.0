import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
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

interface CategoryBreakdown {
  category: string
  amount: number
  count: number
  percentage: number
}

const TYPE_LABELS: Record<string, string> = {
  income: 'Ingreso',
  expense: 'Gasto',
  transfer: 'Transferencia',
}

function formatAmount(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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

export function generatePDF(
  transactions: ExportTransaction[],
  summary: ExportSummary,
  categoryBreakdown: { expenses: CategoryBreakdown[]; income: CategoryBreakdown[] },
  periodLabel: string,
  fileName: string
) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()

  // Header
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Reporte de Finanzas Personales', pageWidth / 2, 20, { align: 'center' })

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(periodLabel, pageWidth / 2, 28, { align: 'center' })

  const today = new Date()
  const generatedDate = `Generado el ${today.getDate()} de ${today.toLocaleDateString('es-MX', { month: 'long' })} de ${today.getFullYear()}`
  doc.setFontSize(9)
  doc.text(generatedDate, pageWidth / 2, 34, { align: 'center' })

  // Summary section
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.5)
  doc.line(14, 40, pageWidth - 14, 40)

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('Resumen', 14, 48)

  const summaryStartY = 54
  const colWidth = (pageWidth - 28) / 4

  // Summary boxes
  const summaryItems = [
    { label: 'Ingresos', value: formatAmount(summary.totalIncome), color: [16, 185, 129] as [number, number, number] },
    { label: 'Gastos', value: formatAmount(summary.totalExpenses), color: [239, 68, 68] as [number, number, number] },
    { label: 'Balance Neto', value: formatAmount(summary.netBalance), color: summary.netBalance >= 0 ? [16, 185, 129] as [number, number, number] : [239, 68, 68] as [number, number, number] },
    { label: 'Transacciones', value: summary.transactionCount.toString(), color: [100, 100, 100] as [number, number, number] },
  ]

  summaryItems.forEach((item, i) => {
    const x = 14 + i * colWidth
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120, 120, 120)
    doc.text(item.label, x + 4, summaryStartY)

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...item.color)
    doc.text(item.value, x + 4, summaryStartY + 7)
  })

  // Category consolidation section
  let currentY = summaryStartY + 14

  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.5)
  doc.line(14, currentY, pageWidth - 14, currentY)

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('Consolidado por Categoria', 14, currentY + 8)

  // Expenses by category table
  if (categoryBreakdown.expenses.length > 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(196, 69, 60) // #c4453c
    doc.text('Gastos por Categoria', 14, currentY + 16)

    const expenseRows = categoryBreakdown.expenses.map((c) => [
      c.category,
      formatAmount(c.amount),
      `${c.percentage.toFixed(1)}%`,
      c.count.toString(),
    ])
    expenseRows.push([
      'TOTAL',
      formatAmount(summary.totalExpenses),
      '100%',
      categoryBreakdown.expenses.reduce((sum, c) => sum + c.count, 0).toString(),
    ])

    autoTable(doc, {
      startY: currentY + 19,
      head: [['Categoria', 'Monto', '% del Total', 'Transacciones']],
      body: expenseRows,
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [196, 69, 60], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'center' },
        3: { halign: 'center' },
      },
      margin: { left: 14, right: 14 },
      // Bold total row
      didParseCell: (data) => {
        if (data.section === 'body' && data.row.index === expenseRows.length - 1) {
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fillColor = [230, 230, 230]
        }
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentY = (doc as any).lastAutoTable.finalY + 6
  }

  // Income by category table
  if (categoryBreakdown.income.length > 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(120, 140, 93) // #788c5d
    doc.text('Ingresos por Categoria', 14, currentY + 2)

    const incomeRows = categoryBreakdown.income.map((c) => [
      c.category,
      formatAmount(c.amount),
      `${c.percentage.toFixed(1)}%`,
      c.count.toString(),
    ])
    incomeRows.push([
      'TOTAL',
      formatAmount(summary.totalIncome),
      '100%',
      categoryBreakdown.income.reduce((sum, c) => sum + c.count, 0).toString(),
    ])

    autoTable(doc, {
      startY: currentY + 5,
      head: [['Categoria', 'Monto', '% del Total', 'Transacciones']],
      body: incomeRows,
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [120, 140, 93], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'center' },
        3: { halign: 'center' },
      },
      margin: { left: 14, right: 14 },
      didParseCell: (data) => {
        if (data.section === 'body' && data.row.index === incomeRows.length - 1) {
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fillColor = [230, 230, 230]
        }
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentY = (doc as any).lastAutoTable.finalY + 6
  }

  // Transactions table
  doc.setDrawColor(200, 200, 200)
  doc.line(14, currentY, pageWidth - 14, currentY)

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('Detalle de Transacciones', 14, currentY + 8)

  const tableData = transactions.map((t) => [
    formatDateForReport(t.date),
    TYPE_LABELS[t.type] || t.type,
    t.category,
    t.description || '-',
    getAccountName(t),
    t.currency,
    formatAmount(t.amount),
  ])

  autoTable(doc, {
    startY: currentY + 12,
    head: [['Fecha', 'Tipo', 'Categoria', 'Descripcion', 'Cuenta', 'Moneda', 'Monto']],
    body: tableData,
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [51, 51, 51],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { cellWidth: 22 },
      3: { cellWidth: 'auto' },
      6: { halign: 'right' },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      // Footer with page number
      const pageCount = doc.getNumberOfPages()
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(
        `Pagina ${data.pageNumber} de ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      )
    },
  })

  doc.save(`${fileName}.pdf`)
}
