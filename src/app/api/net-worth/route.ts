import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// Approximate USD exchange rates (USD → target currency)
const USD_RATES: Record<string, number> = {
  USD: 1,
  MXN: 17,
  DOP: 58,
  CAD: 1.36,
  EUR: 0.92,
  GBP: 0.79,
  CHF: 0.88,
  COP: 4200,
  BRL: 5.1,
  ARS: 900,
  CLP: 950,
  PEN: 3.7,
  UYU: 40,
  PYG: 7500,
  BOB: 6.9,
  VES: 36,
  CRC: 510,
  GTQ: 7.8,
  HNL: 25,
  NIO: 37,
  PAB: 1,
  HTG: 132,
  JMD: 156,
  TTD: 6.8,
  BBD: 2,
  BSD: 1,
  CUP: 24,
}

function convertToPrimary(amount: number, fromCurrency: string, primaryCurrency: string): number {
  if (fromCurrency === primaryCurrency) return amount
  const fromRate = USD_RATES[fromCurrency] ?? 1
  const toRate = USD_RATES[primaryCurrency] ?? 1
  // Convert: amount in fromCurrency → USD → primaryCurrency
  return (amount / fromRate) * toRate
}

// GET /api/net-worth - Get current net worth + historical snapshots
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const userId = session.user.id

    // Fetch user's primary currency, accounts and cards in parallel
    const [user, bankAccounts, creditCards] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: { primaryCurrency: true },
      }),
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

    const primaryCurrency = user?.primaryCurrency ?? 'USD'
    const exchangeRate = USD_RATES[primaryCurrency] ?? 1

    // Compute live totals
    const accounts = bankAccounts.map((acc) => {
      const balance = Number(acc.balance)
      const balanceConverted = convertToPrimary(balance, acc.currency, primaryCurrency)
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
        const balanceConverted = convertToPrimary(balance, b.currency, primaryCurrency)
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
        primaryCurrency,
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
