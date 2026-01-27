import { db } from '@/lib/db'
import { NotificationType } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { NOTIFICATION_TITLES } from './notification-constants'
import { getCategoryById } from './categories'
import { formatCurrency } from './utils'

// Obtener el inicio del dia actual (UTC) para verificar duplicados
function getStartOfDay(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
}

// Verificar si ya existe una notificacion similar del mismo dia
async function notificationExists(
  userId: string,
  type: NotificationType,
  dataKey: string,
  dataValue: string
): Promise<boolean> {
  const startOfDay = getStartOfDay()

  const existing = await db.notification.findFirst({
    where: {
      userId,
      type,
      createdAt: { gte: startOfDay },
      data: {
        path: [dataKey],
        equals: dataValue,
      },
    },
  })

  return !!existing
}

// Generar notificaciones de presupuestos excedidos o al limite
export async function generateBudgetNotifications(userId: string): Promise<void> {
  const now = new Date()
  const currentMonthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1))
  const nextMonthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1))

  // Obtener presupuestos del mes actual con categoría
  const budgets = await db.budget.findMany({
    where: { userId, month: currentMonthStart },
    include: { category: true },
  })

  if (budgets.length === 0) return

  // Obtener gastos del mes agrupados por categoria
  const expenses = await db.transaction.findMany({
    where: {
      userId,
      type: 'expense',
      date: { gte: currentMonthStart, lt: nextMonthStart },
    },
    select: { category: true, amount: true },
  })

  const spendingByCategory = expenses.reduce((acc, tx) => {
    const amount = new Decimal(tx.amount)
    const existing = acc[tx.category]
    if (existing) {
      acc[tx.category] = existing.plus(amount)
    } else {
      acc[tx.category] = amount
    }
    return acc
  }, {} as Record<string, Decimal>)

  for (const budget of budgets) {
    const spent = spendingByCategory[budget.category.name] || new Decimal(0)
    const percentage = spent.dividedBy(budget.amount).times(100).toNumber()
    const categoryName = budget.category.name

    if (percentage >= 100) {
      // Presupuesto excedido
      const exists = await notificationExists(userId, 'budget_exceeded', 'budgetId', budget.id)
      if (!exists) {
        await db.notification.create({
          data: {
            userId,
            type: 'budget_exceeded',
            title: NOTIFICATION_TITLES.budget_exceeded,
            message: `Has excedido tu presupuesto de ${categoryName} (${percentage.toFixed(0)}% gastado)`,
            data: { budgetId: budget.id, categoryId: budget.categoryId, percentage },
          },
        })
      }
    } else if (percentage >= 80) {
      // Presupuesto al limite (warning)
      const exists = await notificationExists(userId, 'budget_warning', 'budgetId', budget.id)
      if (!exists) {
        await db.notification.create({
          data: {
            userId,
            type: 'budget_warning',
            title: NOTIFICATION_TITLES.budget_warning,
            message: `Tu presupuesto de ${categoryName} esta al ${percentage.toFixed(0)}%`,
            data: { budgetId: budget.id, categoryId: budget.categoryId, percentage },
          },
        })
      }
    }
  }
}

// Generar notificaciones de tarjetas (corte y pago)
export async function generateCardNotifications(userId: string): Promise<void> {
  const cards = await db.creditCard.findMany({
    where: { userId, isActive: true },
    select: {
      id: true,
      name: true,
      cutOffDay: true,
      paymentDueDay: true,
    },
  })

  if (cards.length === 0) return

  const today = new Date()
  const currentDay = today.getDate()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()

  for (const card of cards) {
    // Calcular dias hasta el corte
    let daysUntilCutoff = card.cutOffDay - currentDay
    if (daysUntilCutoff < 0) {
      daysUntilCutoff += daysInMonth
    }

    // Calcular dias hasta el pago
    let daysUntilPayment = card.paymentDueDay - currentDay
    if (daysUntilPayment < 0) {
      daysUntilPayment += daysInMonth
    }

    // Notificacion de corte (dentro de 5 dias)
    if (daysUntilCutoff <= 5) {
      const exists = await notificationExists(userId, 'card_cutoff', 'cardId', card.id)
      if (!exists) {
        const dayText = daysUntilCutoff === 0
          ? 'Hoy'
          : daysUntilCutoff === 1
            ? 'Manana'
            : `En ${daysUntilCutoff} dias`

        await db.notification.create({
          data: {
            userId,
            type: 'card_cutoff',
            title: NOTIFICATION_TITLES.card_cutoff,
            message: `${dayText} es la fecha de corte de ${card.name}`,
            data: { cardId: card.id, cardName: card.name, daysUntil: daysUntilCutoff },
          },
        })
      }
    }

    // Notificacion de pago (dentro de 5 dias)
    if (daysUntilPayment <= 5) {
      const exists = await notificationExists(userId, 'card_payment', 'cardId', card.id)
      if (!exists) {
        const dayText = daysUntilPayment === 0
          ? 'Hoy'
          : daysUntilPayment === 1
            ? 'Manana'
            : `En ${daysUntilPayment} dias`

        await db.notification.create({
          data: {
            userId,
            type: 'card_payment',
            title: NOTIFICATION_TITLES.card_payment,
            message: `${dayText} vence el pago de ${card.name}`,
            data: { cardId: card.id, cardName: card.name, daysUntil: daysUntilPayment },
          },
        })
      }
    }
  }
}

// Generar notificaciones de transacciones recurrentes proximas
export async function generateRecurringNotifications(userId: string): Promise<void> {
  const today = new Date()
  const todayStart = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
  const threeDaysLater = new Date(todayStart)
  threeDaysLater.setDate(threeDaysLater.getDate() + 3)

  const upcomingRecurring = await db.recurringTransaction.findMany({
    where: {
      userId,
      isActive: true,
      nextDueDate: {
        gte: todayStart,
        lte: threeDaysLater,
      },
    },
    select: {
      id: true,
      category: true,
      amount: true,
      currency: true,
      type: true,
      nextDueDate: true,
      description: true,
    },
  })

  for (const recurring of upcomingRecurring) {
    const exists = await notificationExists(userId, 'recurring_upcoming', 'recurringId', recurring.id)
    if (!exists) {
      const category = getCategoryById(recurring.category)
      const categoryName = category?.name || recurring.category
      const amount = formatCurrency(Number(recurring.amount), recurring.currency)

      const nextDate = new Date(recurring.nextDueDate)
      const diffDays = Math.ceil((nextDate.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24))

      const dayText = diffDays === 0
        ? 'Hoy'
        : diffDays === 1
          ? 'Manana'
          : `En ${diffDays} dias`

      const typeText = recurring.type === 'income' ? 'ingreso' : 'gasto'

      await db.notification.create({
        data: {
          userId,
          type: 'recurring_upcoming',
          title: NOTIFICATION_TITLES.recurring_upcoming,
          message: `${dayText}: ${categoryName} - ${typeText} de ${amount}`,
          data: {
            recurringId: recurring.id,
            category: recurring.category,
            daysUntil: diffDays,
          },
        },
      })
    }
  }
}

// Limpiar notificaciones antiguas (mas de 7 dias)
export async function cleanOldNotifications(userId: string): Promise<void> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  await db.notification.deleteMany({
    where: {
      userId,
      createdAt: { lt: sevenDaysAgo },
    },
  })
}

// Ejecutar todas las generaciones de notificaciones
export async function generateAllNotifications(userId: string): Promise<void> {
  await Promise.all([
    generateBudgetNotifications(userId),
    generateCardNotifications(userId),
    generateRecurringNotifications(userId),
    cleanOldNotifications(userId),
  ])
}

// Obtener notificaciones del usuario
export async function getUserNotifications(
  userId: string,
  options?: { isRead?: boolean; limit?: number; offset?: number }
) {
  const where: { userId: string; isRead?: boolean } = { userId }

  if (options?.isRead !== undefined) {
    where.isRead = options.isRead
  }

  return db.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 50,
    skip: options?.offset || 0,
  })
}

// Contar notificaciones no leidas
export async function getUnreadCount(userId: string): Promise<number> {
  return db.notification.count({
    where: { userId, isRead: false },
  })
}

// Marcar notificaciones como leidas
export async function markNotificationsAsRead(
  userId: string,
  notificationIds?: string[]
): Promise<void> {
  if (notificationIds && notificationIds.length > 0) {
    await db.notification.updateMany({
      where: {
        userId,
        id: { in: notificationIds },
      },
      data: { isRead: true },
    })
  } else {
    // Marcar todas como leidas
    await db.notification.updateMany({
      where: { userId },
      data: { isRead: true },
    })
  }
}

// Eliminar una notificacion
export async function deleteNotification(userId: string, notificationId: string): Promise<void> {
  await db.notification.deleteMany({
    where: { userId, id: notificationId },
  })
}

// Eliminar todas las notificaciones leidas
export async function deleteReadNotifications(userId: string): Promise<void> {
  await db.notification.deleteMany({
    where: { userId, isRead: true },
  })
}
