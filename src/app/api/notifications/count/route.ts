import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getUnreadCount } from '@/lib/notification-utils'

// GET /api/notifications/count - Obtener conteo de notificaciones no leidas
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const count = await getUnreadCount(session.user.id)

    return NextResponse.json({ data: { count } })
  } catch (error) {
    console.error('Error fetching notification count:', error)
    return NextResponse.json(
      { error: 'Error al obtener el conteo de notificaciones' },
      { status: 500 }
    )
  }
}
