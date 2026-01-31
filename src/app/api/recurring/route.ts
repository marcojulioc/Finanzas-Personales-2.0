import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { recurringTransactionSchema } from '@/lib/validations'
import { calculateNextDueDate } from '@/lib/recurring-utils'

// GET /api/recurring - List recurring transactions
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get('isActive')

    const where: Record<string, unknown> = {
      userId: session.user.id,
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }

    const recurringTransactions = await db.recurringTransaction.findMany({
      where,
      orderBy: { nextDueDate: 'asc' },
      include: {
        bankAccount: { select: { id: true, name: true, color: true } },
        creditCard: { select: { id: true, name: true, color: true } },
        targetCard: { select: { id: true, name: true, color: true } },
      },
    })

    return NextResponse.json({ data: recurringTransactions })
  } catch (error) {
    console.error('Error fetching recurring transactions:', error)
    return NextResponse.json(
      { error: 'Error al obtener las transacciones recurrentes' },
      { status: 500 }
    )
  }
}

// POST /api/recurring - Create recurring transaction
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const result = recurringTransactionSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: result.error.flatten() },
        { status: 422 }
      )
    }

    const data = result.data

    // Validate that either account or card is specified, not both
    if (data.bankAccountId && data.creditCardId) {
      return NextResponse.json(
        { error: 'No puedes especificar cuenta y tarjeta al mismo tiempo' },
        { status: 422 }
      )
    }

    // Validate card payment requirements
    if (data.isCardPayment) {
      if (!data.bankAccountId || !data.targetCardId) {
        return NextResponse.json(
          { error: 'El pago de tarjeta requiere cuenta origen y tarjeta destino' },
          { status: 422 }
        )
      }
    }

    // Verify ownership of bank account
    if (data.bankAccountId) {
      const account = await db.bankAccount.findFirst({
        where: { id: data.bankAccountId, userId: session.user.id, isActive: true },
      })
      if (!account) {
        return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })
      }
    }

    // Verify ownership of credit card
    if (data.creditCardId) {
      const card = await db.creditCard.findFirst({
        where: { id: data.creditCardId, userId: session.user.id, isActive: true },
      })
      if (!card) {
        return NextResponse.json({ error: 'Tarjeta no encontrada' }, { status: 404 })
      }
    }

    // Verify ownership of target card
    if (data.targetCardId) {
      const targetCard = await db.creditCard.findFirst({
        where: { id: data.targetCardId, userId: session.user.id, isActive: true },
      })
      if (!targetCard) {
        return NextResponse.json({ error: 'Tarjeta destino no encontrada' }, { status: 404 })
      }
    }

    // Calculate initial nextDueDate (same as startDate for first occurrence)
    const startDate = new Date(data.startDate + 'T12:00:00')

    const recurringTransaction = await db.recurringTransaction.create({
      data: {
        userId: session.user.id,
        type: data.type,
        amount: data.amount,
        currency: data.currency,
        category: data.category,
        description: data.description,
        bankAccountId: data.bankAccountId,
        creditCardId: data.creditCardId,
        isCardPayment: data.isCardPayment,
        targetCardId: data.targetCardId,
        frequency: data.frequency,
        startDate: startDate,
        endDate: data.endDate ? new Date(data.endDate + 'T12:00:00') : null,
        nextDueDate: startDate,
        isActive: true,
      },
      include: {
        bankAccount: { select: { id: true, name: true, color: true } },
        creditCard: { select: { id: true, name: true, color: true } },
        targetCard: { select: { id: true, name: true, color: true } },
      },
    })

    return NextResponse.json({ data: recurringTransaction }, { status: 201 })
  } catch (error) {
    console.error('Error creating recurring transaction:', error)
    return NextResponse.json(
      { error: 'Error al crear la transacción recurrente' },
      { status: 500 }
    )
  }
}
