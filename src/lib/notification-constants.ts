import {
  AlertTriangle,
  AlertCircle,
  Calendar,
  CreditCard,
  Repeat,
  LucideIcon,
} from 'lucide-react'
import { NotificationType } from '@prisma/client'

export const NOTIFICATION_ICONS: Record<NotificationType, LucideIcon> = {
  budget_exceeded: AlertTriangle,
  budget_warning: AlertCircle,
  card_cutoff: Calendar,
  card_payment: CreditCard,
  recurring_upcoming: Repeat,
}

export const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  budget_exceeded: 'text-danger',
  budget_warning: 'text-warning',
  card_cutoff: 'text-blue-500',
  card_payment: 'text-orange-500',
  recurring_upcoming: 'text-purple-500',
}

export const NOTIFICATION_BG_COLORS: Record<NotificationType, string> = {
  budget_exceeded: 'bg-danger/10',
  budget_warning: 'bg-warning/10',
  card_cutoff: 'bg-blue-500/10',
  card_payment: 'bg-orange-500/10',
  recurring_upcoming: 'bg-purple-500/10',
}

export const NOTIFICATION_TITLES: Record<NotificationType, string> = {
  budget_exceeded: 'Presupuesto excedido',
  budget_warning: 'Presupuesto al limite',
  card_cutoff: 'Fecha de corte proxima',
  card_payment: 'Fecha de pago proxima',
  recurring_upcoming: 'Pago recurrente proximo',
}

// Prioridad de notificaciones (menor = mayor prioridad)
export const NOTIFICATION_PRIORITY: Record<NotificationType, number> = {
  budget_exceeded: 1,
  card_payment: 2,
  card_cutoff: 3,
  budget_warning: 4,
  recurring_upcoming: 5,
}
