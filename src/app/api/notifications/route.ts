import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getUserNotifications, deleteReadNotifications } from '@/lib/notification-utils'

// GET /api/notifications - Listar notificaciones del usuario
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const isReadParam = searchParams.get('isRead')
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')

    const options: { isRead?: boolean; limit?: number; offset?: number } = {}

    if (isReadParam !== null) {
      options.isRead = isReadParam === 'true'
    }

    if (limitParam) {
      options.limit = parseInt(limitParam, 10)
    }

    if (offsetParam) {
      options.offset = parseInt(offsetParam, 10)
    }

    const notifications = await getUserNotifications(session.user.id, options)

    return NextResponse.json({ data: notifications })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Error al obtener las notificaciones' },
      { status: 500 }
    )
  }
}

// DELETE /api/notifications - Eliminar todas las notificaciones leidas
export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    await deleteReadNotifications(session.user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting read notifications:', error)
    return NextResponse.json(
      { error: 'Error al eliminar las notificaciones' },
      { status: 500 }
    )
  }
}
