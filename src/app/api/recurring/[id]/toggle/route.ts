import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// POST /api/recurring/[id]/toggle - Toggle active status
export async function POST(
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

    const updated = await db.recurringTransaction.update({
      where: { id },
      data: { isActive: !existing.isActive },
      include: {
        bankAccount: { select: { id: true, name: true, color: true } },
        creditCard: { select: { id: true, name: true, color: true } },
        targetCard: { select: { id: true, name: true, color: true } },
      },
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Error toggling recurring transaction:', error)
    return NextResponse.json(
      { error: 'Error al cambiar el estado de la transacción recurrente' },
      { status: 500 }
    )
  }
}
