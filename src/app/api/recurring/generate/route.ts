import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { generatePendingTransactions } from '@/lib/recurring-utils'

// POST /api/recurring/generate - Generate pending recurring transactions
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const generatedCount = await generatePendingTransactions(session.user.id)

    return NextResponse.json({
      success: true,
      generated: generatedCount,
      message:
        generatedCount > 0
          ? `Se generaron ${generatedCount} transacción${generatedCount !== 1 ? 'es' : ''}`
          : 'No hay transacciones pendientes por generar',
    })
  } catch (error) {
    console.error('Error generating recurring transactions:', error)
    return NextResponse.json(
      { error: 'Error al generar transacciones recurrentes' },
      { status: 500 }
    )
  }
}
