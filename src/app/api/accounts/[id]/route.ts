import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { bankAccountSchema } from '@/lib/validations'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/accounts/:id - Obtener una cuenta
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    const account = await db.bankAccount.findFirst({
      where: { id, userId: session.user.id, isActive: true },
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Cuenta no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: account })
  } catch (error) {
    console.error('Error fetching account:', error)
    return NextResponse.json(
      { error: 'Error al obtener la cuenta' },
      { status: 500 }
    )
  }
}

// PUT /api/accounts/:id - Actualizar cuenta
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    // Verificar que la cuenta pertenece al usuario
    const existingAccount = await db.bankAccount.findFirst({
      where: { id, userId: session.user.id, isActive: true },
    })

    if (!existingAccount) {
      return NextResponse.json(
        { error: 'Cuenta no encontrada' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const result = bankAccountSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: result.error.flatten() },
        { status: 422 }
      )
    }

    const account = await db.bankAccount.update({
      where: { id },
      data: {
        name: result.data.name,
        bankName: result.data.bankName,
        accountType: result.data.accountType,
        currency: result.data.currency,
        balance: result.data.balance,
        color: result.data.color,
      },
    })

    return NextResponse.json({ data: account })
  } catch (error) {
    console.error('Error updating account:', error)
    return NextResponse.json(
      { error: 'Error al actualizar la cuenta' },
      { status: 500 }
    )
  }
}

// DELETE /api/accounts/:id - Eliminar cuenta (soft delete)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    // Verificar que la cuenta pertenece al usuario
    const existingAccount = await db.bankAccount.findFirst({
      where: { id, userId: session.user.id, isActive: true },
    })

    if (!existingAccount) {
      return NextResponse.json(
        { error: 'Cuenta no encontrada' },
        { status: 404 }
      )
    }

    // Verificar que no es la única cuenta activa
    const activeAccountsCount = await db.bankAccount.count({
      where: { userId: session.user.id, isActive: true },
    })

    if (activeAccountsCount <= 1) {
      return NextResponse.json(
        { error: 'No puedes eliminar tu única cuenta' },
        { status: 400 }
      )
    }

    // Soft delete
    await db.bankAccount.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting account:', error)
    return NextResponse.json(
      { error: 'Error al eliminar la cuenta' },
      { status: 500 }
    )
  }
}
