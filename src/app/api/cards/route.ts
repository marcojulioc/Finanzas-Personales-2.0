import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { creditCardSchema } from '@/lib/validations'

// GET /api/cards - Listar tarjetas del usuario con sus balances
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const cards = await db.creditCard.findMany({
      where: { userId: session.user.id, isActive: true },
      include: {
        balances: {
          orderBy: { currency: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(cards)
  } catch (error) {
    console.error('Error fetching cards:', error)
    return NextResponse.json(
      { error: 'Error al obtener las tarjetas' },
      { status: 500 }
    )
  }
}

// POST /api/cards - Crear tarjeta con balances multi-moneda
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const result = creditCardSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: result.error.flatten() },
        { status: 422 }
      )
    }

    const card = await db.creditCard.create({
      data: {
        userId: session.user.id,
        name: result.data.name,
        bankName: result.data.bankName,
        cutOffDay: result.data.cutOffDay,
        paymentDueDay: result.data.paymentDueDay,
        color: result.data.color,
        balances: {
          create: result.data.balances.map((b) => ({
            currency: b.currency,
            creditLimit: b.creditLimit,
            balance: b.balance,
          })),
        },
      },
      include: {
        balances: true,
      },
    })

    return NextResponse.json({ data: card }, { status: 201 })
  } catch (error) {
    console.error('Error creating card:', error)
    return NextResponse.json(
      { error: 'Error al crear la tarjeta' },
      { status: 500 }
    )
  }
}
