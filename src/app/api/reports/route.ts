import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

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

    const userId = session.user.id

    // Run all independent aggregation queries in parallel
    const [
      categoryAgg,
      monthlySummaryRaw,
      prevIncome,
      prevExpense,
      dailyAgg,
      trendTransactions,
      totalTransactionCount,
    ] = await Promise.all([
      // 1. Category distribution - groupBy on expenses only
      db.transaction.groupBy({
        by: ['category'],
        where: {
          userId,
          type: 'expense',
          date: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      }),

      // 2. Monthly summary - raw SQL for date_trunc grouping (excludes transfers)
      db.$queryRaw<{ month: string; income: number; expenses: number }[]>`
        SELECT
          to_char(date_trunc('month', date), 'YYYY-MM') as month,
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses
        FROM "Transaction"
        WHERE "userId" = ${userId}
          AND date >= ${startDate}
          AND date <= ${endDate}
          AND type != 'transfer'
        GROUP BY date_trunc('month', date)
        ORDER BY month ASC
      `,

      // 3. Previous balance - aggregate income before start date
      db.transaction.aggregate({
        where: {
          userId,
          date: { lt: startDate },
          type: 'income',
        },
        _sum: { amount: true },
      }),

      // 3. Previous balance - aggregate expenses before start date
      db.transaction.aggregate({
        where: {
          userId,
          date: { lt: startDate },
          type: 'expense',
        },
        _sum: { amount: true },
      }),

      // 4. Daily spending - groupBy on expenses
      db.transaction.groupBy({
        by: ['date'],
        where: {
          userId,
          type: 'expense',
          date: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      }),

      // 5. Trend transactions - only fields needed for cumulative balance
      db.transaction.findMany({
        where: {
          userId,
          date: { gte: startDate, lte: endDate },
          type: { not: 'transfer' },
        },
        select: { type: true, amount: true, date: true },
        orderBy: { date: 'asc' },
      }),

      // Transaction count for summary KPI
      db.transaction.count({
        where: {
          userId,
          date: { gte: startDate, lte: endDate },
        },
      }),
    ])

    // --- 1. Category Distribution ---
    let totalExpenses = 0
    const categoryDistributionRaw = categoryAgg.map((row) => {
      const amount = row._sum.amount?.toNumber() ?? 0
      totalExpenses += amount
      return { category: row.category, amount }
    })

    const categoryDistribution = categoryDistributionRaw
      .map(({ category, amount }) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)

    // --- 2. Monthly Summary ---
    // Build a map from the raw SQL results
    const monthlyRawMap: Record<string, { income: number; expenses: number }> = {}
    for (const row of monthlySummaryRaw) {
      monthlyRawMap[row.month] = {
        // Postgres returns numeric as string via $queryRaw, cast safely
        income: typeof row.income === 'string' ? parseFloat(row.income) : Number(row.income),
        expenses: typeof row.expenses === 'string' ? parseFloat(row.expenses) : Number(row.expenses),
      }
    }

    // Initialize all months in the range (fills gaps with zero)
    const monthlyData: Record<string, { income: number; expenses: number }> = {}
    const cursor = new Date(startDate)
    while (cursor <= endDate) {
      const monthKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
      monthlyData[monthKey] = monthlyRawMap[monthKey] ?? { income: 0, expenses: 0 }
      cursor.setMonth(cursor.getMonth() + 1)
    }

    let totalIncome = 0
    const monthlySummary = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => {
        totalIncome += data.income
        // totalExpenses already accumulated from categoryAgg, but we also need
        // it here in case some expense months have no category (shouldn't happen,
        // but use the SQL-derived value as authoritative for income).
        return {
          month,
          monthLabel: formatMonthLabel(month),
          income: Math.round(data.income * 100) / 100,
          expenses: Math.round(data.expenses * 100) / 100,
          balance: Math.round((data.income - data.expenses) * 100) / 100,
        }
      })

    // Derive totalExpenses from monthly summary SQL (more accurate: includes all
    // expense types consistently with the monthly bar chart)
    const totalExpensesFromMonthly = Object.values(monthlyData).reduce(
      (acc, { expenses }) => acc + expenses,
      0
    )

    // --- 3. Balance Trend ---
    const initialBalance =
      (prevIncome._sum.amount?.toNumber() ?? 0) - (prevExpense._sum.amount?.toNumber() ?? 0)

    let runningBalance = initialBalance
    const dailyBalances: Record<string, number> = {}

    for (const t of trendTransactions) {
      const dateKey = new Date(t.date).toISOString().slice(0, 10)
      const amount = t.amount.toNumber()
      const change = t.type === 'income' ? amount : -amount
      dailyBalances[dateKey] = (dailyBalances[dateKey] ?? 0) + change
    }

    const sortedTrendDates = Object.keys(dailyBalances).sort()
    const balanceTrend = sortedTrendDates.map((date) => {
      runningBalance += dailyBalances[date] ?? 0
      return {
        date,
        balance: Math.round(runningBalance * 100) / 100,
      }
    })

    // --- 4. Daily Spending ---
    const dailySpendingArray = dailyAgg
      .map((row) => ({
        date: new Date(row.date).toISOString().slice(0, 10),
        amount: Math.round((row._sum.amount?.toNumber() ?? 0) * 100) / 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // --- 5. Summary KPIs ---
    const numberOfMonths = Object.keys(monthlyData).length || 1
    const avgDailySpending = totalExpensesFromMonthly / (sortedTrendDates.length || 1)
    const avgMonthlySpending = totalExpensesFromMonthly / numberOfMonths

    return NextResponse.json({
      data: {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          label: period,
        },
        summary: {
          totalIncome: Math.round(totalIncome * 100) / 100,
          totalExpenses: Math.round(totalExpensesFromMonthly * 100) / 100,
          netBalance: Math.round((totalIncome - totalExpensesFromMonthly) * 100) / 100,
          avgDailySpending: Math.round(avgDailySpending * 100) / 100,
          avgMonthlySpending: Math.round(avgMonthlySpending * 100) / 100,
          transactionCount: totalTransactionCount,
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
