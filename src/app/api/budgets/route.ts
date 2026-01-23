import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { budgetSchema } from '@/lib/validations'
import { Decimal } from '@prisma/client/runtime/library'

// POST /api/budgets - Crear presupuesto
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const result = budgetSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: result.error.flatten() },
        { status: 422 }
      )
    }

    const budget = await db.budget.create({
      data: {
        userId: session.user.id,
        category: result.data.category,
        amount: result.data.amount,
        month: result.data.month,
      },
    })

    return NextResponse.json({ data: budget }, { status: 201 })
  } catch (error) {
    console.error('Error creating budget:', error)
    return NextResponse.json(
      { error: 'Error al crear el presupuesto' },
      { status: 500 }
    )
  }
}

// GET /api/budgets - Listar presupuestos del usuario con gastos calculados
// Acepta parámetro ?month=YYYY-MM-DD para filtrar por mes específico
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener parámetro de mes o usar mes actual
    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get('month')

    let currentMonthStart: Date
    let nextMonthStart: Date

    if (monthParam) {
      // Parsear fecha del parámetro (esperado: YYYY-MM-DD)
      const parsedDate = new Date(monthParam)
      currentMonthStart = new Date(Date.UTC(parsedDate.getFullYear(), parsedDate.getMonth(), 1))
      nextMonthStart = new Date(Date.UTC(parsedDate.getFullYear(), parsedDate.getMonth() + 1, 1))
    } else {
      // Usar mes actual
      const now = new Date(Date.now())
      currentMonthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1))
      nextMonthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1))
    }


    const budgets = await db.budget.findMany({
      where: {
        userId: session.user.id,
        month: currentMonthStart,
      },
      orderBy: { createdAt: 'asc' },
    })

    // Obtener todas las transacciones de gasto para el usuario en el mes actual
    const expenseTransactions = await db.transaction.findMany({
      where: {
        userId: session.user.id,
        type: 'expense',
        date: {
          gte: currentMonthStart,
          lt: nextMonthStart,
        },
      },
      select: {
        category: true,
        amount: true,
      },
    })

    // Calcular el gasto total por categoría
    const spendingByCategory = expenseTransactions.reduce((acc, transaction) => {
      const category = transaction.category;
      const amount = new Decimal(transaction.amount); // Convert to Decimal for aggregation
      
      if (acc[category]) {
        acc[category] = new Decimal(acc[category]).plus(amount);
      } else {
        acc[category] = amount;
      }
      return acc;
    }, {} as Record<string, Decimal>); // Use Decimal for accumulator

    // Combinar presupuestos con el gasto calculado
    const budgetsWithSpending = budgets.map((budget) => {
      const spent = spendingByCategory[budget.category] || new Decimal(0);
      return {
        // Explicitly map fields to ensure Decimal types are converted to number
        id: budget.id,
        userId: budget.userId,
        category: budget.category,
        amount: budget.amount.toNumber(), // Convert Decimal to number for API response
        month: budget.month,
        createdAt: budget.createdAt,
        updatedAt: budget.updatedAt,
        spent: spent.toNumber(), // Convert Decimal to number for API response
      };
    });

    return NextResponse.json({ data: budgetsWithSpending })
  } catch (error) {
    console.error('Error fetching budgets:', error)
    return NextResponse.json(
      { error: 'Error al obtener los presupuestos' },
      { status: 500 }
    )
  }
}
