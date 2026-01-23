// Client-safe constants for recurring transactions

export const FREQUENCY_LABELS = {
  daily: 'Diario',
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  yearly: 'Anual',
} as const

export type RecurringFrequencyType = keyof typeof FREQUENCY_LABELS
