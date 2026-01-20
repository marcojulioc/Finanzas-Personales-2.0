import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const bankAccountSchema = z.object({
  id: z.string(),
  name: z.string().min(2).max(50),
  bankName: z.string().min(2).max(50),
  accountType: z.enum(['savings', 'checking']),
  currency: z.enum(['MXN', 'USD']),
  balance: z.number().min(0),
  color: z.string().optional(),
})

const creditCardSchema = z.object({
  id: z.string(),
  name: z.string().min(2).max(50),
  bankName: z.string().min(2).max(50),
  cutOffDay: z.number().int().min(1).max(31),
  paymentDueDay: z.number().int().min(1).max(31),
  limitMXN: z.number().min(0),
  limitUSD: z.number().min(0),
  balanceMXN: z.number().min(0),
  balanceUSD: z.number().min(0),
  color: z.string().optional(),
})

const requestSchema = z.object({
  bankAccounts: z.array(bankAccountSchema),
  creditCards: z.array(creditCardSchema),
})

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'No autorizado',
          },
        },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validated = requestSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Datos inválidos',
            details: validated.error.flatten().fieldErrors,
          },
        },
        { status: 422 }
      )
    }

    const { bankAccounts, creditCards } = validated.data

    // Verificar que haya al menos una cuenta O una tarjeta
    if (bankAccounts.length === 0 && creditCards.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'NO_DATA',
            message: 'Debes agregar al menos una cuenta bancaria o una tarjeta de crédito',
          },
        },
        { status: 400 }
      )
    }

    // Crear todo en una transacción
    await db.$transaction(async (tx) => {
      // Crear cuentas bancarias
      if (bankAccounts.length > 0) {
        await tx.bankAccount.createMany({
          data: bankAccounts.map((account) => ({
            userId: session.user.id,
            name: account.name,
            bankName: account.bankName,
            accountType: account.accountType,
            currency: account.currency,
            balance: account.balance,
            color: account.color,
          })),
        })
      }

      // Crear tarjetas de crédito
      if (creditCards.length > 0) {
        await tx.creditCard.createMany({
          data: creditCards.map((card) => ({
            userId: session.user.id,
            name: card.name,
            bankName: card.bankName,
            cutOffDay: card.cutOffDay,
            paymentDueDay: card.paymentDueDay,
            limitMXN: card.limitMXN,
            limitUSD: card.limitUSD,
            balanceMXN: card.balanceMXN,
            balanceUSD: card.balanceUSD,
            color: card.color,
          })),
        })
      }

      // Marcar onboarding como completado
      await tx.user.update({
        where: { id: session.user.id },
        data: { onboardingCompleted: true },
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Onboarding completado exitosamente',
    })
  } catch (error) {
    console.error('Error en onboarding:', error)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error interno del servidor',
        },
      },
      { status: 500 }
    )
  }
}
