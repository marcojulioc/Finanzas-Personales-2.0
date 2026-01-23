import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { DEFAULT_CATEGORIES } from '@/lib/default-categories'

// POST /api/categories/seed - Crear categorias por defecto para el usuario
export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar si el usuario ya tiene categorias
    const existingCount = await db.category.count({
      where: { userId: session.user.id },
    })

    if (existingCount > 0) {
      return NextResponse.json(
        { message: 'El usuario ya tiene categorias', seeded: false },
        { status: 200 }
      )
    }

    // Crear categorias por defecto
    const categories = await db.category.createMany({
      data: DEFAULT_CATEGORIES.map((cat) => ({
        userId: session.user.id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        type: cat.type,
        isDefault: true,
      })),
    })

    return NextResponse.json(
      { message: 'Categorias creadas', count: categories.count, seeded: true },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error seeding categories:', error)
    return NextResponse.json(
      { error: 'Error al crear categorias por defecto' },
      { status: 500 }
    )
  }
}
