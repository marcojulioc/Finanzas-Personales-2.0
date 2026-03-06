// Categorias - Sistema hibrido que soporta categorias estaticas (legacy) y dinamicas (DB)

import { db } from '@/lib/db'

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  type: 'expense' | 'income'
  isDefault?: boolean
}

// ============================================
// CATEGORIAS ESTATICAS (Legacy - para compatibilidad)
// ============================================

export const EXPENSE_CATEGORIES: Category[] = [
  { id: 'food', name: 'Alimentacion', icon: '🍔', color: '#d97757', type: 'expense' },
  { id: 'transport', name: 'Transporte', icon: '🚗', color: '#6a9bcc', type: 'expense' },
  { id: 'housing', name: 'Vivienda', icon: '🏠', color: '#8b7d6b', type: 'expense' },
  { id: 'health', name: 'Salud', icon: '💊', color: '#c4453c', type: 'expense' },
  { id: 'entertainment', name: 'Entretenimiento', icon: '🎮', color: '#c9923e', type: 'expense' },
  { id: 'shopping', name: 'Compras', icon: '🛍️', color: '#a67c6b', type: 'expense' },
  { id: 'services', name: 'Servicios', icon: '💳', color: '#5a87b5', type: 'expense' },
  { id: 'card_payment', name: 'Pago Tarjeta', icon: '💰', color: '#788c5d', type: 'expense' },
  { id: 'other_expense', name: 'Otros', icon: '❓', color: '#b0aea5', type: 'expense' },
]

export const INCOME_CATEGORIES: Category[] = [
  { id: 'salary', name: 'Salario', icon: '💼', color: '#788c5d', type: 'income' },
  { id: 'bonus', name: 'Bono', icon: '💰', color: '#9aad7e', type: 'income' },
  { id: 'gift', name: 'Regalo', icon: '🎁', color: '#6a9bcc', type: 'income' },
  { id: 'other_income', name: 'Otros ingresos', icon: '💸', color: '#c9923e', type: 'income' },
]

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]

// Mapping de IDs legacy a nombres (para migracion)
const LEGACY_ID_TO_NAME: Record<string, string> = {
  food: 'Alimentacion',
  transport: 'Transporte',
  housing: 'Vivienda',
  health: 'Salud',
  entertainment: 'Entretenimiento',
  shopping: 'Compras',
  services: 'Servicios',
  card_payment: 'Pago Tarjeta',
  other_expense: 'Otros',
  salary: 'Salario',
  bonus: 'Bono',
  gift: 'Regalo',
  other_income: 'Otros ingresos',
}

// ============================================
// FUNCIONES PARA CATEGORIAS ESTATICAS (Legacy)
// ============================================

export function getCategoryById(id: string): Category | undefined {
  // Primero buscar por ID exacto
  const byId = ALL_CATEGORIES.find((cat) => cat.id === id)
  if (byId) return byId

  // Si no se encuentra, buscar por nombre (para categorias de DB)
  const byName = ALL_CATEGORIES.find((cat) => cat.name === id)
  if (byName) return byName

  // Si aun no se encuentra, crear una categoria generica
  // Esto maneja categorias personalizadas que no estan en las estaticas
  return undefined
}

export function getCategoriesByType(type: 'expense' | 'income'): Category[] {
  return type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
}

// ============================================
// FUNCIONES PARA CATEGORIAS DE BASE DE DATOS
// ============================================

export async function getUserCategories(
  userId: string,
  type?: 'expense' | 'income'
): Promise<Category[]> {
  const where: {
    userId: string
    isActive: boolean
    type?: 'expense' | 'income'
  } = {
    userId,
    isActive: true,
  }

  if (type) {
    where.type = type
  }

  const categories = await db.category.findMany({
    where,
    orderBy: [
      { isDefault: 'desc' },
      { name: 'asc' },
    ],
  })

  return categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    icon: cat.icon,
    color: cat.color,
    type: cat.type as 'expense' | 'income',
    isDefault: cat.isDefault,
  }))
}

export async function getUserCategoryByName(
  userId: string,
  name: string
): Promise<Category | undefined> {
  // Convertir ID legacy a nombre si es necesario
  const categoryName = LEGACY_ID_TO_NAME[name] || name

  const category = await db.category.findFirst({
    where: {
      userId,
      name: categoryName,
      isActive: true,
    },
  })

  if (!category) {
    // Fallback a categorias estaticas
    return getCategoryById(name)
  }

  return {
    id: category.id,
    name: category.name,
    icon: category.icon,
    color: category.color,
    type: category.type as 'expense' | 'income',
    isDefault: category.isDefault,
  }
}

// Funcion para obtener informacion de categoria por nombre o ID
// Busca primero en DB del usuario, luego en estaticas
export async function resolveCategoryInfo(
  userId: string,
  categoryIdentifier: string
): Promise<Category | undefined> {
  // Primero intentar buscar en la DB del usuario
  const dbCategory = await getUserCategoryByName(userId, categoryIdentifier)
  if (dbCategory) return dbCategory

  // Si no existe en DB, buscar en estaticas (legacy)
  return getCategoryById(categoryIdentifier)
}

// Seed categories for new user
export async function seedUserCategories(userId: string): Promise<boolean> {
  const { DEFAULT_CATEGORIES } = await import('@/lib/default-categories')

  const existingCount = await db.category.count({
    where: { userId },
  })

  if (existingCount > 0) {
    return false
  }

  await db.category.createMany({
    data: DEFAULT_CATEGORIES.map((cat) => ({
      userId,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      type: cat.type,
      isDefault: true,
    })),
  })

  return true
}
