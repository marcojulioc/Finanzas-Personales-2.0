import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const categorySchema = z.object({
  name: z.string().min(1).max(30),
  icon: z.string().min(1).max(10),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  type: z.enum(['income', 'expense']),
})

// GET /api/categories - Listar categorias del usuario
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as 'income' | 'expense' | null
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const where: {
      userId: string
      type?: 'income' | 'expense'
      isActive?: boolean
    } = {
      userId: session.user.id,
    }

    if (type) {
      where.type = type
    }

    if (!includeInactive) {
      where.isActive = true
    }

    const categories = await db.category.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    })

    return NextResponse.json(
      { data: categories },
      {
        headers: {
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
        },
      }
    )
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Error al obtener las categorias' },
      { status: 500 }
    )
  }
}

// POST /api/categories - Crear categoria personalizada
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const result = categorySchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Datos invalidos', details: result.error.flatten() },
        { status: 422 }
      )
    }

    // Verificar si ya existe una categoria con ese nombre y tipo
    const existing = await db.category.findFirst({
      where: {
        userId: session.user.id,
        name: result.data.name,
        type: result.data.type,
      },
    })

    if (existing) {
      if (!existing.isActive) {
        // Reactivar categoria existente
        const reactivated = await db.category.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            icon: result.data.icon,
            color: result.data.color,
          },
        })
        return NextResponse.json({ data: reactivated }, { status: 200 })
      }
      return NextResponse.json(
        { error: 'Ya existe una categoria con ese nombre' },
        { status: 409 }
      )
    }

    const category = await db.category.create({
      data: {
        userId: session.user.id,
        name: result.data.name,
        icon: result.data.icon,
        color: result.data.color,
        type: result.data.type,
        isDefault: false,
      },
    })

    return NextResponse.json({ data: category }, { status: 201 })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json(
      { error: 'Error al crear la categoria' },
      { status: 500 }
    )
  }
}
