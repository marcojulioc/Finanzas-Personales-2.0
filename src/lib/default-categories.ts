// Categorias por defecto que se crean para cada nuevo usuario

export interface DefaultCategory {
  name: string
  icon: string
  color: string
  type: 'expense' | 'income'
}

export const DEFAULT_EXPENSE_CATEGORIES: DefaultCategory[] = [
  { name: 'Alimentacion', icon: '🍔', color: '#d97757', type: 'expense' },
  { name: 'Transporte', icon: '🚗', color: '#6a9bcc', type: 'expense' },
  { name: 'Vivienda', icon: '🏠', color: '#8b7d6b', type: 'expense' },
  { name: 'Salud', icon: '💊', color: '#c4453c', type: 'expense' },
  { name: 'Entretenimiento', icon: '🎮', color: '#c9923e', type: 'expense' },
  { name: 'Compras', icon: '🛍️', color: '#a67c6b', type: 'expense' },
  { name: 'Servicios', icon: '💳', color: '#5a87b5', type: 'expense' },
  { name: 'Pago Tarjeta', icon: '💰', color: '#788c5d', type: 'expense' },
  { name: 'Otros', icon: '❓', color: '#b0aea5', type: 'expense' },
]

export const DEFAULT_INCOME_CATEGORIES: DefaultCategory[] = [
  { name: 'Salario', icon: '💼', color: '#788c5d', type: 'income' },
  { name: 'Bono', icon: '💰', color: '#9aad7e', type: 'income' },
  { name: 'Regalo', icon: '🎁', color: '#6a9bcc', type: 'income' },
  { name: 'Otros ingresos', icon: '💸', color: '#c9923e', type: 'income' },
]

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_INCOME_CATEGORIES,
]
