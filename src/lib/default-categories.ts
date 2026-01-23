// Categorias por defecto que se crean para cada nuevo usuario

export interface DefaultCategory {
  name: string
  icon: string
  color: string
  type: 'expense' | 'income'
}

export const DEFAULT_EXPENSE_CATEGORIES: DefaultCategory[] = [
  { name: 'Alimentacion', icon: '🍔', color: '#f97316', type: 'expense' },
  { name: 'Transporte', icon: '🚗', color: '#3b82f6', type: 'expense' },
  { name: 'Vivienda', icon: '🏠', color: '#8b5cf6', type: 'expense' },
  { name: 'Salud', icon: '💊', color: '#ef4444', type: 'expense' },
  { name: 'Entretenimiento', icon: '🎮', color: '#ec4899', type: 'expense' },
  { name: 'Compras', icon: '🛍️', color: '#14b8a6', type: 'expense' },
  { name: 'Servicios', icon: '💳', color: '#6366f1', type: 'expense' },
  { name: 'Pago Tarjeta', icon: '💰', color: '#10b981', type: 'expense' },
  { name: 'Otros', icon: '❓', color: '#6b7280', type: 'expense' },
]

export const DEFAULT_INCOME_CATEGORIES: DefaultCategory[] = [
  { name: 'Salario', icon: '💼', color: '#10b981', type: 'income' },
  { name: 'Bono', icon: '💰', color: '#22c55e', type: 'income' },
  { name: 'Regalo', icon: '🎁', color: '#84cc16', type: 'income' },
  { name: 'Otros ingresos', icon: '💸', color: '#a3e635', type: 'income' },
]

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_INCOME_CATEGORIES,
]
