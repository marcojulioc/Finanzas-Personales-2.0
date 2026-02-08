import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { loanSchema } from '@/lib/validations'

// GET /api/loans - Listar préstamos del usuario
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const loans = await db.loan.findMany({
      where: { userId: session.user.id, isActive: true },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ data: loans })
  } catch (error) {
    console.error('Error fetching loans:', error)
    return NextResponse.json(
      { error: 'Error al obtener los préstamos' },
      { status: 500 }
    )
  }
}

// POST /api/loans - Crear préstamo
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const result = loanSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: result.error.flatten() },
        { status: 422 }
      )
    }

    const loan = await db.loan.create({
      data: {
        userId: session.user.id,
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

    return NextResponse.json({ data: loan }, { status: 201 })
  } catch (error) {
    console.error('Error creating loan:', error)
    return NextResponse.json(
      { error: 'Error al crear el préstamo' },
      { status: 500 }
    )
  }
}
