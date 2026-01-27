import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { transactionSchema } from '@/lib/validations'

// GET /api/transactions - Listar transacciones con filtros
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const type = searchParams.get('type') as 'income' | 'expense' | null
    const category = searchParams.get('category')
    const bankAccountId = searchParams.get('bankAccountId')
    const creditCardId = searchParams.get('creditCardId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const search = searchParams.get('search')

    // Construir filtros
    const where: Record<string, unknown> = {
      userId: session.user.id,
    }

    if (type) {
      where.type = type
    }

    if (category) {
      where.category = category
    }

    if (bankAccountId) {
      where.bankAccountId = bankAccountId
    }

    if (creditCardId) {
      where.creditCardId = creditCardId
    }

    if (startDate || endDate) {
      where.date = {}
      if (startDate) {
        (where.date as Record<string, Date>).gte = new Date(startDate)
      }
      if (endDate) {
        (where.date as Record<string, Date>).lte = new Date(endDate)
      }
    }

    if (search) {
      where.description = {
        contains: search,
        mode: 'insensitive',
      }
    }

    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          bankAccount: {
            select: { id: true, name: true, color: true },
          },
          creditCard: {
            select: { id: true, name: true, color: true },
          },
        },
      }),
      db.transaction.count({ where }),
    ])

    return NextResponse.json({
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { error: 'Error al obtener las transacciones' },
      { status: 500 }
    )
  }
}

// POST /api/transactions - Crear transacción
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const result = transactionSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: result.error.flatten() },
        { status: 422 }
      )
    }

    const data = result.data

    // Validar que se especifique una cuenta o tarjeta (o ninguna para efectivo)
    if (data.bankAccountId && data.creditCardId) {
      return NextResponse.json(
        { error: 'No puedes especificar cuenta y tarjeta al mismo tiempo' },
        { status: 422 }
      )
    }

    // Si es pago de tarjeta, validar que se especifique la cuenta origen y la tarjeta destino
    if (data.isCardPayment) {
      if (!data.bankAccountId || !data.targetCardId) {
        return NextResponse.json(
          { error: 'El pago de tarjeta requiere cuenta origen y tarjeta destino' },
          { status: 422 }
        )
      }
    }

    // Verificar pertenencia de cuenta/tarjeta
    if (data.bankAccountId) {
      const account = await db.bankAccount.findFirst({
        where: { id: data.bankAccountId, userId: session.user.id, isActive: true },
      })
      if (!account) {
        return NextResponse.json(
          { error: 'Cuenta no encontrada' },
          { status: 404 }
        )
      }
    }

    if (data.creditCardId) {
      const card = await db.creditCard.findFirst({
        where: { id: data.creditCardId, userId: session.user.id, isActive: true },
      })
      if (!card) {
        return NextResponse.json(
          { error: 'Tarjeta no encontrada' },
          { status: 404 }
        )
      }
    }

    if (data.targetCardId) {
      const targetCard = await db.creditCard.findFirst({
        where: { id: data.targetCardId, userId: session.user.id, isActive: true },
      })
      if (!targetCard) {
        return NextResponse.json(
          { error: 'Tarjeta destino no encontrada' },
          { status: 404 }
        )
      }
    }

    // Crear transacción y actualizar balances en una transacción de DB
    const transaction = await db.$transaction(async (tx) => {
      // Crear la transacción
      const newTransaction = await tx.transaction.create({
        data: {
          userId: session.user.id,
          type: data.type,
          amount: data.amount,
          currency: data.currency,
          category: data.category,
          description: data.description,
          date: data.date,
          bankAccountId: data.bankAccountId,
          creditCardId: data.creditCardId,
          isCardPayment: data.isCardPayment,
          targetCardId: data.targetCardId,
        },
        include: {
          bankAccount: {
            select: { id: true, name: true, color: true },
          },
          creditCard: {
            select: { id: true, name: true, color: true },
          },
        },
      })

      // Actualizar balance de cuenta bancaria
      if (data.bankAccountId) {
        const balanceChange = data.type === 'income' ? data.amount : -data.amount
        await tx.bankAccount.update({
          where: { id: data.bankAccountId },
          data: {
            balance: {
              increment: balanceChange,
            },
          },
        })
      }

      // Actualizar deuda de tarjeta de crédito
      if (data.creditCardId) {
        // Los gastos aumentan la deuda, los ingresos (pagos) la reducen
        const balanceChange = data.type === 'expense' ? data.amount : -data.amount
        await tx.creditCard.update({
          where: { id: data.creditCardId },
          data: {
            balance: {
              increment: balanceChange,
            },
          },
        })
      }

      // Si es pago de tarjeta, reducir la deuda de la tarjeta destino
      if (data.isCardPayment && data.targetCardId) {
        await tx.creditCard.update({
          where: { id: data.targetCardId },
          data: {
            balance: {
              decrement: data.amount,
            },
          },
        })
      }

      return newTransaction
    })

    return NextResponse.json({ data: transaction }, { status: 201 })
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json(
      { error: 'Error al crear la transacción' },
      { status: 500 }
    )
  }
}
