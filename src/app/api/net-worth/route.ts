import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/net-worth - Get current net worth + historical snapshots
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const userId = session.user.id
    const exchangeRate = 17

    // Fetch accounts and cards in parallel
    const [bankAccounts, creditCards] = await Promise.all([
      db.bankAccount.findMany({
        where: { userId, isActive: true },
        orderBy: { createdAt: 'asc' },
      }),
      db.creditCard.findMany({
        where: { userId, isActive: true },
        orderBy: { createdAt: 'asc' },
        include: { balances: true },
      }),
    ])

    // Compute live totals
    const accounts = bankAccounts.map((acc) => {
      const balance = Number(acc.balance)
      const balanceConverted =
        acc.currency === 'USD' ? balance * exchangeRate : balance
      return {
        id: acc.id,
        name: acc.name,
        bankName: acc.bankName,
        balance,
        currency: acc.currency,
        balanceConverted,
        color: acc.color,
      }
    })

    const totalAssets = accounts.reduce((sum, a) => sum + a.balanceConverted, 0)

    const cards = creditCards.map((card) => {
      const balances = card.balances.map((b) => {
        const balance = Number(b.balance)
        const balanceConverted =
          b.currency === 'USD' ? balance * exchangeRate : balance
        return {
          currency: b.currency,
          balance,
          balanceConverted,
        }
      })
      const totalDebt = balances.reduce((sum, b) => sum + b.balanceConverted, 0)
      return {
        id: card.id,
        name: card.name,
        bankName: card.bankName,
        totalDebt,
        balances,
        color: card.color,
      }
    })

    const totalLiabilities = cards.reduce((sum, c) => sum + c.totalDebt, 0)
    const netWorth = totalAssets - totalLiabilities

    // Upsert today's snapshot
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    const breakdown = {
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        bankName: a.bankName,
        balance: a.balance,
        currency: a.currency,
        balanceConverted: a.balanceConverted,
      })),
      cards: cards.map((c) => ({
        id: c.id,
        name: c.name,
        bankName: c.bankName,
        totalDebt: c.totalDebt,
        balances: c.balances,
      })),
    }

    await db.netWorthSnapshot.upsert({
      where: {
        userId_date: { userId, date: today },
      },
      create: {
        userId,
        date: today,
        totalAssets,
        totalLiabilities,
        netWorth,
        breakdown,
        exchangeRate,
      },
      update: {
        totalAssets,
        totalLiabilities,
        netWorth,
        breakdown,
        exchangeRate,
      },
    })

    // Fetch historical snapshots
    const history = await db.netWorthSnapshot.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        totalAssets: true,
        totalLiabilities: true,
        netWorth: true,
      },
    })

    return NextResponse.json({
      data: {
        current: {
          totalAssets,
          totalLiabilities,
          netWorth,
          accounts,
          cards,
        },
        history: history.map((h) => ({
          date: h.date.toISOString().slice(0, 10),
          totalAssets: Number(h.totalAssets),
          totalLiabilities: Number(h.totalLiabilities),
          netWorth: Number(h.netWorth),
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching net worth:', error)
    return NextResponse.json(
      { error: 'Error al obtener patrimonio neto' },
      { status: 500 }
    )
  }
}
