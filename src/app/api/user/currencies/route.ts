import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { Currency } from '@prisma/client'

const currenciesSchema = z.object({
  currencies: z.array(z.nativeEnum(Currency)).min(1, 'Selecciona al menos una moneda'),
  primaryCurrency: z.nativeEnum(Currency),
})

// GET /api/user/currencies - Obtener monedas del usuario
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        currencies: true,
        primaryCurrency: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      data: {
        currencies: user.currencies,
        primaryCurrency: user.primaryCurrency,
      },
    })
  } catch (error) {
    console.error('Error fetching user currencies:', error)
    return NextResponse.json(
      { error: 'Error al obtener las monedas' },
      { status: 500 }
    )
  }
}

// PUT /api/user/currencies - Actualizar monedas del usuario
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const result = currenciesSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Datos invalidos', details: result.error.flatten() },
        { status: 422 }
      )
    }

    // Verificar que la moneda principal este en la lista de monedas
    if (!result.data.currencies.includes(result.data.primaryCurrency)) {
      return NextResponse.json(
        { error: 'La moneda principal debe estar en la lista de monedas seleccionadas' },
        { status: 422 }
      )
    }

    const user = await db.user.update({
      where: { id: session.user.id },
      data: {
        currencies: result.data.currencies,
        primaryCurrency: result.data.primaryCurrency,
      },
      select: {
        currencies: true,
        primaryCurrency: true,
      },
    })

    return NextResponse.json({
      data: {
        currencies: user.currencies,
        primaryCurrency: user.primaryCurrency,
      },
    })
  } catch (error) {
    console.error('Error updating user currencies:', error)
    return NextResponse.json(
      { error: 'Error al actualizar las monedas' },
      { status: 500 }
    )
  }
}
