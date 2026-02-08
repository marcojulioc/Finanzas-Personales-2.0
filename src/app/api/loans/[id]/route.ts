import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { loanSchema } from '@/lib/validations'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/loans/:id - Obtener un préstamo
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    const loan = await db.loan.findFirst({
      where: { id, userId: session.user.id, isActive: true },
    })

    if (!loan) {
      return NextResponse.json(
        { error: 'Préstamo no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: loan })
  } catch (error) {
    console.error('Error fetching loan:', error)
    return NextResponse.json(
      { error: 'Error al obtener el préstamo' },
      { status: 500 }
    )
  }
}

// PUT /api/loans/:id - Actualizar préstamo
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    const existingLoan = await db.loan.findFirst({
      where: { id, userId: session.user.id, isActive: true },
    })

    if (!existingLoan) {
      return NextResponse.json(
        { error: 'Préstamo no encontrado' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const result = loanSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: result.error.flatten() },
        { status: 422 }
      )
    }

    const loan = await db.loan.update({
      where: { id },
      data: {
        name: result.data.name,
        institution: result.data.institution,
        originalAmount: result.data.originalAmount,
        remainingBalance: result.data.remainingBalance,
        currency: result.data.currency,
        monthlyPayment: result.data.monthlyPayment,
        interestRate: result.data.interestRate,
        startDate: result.data.startDate,
        endDate: result.data.endDate ?? null,
        frequency: result.data.frequency,
        color: result.data.color,
      },
    })

    return NextResponse.json({ data: loan })
  } catch (error) {
    console.error('Error updating loan:', error)
    return NextResponse.json(
      { error: 'Error al actualizar el préstamo' },
      { status: 500 }
    )
  }
}

// DELETE /api/loans/:id - Eliminar préstamo (soft delete)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    const existingLoan = await db.loan.findFirst({
      where: { id, userId: session.user.id, isActive: true },
    })

    if (!existingLoan) {
      return NextResponse.json(
        { error: 'Préstamo no encontrado' },
        { status: 404 }
      )
    }

    await db.loan.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting loan:', error)
    return NextResponse.json(
      { error: 'Error al eliminar el préstamo' },
      { status: 500 }
    )
  }
}
