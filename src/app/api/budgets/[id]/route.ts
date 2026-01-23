import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { budgetSchema } from '@/lib/validations'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PUT /api/budgets/:id - Actualizar presupuesto
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    // Verificar que el presupuesto pertenece al usuario
    const existingBudget = await db.budget.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existingBudget) {
      return NextResponse.json(
        { error: 'Presupuesto no encontrado' },
        { status: 404 }
      )
    }

    const body = await request.json()
    // For PUT, we only expect amount to be updatable for now based on PRD/Test
    // The schema includes category and month, but those typically aren't updated for an existing budget
    // For a minimal implementation, let's allow updating amount.
    const updateSchema = budgetSchema.pick({ amount: true });
    const result = updateSchema.safeParse(body);


    if (!result.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: result.error.flatten() },
        { status: 422 }
      )
    }

    const updatedBudget = await db.budget.update({
      where: { id },
      data: {
        amount: result.data.amount,
        updatedAt: new Date(), // Manually update updatedAt
      },
    })

    return NextResponse.json({ data: updatedBudget }, { status: 200 })
  } catch (error) {
    console.error('Error updating budget:', error)
    return NextResponse.json(
      { error: 'Error al actualizar el presupuesto' },
      { status: 500 }
    )
  }
}

// DELETE /api/budgets/:id - Eliminar presupuesto
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    // Verificar que el presupuesto pertenece al usuario
    const existingBudget = await db.budget.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existingBudget) {
      return NextResponse.json(
        { error: 'Presupuesto no encontrado' },
        { status: 404 }
      )
    }

    await db.budget.delete({
      where: { id },
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error deleting budget:', error)
    return NextResponse.json(
      { error: 'Error al eliminar el presupuesto' },
      { status: 500 }
    )
  }
}