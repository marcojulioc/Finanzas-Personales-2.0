import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// DEBUG endpoint - remove after fixing issue
export async function GET() {
  try {
    const session = await auth()

    // Get all cards stats (no user filter)
    const totalCards = await db.creditCard.count()
    const activeCards = await db.creditCard.count({ where: { isActive: true } })
    const totalBalances = await db.creditCardBalance.count()

    // If logged in, show user-specific info
    let userInfo = null
    if (session?.user?.id) {
      const userCards = await db.creditCard.findMany({
        where: { userId: session.user.id },
        include: { balances: true },
      })

      const userActiveCards = await db.creditCard.findMany({
        where: { userId: session.user.id, isActive: true },
        include: { balances: true },
      })

      userInfo = {
        userId: session.user.id,
        email: session.user.email,
        totalUserCards: userCards.length,
        activeUserCards: userActiveCards.length,
        cards: userCards.map((c) => ({
          id: c.id,
          name: c.name,
          bankName: c.bankName,
          isActive: c.isActive,
          balancesCount: c.balances.length,
          balances: c.balances,
        })),
      }
    }

    // Get all cards with user info for debugging
    const allCards = await db.creditCard.findMany({
      include: {
        balances: true,
        user: { select: { id: true, email: true } },
      },
    })

    return NextResponse.json({
      global: {
        totalCards,
        activeCards,
        totalBalances,
      },
      allCardsDetail: allCards.map((c) => ({
        id: c.id,
        name: c.name,
        bankName: c.bankName,
        isActive: c.isActive,
        userId: c.userId,
        userEmail: c.user.email,
        balancesCount: c.balances.length,
      })),
      user: userInfo,
      session: session
        ? { id: session.user?.id, email: session.user?.email }
        : null,
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json(
      { error: 'Error', details: String(error) },
      { status: 500 }
    )
  }
}
