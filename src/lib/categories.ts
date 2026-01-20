// Categorías predefinidas según el PRD

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  type: 'expense' | 'income'
}

export const EXPENSE_CATEGORIES: Category[] = [
  { id: 'food', name: 'Alimentación', icon: '🍔', color: '#f97316', type: 'expense' },
  { id: 'transport', name: 'Transporte', icon: '🚗', color: '#3b82f6', type: 'expense' },
  { id: 'housing', name: 'Vivienda', icon: '🏠', color: '#8b5cf6', type: 'expense' },
  { id: 'health', name: 'Salud', icon: '💊', color: '#ef4444', type: 'expense' },
  { id: 'entertainment', name: 'Entretenimiento', icon: '🎮', color: '#ec4899', type: 'expense' },
  { id: 'shopping', name: 'Compras', icon: '🛍️', color: '#14b8a6', type: 'expense' },
  { id: 'services', name: 'Servicios', icon: '💳', color: '#6366f1', type: 'expense' },
  { id: 'card_payment', name: 'Pago Tarjeta', icon: '💰', color: '#10b981', type: 'expense' },
  { id: 'other_expense', name: 'Otros', icon: '❓', color: '#6b7280', type: 'expense' },
]

export const INCOME_CATEGORIES: Category[] = [
  { id: 'salary', name: 'Salario', icon: '💼', color: '#10b981', type: 'income' },
  { id: 'bonus', name: 'Bono', icon: '💰', color: '#22c55e', type: 'income' },
  { id: 'gift', name: 'Regalo', icon: '🎁', color: '#84cc16', type: 'income' },
  { id: 'other_income', name: 'Otros ingresos', icon: '💸', color: '#a3e635', type: 'income' },
]

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]

export function getCategoryById(id: string): Category | undefined {
  return ALL_CATEGORIES.find((cat) => cat.id === id)
}

export function getCategoriesByType(type: 'expense' | 'income'): Category[] {
  return type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
}
