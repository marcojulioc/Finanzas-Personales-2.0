import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { markNotificationsAsRead } from '@/lib/notification-utils'

// POST /api/notifications/mark-read - Marcar notificaciones como leidas
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { ids } = body as { ids?: string[] }

    await markNotificationsAsRead(session.user.id, ids)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking notifications as read:', error)
    return NextResponse.json(
      { error: 'Error al marcar las notificaciones como leidas' },
      { status: 500 }
    )
  }
}
