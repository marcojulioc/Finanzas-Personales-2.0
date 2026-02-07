import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'

// GET /api/reports - Get report data for charts
// Query params:
//   - period: 'month' | '3months' | '6months' | 'year' (default: '6months')
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '6months'

    // Calculate date range based on period
    const now = new Date()
    let startDate: Date

    switch (period) {
      case 'month':
        startDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1))
        break
      case '3months':
        startDate = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 2, 1))
        break
      case 'year':
        startDate = new Date(Date.UTC(now.getFullYear() - 1, now.getMonth() + 1, 1))
        break
      case '6months':
      default:
        startDate = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 5, 1))
        break
    }

    const endDate = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59))

    // Fetch all transactions in the period
    const transactions = await db.transaction.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    })

    // 1. Category Distribution (expenses only, for donut chart)
    const categoryTotals: Record<string, number> = {}
    let totalExpenses = 0
    let totalIncome = 0

    transactions.forEach((t) => {
      const amount = new Decimal(t.amount).toNumber()
      if (t.type === 'expense') {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + amount
        totalExpenses += amount
      } else if (t.type === 'income') {
        totalIncome += amount
      }
      // transfers excluded from income/expense totals
    })

    const categoryDistribution = Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)

    // 2. Monthly Summary (for bar chart)
    const monthlyData: Record<string, { income: number; expenses: number }> = {}

    // Initialize all months in the range
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
      monthlyData[monthKey] = { income: 0, expenses: 0 }
      currentDate.setMonth(currentDate.getMonth() + 1)
    }

    transactions.forEach((t) => {
      const date = new Date(t.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const amount = new Decimal(t.amount).toNumber()

      if (monthlyData[monthKey]) {
        if (t.type === 'income') {
          monthlyData[monthKey].income += amount
        } else if (t.type === 'expense') {
          monthlyData[monthKey].expenses += amount
        }
        // transfers excluded
      }
    })

    const monthlySummary = Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        monthLabel: formatMonthLabel(month),
        income: Math.round(data.income * 100) / 100,
        expenses: Math.round(data.expenses * 100) / 100,
        balance: Math.round((data.income - data.expenses) * 100) / 100,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))

    // 3. Balance Trend (cumulative, for area chart)
    // Get initial balance from before the start date
    const previousTransactions = await db.transaction.findMany({
      where: {
        userId: session.user.id,
        date: { lt: startDate },
      },
      select: { type: true, amount: true },
    })

    let runningBalance = previousTransactions.reduce((acc, t) => {
      const amount = new Decimal(t.amount).toNumber()
      if (t.type === 'income') return acc + amount
      if (t.type === 'expense') return acc - amount
      return acc // transfers don't affect net balance
    }, 0)

    const balanceTrend: { date: string; balance: number }[] = []
    const dailyBalances: Record<string, number> = {}

    // Group transactions by date and calculate daily balance changes
    transactions.forEach((t) => {
      if (t.type === 'transfer') return // transfers don't affect net balance
      const dateKey = new Date(t.date).toISOString().slice(0, 10)
      const amount = new Decimal(t.amount).toNumber()
      const change = t.type === 'income' ? amount : -amount

      dailyBalances[dateKey] = (dailyBalances[dateKey] || 0) + change
    })

    // Create cumulative balance trend
    const sortedDates = Object.keys(dailyBalances).sort()
    sortedDates.forEach((date) => {
      runningBalance += dailyBalances[date] ?? 0
      balanceTrend.push({
        date,
        balance: Math.round(runningBalance * 100) / 100,
      })
    })

    // 4. Daily Spending (for calendar heatmap)
    const dailySpending: Record<string, number> = {}

    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const dateKey = new Date(t.date).toISOString().slice(0, 10)
        const amount = new Decimal(t.amount).toNumber()
        dailySpending[dateKey] = (dailySpending[dateKey] || 0) + amount
      })

    const dailySpendingArray = Object.entries(dailySpending)
      .map(([date, amount]) => ({
        date,
        amount: Math.round(amount * 100) / 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // 5. Summary KPIs
    const avgDailySpending = totalExpenses / (sortedDates.length || 1)
    const avgMonthlySpending = totalExpenses / (Object.keys(monthlyData).length || 1)

    return NextResponse.json({
      data: {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          label: period,
        },
        summary: {
          totalIncome: Math.round(totalIncome * 100) / 100,
          totalExpenses: Math.round(totalExpenses * 100) / 100,
          netBalance: Math.round((totalIncome - totalExpenses) * 100) / 100,
          avgDailySpending: Math.round(avgDailySpending * 100) / 100,
          avgMonthlySpending: Math.round(avgMonthlySpending * 100) / 100,
          transactionCount: transactions.length,
        },
        categoryDistribution,
        monthlySummary,
        balanceTrend,
        dailySpending: dailySpendingArray,
      },
    })
  } catch (error) {
    console.error('Error fetching reports:', error)
    return NextResponse.json(
      { error: 'Error al obtener los reportes' },
      { status: 500 }
    )
  }
}

// Helper to format month label
function formatMonthLabel(monthKey: string): string {
  const parts = monthKey.split('-')
  const year = parts[0] ?? '2026'
  const month = parts[1] ?? '01'
  const date = new Date(parseInt(year), parseInt(month) - 1, 1)
  const label = date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}
