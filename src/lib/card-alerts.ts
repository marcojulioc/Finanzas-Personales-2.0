// Utilidades para alertas de tarjetas de crédito

export interface CardAlert {
  type: 'cutoff' | 'payment'
  cardName: string
  cardColor: string | null
  daysUntil: number
  day: number
}

export function getCardAlerts(cards: Array<{
  name: string
  color: string | null
  cutOffDay: number
  paymentDueDay: number
}>): CardAlert[] {
  const today = new Date()
  const currentDay = today.getDate()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()

  const alerts: CardAlert[] = []

  cards.forEach((card) => {
    // Calcular días hasta el corte
    let daysUntilCutoff = card.cutOffDay - currentDay
    if (daysUntilCutoff < 0) {
      daysUntilCutoff += daysInMonth
    }

    // Calcular días hasta el pago
    let daysUntilPayment = card.paymentDueDay - currentDay
    if (daysUntilPayment < 0) {
      daysUntilPayment += daysInMonth
    }

    // Agregar alerta si está dentro de los próximos 5 días
    if (daysUntilCutoff <= 5) {
      alerts.push({
        type: 'cutoff',
        cardName: card.name,
        cardColor: card.color,
        daysUntil: daysUntilCutoff,
        day: card.cutOffDay,
      })
    }

    if (daysUntilPayment <= 5) {
      alerts.push({
        type: 'payment',
        cardName: card.name,
        cardColor: card.color,
        daysUntil: daysUntilPayment,
        day: card.paymentDueDay,
      })
    }
  })

  // Ordenar por días hasta el evento
  return alerts.sort((a, b) => a.daysUntil - b.daysUntil)
}

export function formatAlertMessage(alert: CardAlert): string {
  const eventType = alert.type === 'cutoff' ? 'corte' : 'pago'

  if (alert.daysUntil === 0) {
    return `Hoy es día de ${eventType}`
  } else if (alert.daysUntil === 1) {
    return `Mañana es día de ${eventType}`
  } else {
    return `${eventType.charAt(0).toUpperCase() + eventType.slice(1)} en ${alert.daysUntil} días`
  }
}
