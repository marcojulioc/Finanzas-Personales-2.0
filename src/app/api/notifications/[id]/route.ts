import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { deleteNotification } from '@/lib/notification-utils'

// DELETE /api/notifications/[id] - Eliminar una notificacion
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

    await deleteNotification(session.user.id, id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting notification:', error)
    return NextResponse.json(
      { error: 'Error al eliminar la notificacion' },
      { status: 500 }
    )
  }
}
