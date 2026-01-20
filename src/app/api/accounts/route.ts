import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { bankAccountSchema } from '@/lib/validations'

// GET /api/accounts - Listar cuentas del usuario
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const accounts = await db.bankAccount.findMany({
      where: { userId: session.user.id, isActive: true },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ data: accounts })
  } catch (error) {
    console.error('Error fetching accounts:', error)
    return NextResponse.json(
      { error: 'Error al obtener las cuentas' },
      { status: 500 }
    )
  }
}

// POST /api/accounts - Crear cuenta
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const result = bankAccountSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: result.error.flatten() },
        { status: 422 }
      )
    }

    const account = await db.bankAccount.create({
      data: {
        userId: session.user.id,
        name: result.data.name,
        bankName: result.data.bankName,
        accountType: result.data.accountType,
        currency: result.data.currency,
        balance: result.data.balance,
        color: result.data.color,
      },
    })

    return NextResponse.json({ data: account }, { status: 201 })
  } catch (error) {
    console.error('Error creating account:', error)
    return NextResponse.json(
      { error: 'Error al crear la cuenta' },
      { status: 500 }
    )
  }
}
