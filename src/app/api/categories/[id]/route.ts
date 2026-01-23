import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateCategorySchema = z.object({
  name: z.string().min(1).max(30).optional(),
  icon: z.string().min(1).max(10).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
})

// PUT /api/categories/[id] - Actualizar categoria
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const result = updateCategorySchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Datos invalidos', details: result.error.flatten() },
        { status: 422 }
      )
    }

    // Verificar que la categoria existe y pertenece al usuario
    const category = await db.category.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Categoria no encontrada' },
        { status: 404 }
      )
    }

    // Si se cambia el nombre, verificar que no exista otra con ese nombre
    if (result.data.name && result.data.name !== category.name) {
      const existing = await db.category.findFirst({
        where: {
          userId: session.user.id,
          name: result.data.name,
          type: category.type,
          id: { not: id },
        },
      })

      if (existing) {
        return NextResponse.json(
          { error: 'Ya existe una categoria con ese nombre' },
          { status: 409 }
        )
      }
    }

    const updated = await db.category.update({
      where: { id },
      data: result.data,
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json(
      { error: 'Error al actualizar la categoria' },
      { status: 500 }
    )
  }
}

// DELETE /api/categories/[id] - Eliminar categoria (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    // Verificar que la categoria existe y pertenece al usuario
    const category = await db.category.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Categoria no encontrada' },
        { status: 404 }
      )
    }

    // Soft delete - solo marcar como inactiva
    await db.category.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json(
      { error: 'Error al eliminar la categoria' },
      { status: 500 }
    )
  }
}
