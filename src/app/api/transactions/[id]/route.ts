import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { transactionSchema } from '@/lib/validations'
import { Currency } from '@prisma/client'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/transactions/:id - Obtener una transacción
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    const transaction = await db.transaction.findFirst({
      where: { id, userId: session.user.id },
      include: {
        bankAccount: {
          select: { id: true, name: true, color: true },
        },
        creditCard: {
          select: { id: true, name: true, color: true },
        },
        targetCard: {
          select: { id: true, name: true, color: true },
        },
      },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transacción no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: transaction })
  } catch (error) {
    console.error('Error fetching transaction:', error)
    return NextResponse.json(
      { error: 'Error al obtener la transacción' },
      { status: 500 }
    )
  }
}

// PUT /api/transactions/:id - Actualizar transacción
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    // Obtener la transacción existente
    const existingTransaction = await db.transaction.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transacción no encontrada' },
        { status: 404 }
      )
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

    // Actualizar transacción y balances en una transacción de DB
    const transaction = await db.$transaction(async (tx) => {
      // Revertir el efecto de la transacción anterior en cuenta bancaria
      if (existingTransaction.bankAccountId) {
        const oldBalanceChange =
          existingTransaction.type === 'income'
            ? -Number(existingTransaction.amount)
            : Number(existingTransaction.amount)
        await tx.bankAccount.update({
          where: { id: existingTransaction.bankAccountId },
          data: {
            balance: {
              increment: oldBalanceChange,
            },
          },
        })
      }

      // Revertir el efecto en tarjeta de crédito (balance por moneda)
      if (existingTransaction.creditCardId) {
        const oldBalanceChange =
          existingTransaction.type === 'expense'
            ? -Number(existingTransaction.amount)
            : Number(existingTransaction.amount)
        await tx.creditCardBalance.upsert({
          where: {
            creditCardId_currency: {
              creditCardId: existingTransaction.creditCardId,
              currency: existingTransaction.currency as Currency,
            },
          },
          update: {
            balance: {
              increment: oldBalanceChange,
            },
          },
          create: {
            creditCardId: existingTransaction.creditCardId,
            currency: existingTransaction.currency as Currency,
            creditLimit: 0,
            balance: 0,
          },
        })
      }

      // Revertir pago de tarjeta anterior
      if (existingTransaction.isCardPayment && existingTransaction.targetCardId) {
        await tx.creditCardBalance.upsert({
          where: {
            creditCardId_currency: {
              creditCardId: existingTransaction.targetCardId,
              currency: existingTransaction.currency as Currency,
            },
          },
          update: {
            balance: {
              increment: Number(existingTransaction.amount),
            },
          },
          create: {
            creditCardId: existingTransaction.targetCardId,
            currency: existingTransaction.currency as Currency,
            creditLimit: 0,
            balance: Number(existingTransaction.amount),
          },
        })
      }

      // Actualizar la transacción
      const updatedTransaction = await tx.transaction.update({
        where: { id },
        data: {
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

      // Aplicar el nuevo efecto en cuenta bancaria
      if (data.bankAccountId) {
        const newBalanceChange = data.type === 'income' ? data.amount : -data.amount
        await tx.bankAccount.update({
          where: { id: data.bankAccountId },
          data: {
            balance: {
              increment: newBalanceChange,
            },
          },
        })
      }

      // Aplicar el nuevo efecto en tarjeta de crédito (balance por moneda)
      if (data.creditCardId) {
        const newBalanceChange = data.type === 'expense' ? data.amount : -data.amount
        await tx.creditCardBalance.upsert({
          where: {
            creditCardId_currency: {
              creditCardId: data.creditCardId,
              currency: data.currency,
            },
          },
          update: {
            balance: {
              increment: newBalanceChange,
            },
          },
          create: {
            creditCardId: data.creditCardId,
            currency: data.currency,
            creditLimit: 0,
            balance: newBalanceChange > 0 ? newBalanceChange : 0,
          },
        })
      }

      // Aplicar nuevo pago de tarjeta
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

      return updatedTransaction
    })

    return NextResponse.json({ data: transaction })
  } catch (error) {
    console.error('Error updating transaction:', error)
    return NextResponse.json(
      { error: 'Error al actualizar la transacción' },
      { status: 500 }
    )
  }
}

// DELETE /api/transactions/:id - Eliminar transacción
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    // Obtener la transacción existente
    const existingTransaction = await db.transaction.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transacción no encontrada' },
        { status: 404 }
      )
    }

    // Eliminar transacción y revertir balances en una transacción de DB
    await db.$transaction(async (tx) => {
      // Revertir el efecto en cuenta bancaria
      if (existingTransaction.bankAccountId) {
        const balanceChange =
          existingTransaction.type === 'income'
            ? -Number(existingTransaction.amount)
            : Number(existingTransaction.amount)
        await tx.bankAccount.update({
          where: { id: existingTransaction.bankAccountId },
          data: {
            balance: {
              increment: balanceChange,
            },
          },
        })
      }

      // Revertir el efecto en tarjeta de crédito (balance por moneda)
      if (existingTransaction.creditCardId) {
        const balanceChange =
          existingTransaction.type === 'expense'
            ? -Number(existingTransaction.amount)
            : Number(existingTransaction.amount)
        await tx.creditCardBalance.upsert({
          where: {
            creditCardId_currency: {
              creditCardId: existingTransaction.creditCardId,
              currency: existingTransaction.currency as Currency,
            },
          },
          update: {
            balance: {
              increment: balanceChange,
            },
          },
          create: {
            creditCardId: existingTransaction.creditCardId,
            currency: existingTransaction.currency as Currency,
            creditLimit: 0,
            balance: 0,
          },
        })
      }

      // Revertir pago de tarjeta
      if (existingTransaction.isCardPayment && existingTransaction.targetCardId) {
        await tx.creditCardBalance.upsert({
          where: {
            creditCardId_currency: {
              creditCardId: existingTransaction.targetCardId,
              currency: existingTransaction.currency as Currency,
            },
          },
          update: {
            balance: {
              increment: Number(existingTransaction.amount),
            },
          },
          create: {
            creditCardId: existingTransaction.targetCardId,
            currency: existingTransaction.currency as Currency,
            creditLimit: 0,
            balance: Number(existingTransaction.amount),
          },
        })
      }

      // Eliminar la transacción
      await tx.transaction.delete({
        where: { id },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting transaction:', error)
    return NextResponse.json(
      { error: 'Error al eliminar la transacción' },
      { status: 500 }
    )
  }
}
