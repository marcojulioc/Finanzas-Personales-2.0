import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { creditCardSchema } from '@/lib/validations'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/cards/:id - Obtener una tarjeta con sus balances
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    const card = await db.creditCard.findFirst({
      where: { id, userId: session.user.id, isActive: true },
      include: {
        balances: {
          orderBy: { currency: 'asc' },
        },
      },
    })

    if (!card) {
      return NextResponse.json(
        { error: 'Tarjeta no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: card })
  } catch (error) {
    console.error('Error fetching card:', error)
    return NextResponse.json(
      { error: 'Error al obtener la tarjeta' },
      { status: 500 }
    )
  }
}

// PUT /api/cards/:id - Actualizar tarjeta con balances multi-moneda
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    // Verificar que la tarjeta pertenece al usuario
    const existingCard = await db.creditCard.findFirst({
      where: { id, userId: session.user.id, isActive: true },
      include: { balances: true },
    })

    if (!existingCard) {
      return NextResponse.json(
        { error: 'Tarjeta no encontrada' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const result = creditCardSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: result.error.flatten() },
        { status: 422 }
      )
    }

    // Update card and balances in a transaction
    const card = await db.$transaction(async (tx) => {
      // Delete existing balances
      await tx.creditCardBalance.deleteMany({
        where: { creditCardId: id },
      })

      // Update card and create new balances
      return tx.creditCard.update({
        where: { id },
        data: {
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
    })

    return NextResponse.json({ data: card })
  } catch (error) {
    console.error('Error updating card:', error)
    return NextResponse.json(
      { error: 'Error al actualizar la tarjeta' },
      { status: 500 }
    )
  }
}

// DELETE /api/cards/:id - Eliminar tarjeta (soft delete)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    // Verificar que la tarjeta pertenece al usuario
    const existingCard = await db.creditCard.findFirst({
      where: { id, userId: session.user.id, isActive: true },
    })

    if (!existingCard) {
      return NextResponse.json(
        { error: 'Tarjeta no encontrada' },
        { status: 404 }
      )
    }

    // Soft delete
    await db.creditCard.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting card:', error)
    return NextResponse.json(
      { error: 'Error al eliminar la tarjeta' },
      { status: 500 }
    )
  }
}
