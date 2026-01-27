import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const copyBudgetsSchema = z.object({
  fromMonth: z.string(), // Expected: "2026-01-01"
  toMonth: z.string(),   // Expected: "2026-02-01"
})

// POST /api/budgets/copy - Copy budgets from one month to another
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const result = copyBudgetsSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: result.error.flatten() },
        { status: 422 }
      )
    }

    const { fromMonth, toMonth } = result.data

    // Parse dates to get month starts in UTC
    const fromDate = new Date(fromMonth)
    const toDate = new Date(toMonth)
    const fromMonthStart = new Date(Date.UTC(fromDate.getFullYear(), fromDate.getMonth(), 1))
    const toMonthStart = new Date(Date.UTC(toDate.getFullYear(), toDate.getMonth(), 1))

    // Check that fromMonth and toMonth are different
    if (fromMonthStart.getTime() === toMonthStart.getTime()) {
      return NextResponse.json(
        { error: 'Los meses de origen y destino deben ser diferentes' },
        { status: 400 }
      )
    }

    // Get budgets from source month
    const sourceBudgets = await db.budget.findMany({
      where: {
        userId: session.user.id,
        month: fromMonthStart,
      },
    })

    if (sourceBudgets.length === 0) {
      return NextResponse.json(
        { error: 'No hay presupuestos en el mes de origen' },
        { status: 404 }
      )
    }

    // Check if target month already has budgets
    const existingBudgets = await db.budget.findMany({
      where: {
        userId: session.user.id,
        month: toMonthStart,
      },
      select: { categoryId: true },
    })

    const existingCategoryIds = new Set(existingBudgets.map(b => b.categoryId))

    // Filter out budgets that already exist in target month
    const budgetsToCopy = sourceBudgets.filter(
      budget => !existingCategoryIds.has(budget.categoryId)
    )

    if (budgetsToCopy.length === 0) {
      return NextResponse.json(
        { error: 'Todos los presupuestos ya existen en el mes de destino', copied: 0 },
        { status: 200 }
      )
    }

    // Create budgets in target month
    const createdBudgets = await db.budget.createMany({
      data: budgetsToCopy.map(budget => ({
        userId: session.user.id,
        categoryId: budget.categoryId,
        amount: budget.amount,
        month: toMonthStart,
      })),
    })

    return NextResponse.json({
      message: `Se copiaron ${createdBudgets.count} presupuestos`,
      copied: createdBudgets.count,
      skipped: sourceBudgets.length - budgetsToCopy.length,
    }, { status: 201 })
  } catch (error) {
    console.error('Error copying budgets:', error)
    return NextResponse.json(
      { error: 'Error al copiar los presupuestos' },
      { status: 500 }
    )
  }
}
