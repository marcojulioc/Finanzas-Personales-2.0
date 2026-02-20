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
    const type = searchParams.get('type') as 'income' | 'expense' | 'transfer' | null
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
            select: { id: true, name: true, color: true, currency: true },
          },
          creditCard: {
            select: { id: true, name: true, color: true },
          },
          targetAccount: {
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

    // Validar transferencias entre cuentas
    if (data.type === 'transfer') {
      if (!data.bankAccountId || !data.targetAccountId) {
        return NextResponse.json(
          { error: 'La transferencia requiere cuenta origen y cuenta destino' },
          { status: 422 }
        )
      }
      if (data.bankAccountId === data.targetAccountId) {
        return NextResponse.json(
          { error: 'La cuenta origen y destino deben ser diferentes' },
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

    if (data.targetAccountId) {
      const targetAccount = await db.bankAccount.findFirst({
        where: { id: data.targetAccountId, userId: session.user.id, isActive: true },
      })
      if (!targetAccount) {
        return NextResponse.json(
          { error: 'Cuenta destino no encontrada' },
          { status: 404 }
        )
      }
      // Validar misma moneda
      const sourceAccount = await db.bankAccount.findFirst({
        where: { id: data.bankAccountId!, userId: session.user.id },
        select: { currency: true },
      })
      if (sourceAccount && targetAccount.currency !== sourceAccount.currency) {
        return NextResponse.json(
          { error: 'Las cuentas deben tener la misma moneda para transferir' },
          { status: 422 }
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
          targetAccountId: data.targetAccountId,
          exchangeRate: data.exchangeRate,
        },
        include: {
          bankAccount: {
            select: { id: true, name: true, color: true, currency: true },
          },
          creditCard: {
            select: { id: true, name: true, color: true },
          },
          targetAccount: {
            select: { id: true, name: true, color: true },
          },
        },
      })

      // Actualizar balance de cuenta bancaria
      if (data.bankAccountId) {
        const bankAmount = (data.isCardPayment && data.exchangeRate)
          ? data.amount * data.exchangeRate
          : data.amount
        const balanceChange = data.type === 'income' ? bankAmount : -bankAmount
        await tx.bankAccount.update({
          where: { id: data.bankAccountId },
          data: {
            balance: {
              increment: balanceChange,
            },
          },
        })
      }

      // Actualizar deuda de tarjeta de crédito (en el balance de la moneda correspondiente)
      if (data.creditCardId) {
        // Los gastos aumentan la deuda, los ingresos (pagos) la reducen
        const balanceChange = data.type === 'expense' ? data.amount : -data.amount
        await tx.creditCardBalance.upsert({
          where: {
            creditCardId_currency: {
              creditCardId: data.creditCardId,
              currency: data.currency,
            },
          },
          update: {
            balance: {
              increment: balanceChange,
            },
          },
          create: {
            creditCardId: data.creditCardId,
            currency: data.currency,
            creditLimit: 0,
            balance: balanceChange > 0 ? balanceChange : 0,
          },
        })
      }

      // Si es pago de tarjeta, reducir la deuda de la tarjeta destino
      if (data.isCardPayment && data.targetCardId) {
        await tx.creditCardBalance.upsert({
          where: {
            creditCardId_currency: {
              creditCardId: data.targetCardId,
              currency: data.currency,
            },
          },
          update: {
            balance: {
              decrement: data.amount,
            },
          },
          create: {
            creditCardId: data.targetCardId,
            currency: data.currency,
            creditLimit: 0,
            balance: 0,
          },
        })
      }

      // Si es transferencia, incrementar balance de cuenta destino
      if (data.type === 'transfer' && data.targetAccountId) {
        await tx.bankAccount.update({
          where: { id: data.targetAccountId },
          data: {
            balance: {
              increment: data.amount,
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
