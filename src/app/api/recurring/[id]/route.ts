import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { recurringTransactionSchema } from '@/lib/validations'

// GET /api/recurring/[id] - Get single recurring transaction
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    const recurringTransaction = await db.recurringTransaction.findFirst({
      where: { id, userId: session.user.id },
      include: {
        bankAccount: { select: { id: true, name: true, color: true } },
        creditCard: { select: { id: true, name: true, color: true } },
        targetCard: { select: { id: true, name: true, color: true } },
      },
    })

    if (!recurringTransaction) {
      return NextResponse.json(
        { error: 'Transacción recurrente no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: recurringTransaction })
  } catch (error) {
    console.error('Error fetching recurring transaction:', error)
    return NextResponse.json(
      { error: 'Error al obtener la transacción recurrente' },
      { status: 500 }
    )
  }
}

// PUT /api/recurring/[id] - Update recurring transaction
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const result = recurringTransactionSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: result.error.flatten() },
        { status: 422 }
      )
    }

    // Verify ownership
    const existing = await db.recurringTransaction.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Transacción recurrente no encontrada' },
        { status: 404 }
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

    const startDate = new Date(data.startDate + 'T12:00:00')

    const recurringTransaction = await db.recurringTransaction.update({
      where: { id },
      data: {
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
      },
      include: {
        bankAccount: { select: { id: true, name: true, color: true } },
        creditCard: { select: { id: true, name: true, color: true } },
        targetCard: { select: { id: true, name: true, color: true } },
      },
    })

    return NextResponse.json({ data: recurringTransaction })
  } catch (error) {
    console.error('Error updating recurring transaction:', error)
    return NextResponse.json(
      { error: 'Error al actualizar la transacción recurrente' },
      { status: 500 }
    )
  }
}

// DELETE /api/recurring/[id] - Delete recurring transaction
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    // Verify ownership
    const existing = await db.recurringTransaction.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Transacción recurrente no encontrada' },
        { status: 404 }
      )
    }

    await db.recurringTransaction.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting recurring transaction:', error)
    return NextResponse.json(
      { error: 'Error al eliminar la transacción recurrente' },
      { status: 500 }
    )
  }
}
