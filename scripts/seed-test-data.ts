/**
 * Script para crear datos de prueba para un usuario específico
 * Ejecutar con: npx tsx scripts/seed-test-data.ts
 */

import { PrismaClient, Currency, AccountType, TransactionType, RecurringFrequency } from '@prisma/client'

const prisma = new PrismaClient()

const TARGET_EMAIL = 'Marcojulioc@gmail.com' // Usuario existente - NO crear nuevo

// Colores para cuentas y tarjetas
const COLORS = {
  blue: '#3B82F6',
  green: '#10B981',
  purple: '#8B5CF6',
  orange: '#F97316',
  pink: '#EC4899',
  teal: '#14B8A6',
}

// Categorías de gastos
const EXPENSE_CATEGORIES = [
  { name: 'Alimentación', icon: '🍔', color: '#F97316' },
  { name: 'Transporte', icon: '🚗', color: '#3B82F6' },
  { name: 'Entretenimiento', icon: '🎬', color: '#8B5CF6' },
  { name: 'Salud', icon: '💊', color: '#10B981' },
  { name: 'Servicios', icon: '💡', color: '#F59E0B' },
  { name: 'Compras', icon: '🛍️', color: '#EC4899' },
  { name: 'Educación', icon: '📚', color: '#6366F1' },
  { name: 'Hogar', icon: '🏠', color: '#14B8A6' },
  { name: 'Suscripciones', icon: '📱', color: '#EF4444' },
  { name: 'Otros gastos', icon: '📦', color: '#6B7280' },
]

// Categorías de ingresos
const INCOME_CATEGORIES = [
  { name: 'Salario', icon: '💰', color: '#10B981' },
  { name: 'Freelance', icon: '💻', color: '#3B82F6' },
  { name: 'Inversiones', icon: '📈', color: '#8B5CF6' },
  { name: 'Otros ingresos', icon: '💵', color: '#6B7280' },
]

async function main() {
  console.log('🔍 Buscando usuario:', TARGET_EMAIL)

  // Buscar con el email exacto (case-sensitive en la DB)
  const user = await prisma.user.findUnique({
    where: { email: TARGET_EMAIL },
  })

  if (!user) {
    console.error('❌ Usuario no encontrado:', TARGET_EMAIL)
    console.log('Asegúrate de que el usuario esté registrado primero.')
    process.exit(1)
  }

  console.log('✅ Usuario encontrado:', user.name, '(ID:', user.id, ')')
  console.log('')
  console.log('🗑️  Eliminando datos existentes...')

  // Eliminar datos existentes en orden (por foreign keys)
  await prisma.notification.deleteMany({ where: { userId: user.id } })
  await prisma.budget.deleteMany({ where: { userId: user.id } })
  await prisma.transaction.deleteMany({ where: { userId: user.id } })
  await prisma.recurringTransaction.deleteMany({ where: { userId: user.id } })
  // CreditCardBalance se elimina automáticamente por cascade
  await prisma.creditCard.deleteMany({ where: { userId: user.id } })
  await prisma.bankAccount.deleteMany({ where: { userId: user.id } })
  await prisma.category.deleteMany({ where: { userId: user.id } })

  // Actualizar preferencias de moneda del usuario
  await prisma.user.update({
    where: { id: user.id },
    data: {
      primaryCurrency: Currency.MXN,
      currencies: [Currency.MXN, Currency.USD],
      onboardingCompleted: true,
    },
  })

  console.log('✅ Datos anteriores eliminados')
  console.log('')

  // ============================================
  // 1. CREAR CATEGORÍAS
  // ============================================
  console.log('📁 Creando categorías...')

  const categoryMap = new Map<string, string>()

  for (const cat of EXPENSE_CATEGORIES) {
    const created = await prisma.category.create({
      data: {
        userId: user.id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        type: TransactionType.expense,
        isDefault: true,
        isActive: true,
      },
    })
    categoryMap.set(cat.name, created.id)
  }

  for (const cat of INCOME_CATEGORIES) {
    const created = await prisma.category.create({
      data: {
        userId: user.id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        type: TransactionType.income,
        isDefault: true,
        isActive: true,
      },
    })
    categoryMap.set(cat.name, created.id)
  }

  console.log(`✅ ${EXPENSE_CATEGORIES.length + INCOME_CATEGORIES.length} categorías creadas`)

  // ============================================
  // 2. CREAR CUENTAS BANCARIAS
  // ============================================
  console.log('🏦 Creando cuentas bancarias...')

  const cuentaNomina = await prisma.bankAccount.create({
    data: {
      userId: user.id,
      name: 'Cuenta Nómina',
      bankName: 'BBVA',
      accountType: AccountType.checking,
      currency: Currency.MXN,
      balance: 45000.00,
      color: COLORS.blue,
      isActive: true,
    },
  })

  const cuentaAhorro = await prisma.bankAccount.create({
    data: {
      userId: user.id,
      name: 'Cuenta Ahorro',
      bankName: 'Nu',
      accountType: AccountType.savings,
      currency: Currency.MXN,
      balance: 120000.00,
      color: COLORS.purple,
      isActive: true,
    },
  })

  const cuentaUSD = await prisma.bankAccount.create({
    data: {
      userId: user.id,
      name: 'Cuenta Dólares',
      bankName: 'Banorte',
      accountType: AccountType.savings,
      currency: Currency.USD,
      balance: 2500.00,
      color: COLORS.green,
      isActive: true,
    },
  })

  console.log('✅ 3 cuentas bancarias creadas')

  // ============================================
  // 3. CREAR TARJETAS DE CRÉDITO
  // ============================================
  console.log('💳 Creando tarjetas de crédito...')

  const tarjetaBBVA = await prisma.creditCard.create({
    data: {
      userId: user.id,
      name: 'BBVA Azul',
      bankName: 'BBVA',
      cutOffDay: 15,
      paymentDueDay: 5,
      color: COLORS.blue,
      isActive: true,
      balances: {
        create: [
          {
            currency: Currency.MXN,
            creditLimit: 80000.00,
            balance: 12500.00,
          },
          {
            currency: Currency.USD,
            creditLimit: 2000.00,
            balance: 150.00,
          },
        ],
      },
    },
  })

  const tarjetaNu = await prisma.creditCard.create({
    data: {
      userId: user.id,
      name: 'Nu Card',
      bankName: 'Nu',
      cutOffDay: 20,
      paymentDueDay: 10,
      color: COLORS.purple,
      isActive: true,
      balances: {
        create: [
          {
            currency: Currency.MXN,
            creditLimit: 45000.00,
            balance: 8750.00,
          },
        ],
      },
    },
  })

  const tarjetaAmex = await prisma.creditCard.create({
    data: {
      userId: user.id,
      name: 'Amex Gold',
      bankName: 'American Express',
      cutOffDay: 25,
      paymentDueDay: 15,
      color: COLORS.orange,
      isActive: true,
      balances: {
        create: [
          {
            currency: Currency.MXN,
            creditLimit: 150000.00,
            balance: 25000.00,
          },
          {
            currency: Currency.USD,
            creditLimit: 5000.00,
            balance: 500.00,
          },
        ],
      },
    },
  })

  console.log('✅ 3 tarjetas de crédito creadas')

  // ============================================
  // 4. CREAR TRANSACCIONES (últimos 3 meses)
  // ============================================
  console.log('📊 Creando transacciones...')

  const today = new Date()
  const transactions: Array<{
    userId: string
    type: TransactionType
    amount: number
    currency: Currency
    category: string
    description: string
    date: Date
    bankAccountId?: string
    creditCardId?: string
  }> = []

  // Función para generar fecha aleatoria en un rango
  const randomDate = (start: Date, end: Date) => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  }

  // Generar transacciones para los últimos 3 meses
  for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
    const monthStart = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1)
    const monthEnd = new Date(today.getFullYear(), today.getMonth() - monthOffset + 1, 0)
    const effectiveEnd = monthEnd > today ? today : monthEnd

    // INGRESOS del mes
    // Salario (día 15)
    transactions.push({
      userId: user.id,
      type: TransactionType.income,
      amount: 65000,
      currency: Currency.MXN,
      category: 'Salario',
      description: 'Pago de nómina quincenal',
      date: new Date(monthStart.getFullYear(), monthStart.getMonth(), 15),
      bankAccountId: cuentaNomina.id,
    })

    // Salario (día 30)
    transactions.push({
      userId: user.id,
      type: TransactionType.income,
      amount: 65000,
      currency: Currency.MXN,
      category: 'Salario',
      description: 'Pago de nómina quincenal',
      date: new Date(monthStart.getFullYear(), monthStart.getMonth(), 28),
      bankAccountId: cuentaNomina.id,
    })

    // Freelance ocasional
    if (Math.random() > 0.5) {
      transactions.push({
        userId: user.id,
        type: TransactionType.income,
        amount: Math.floor(Math.random() * 15000) + 5000,
        currency: Currency.MXN,
        category: 'Freelance',
        description: 'Proyecto web freelance',
        date: randomDate(monthStart, effectiveEnd),
        bankAccountId: cuentaNomina.id,
      })
    }

    // GASTOS del mes
    // Alimentación (varios)
    for (let i = 0; i < 15 + Math.floor(Math.random() * 10); i++) {
      const descriptions = ['Supermercado', 'Restaurante', 'Uber Eats', 'Café', 'Comida rápida']
      transactions.push({
        userId: user.id,
        type: TransactionType.expense,
        amount: Math.floor(Math.random() * 800) + 100,
        currency: Currency.MXN,
        category: 'Alimentación',
        description: descriptions[Math.floor(Math.random() * descriptions.length)],
        date: randomDate(monthStart, effectiveEnd),
        creditCardId: Math.random() > 0.5 ? tarjetaBBVA.id : tarjetaNu.id,
      })
    }

    // Transporte
    for (let i = 0; i < 10 + Math.floor(Math.random() * 5); i++) {
      const descriptions = ['Uber', 'Gasolina', 'DiDi', 'Estacionamiento', 'Casetas']
      transactions.push({
        userId: user.id,
        type: TransactionType.expense,
        amount: Math.floor(Math.random() * 500) + 50,
        currency: Currency.MXN,
        category: 'Transporte',
        description: descriptions[Math.floor(Math.random() * descriptions.length)],
        date: randomDate(monthStart, effectiveEnd),
        bankAccountId: Math.random() > 0.3 ? cuentaNomina.id : undefined,
        creditCardId: Math.random() > 0.7 ? tarjetaNu.id : undefined,
      })
    }

    // Entretenimiento
    for (let i = 0; i < 3 + Math.floor(Math.random() * 4); i++) {
      const descriptions = ['Netflix', 'Spotify', 'Cine', 'Concierto', 'Videojuego']
      transactions.push({
        userId: user.id,
        type: TransactionType.expense,
        amount: Math.floor(Math.random() * 1500) + 150,
        currency: Currency.MXN,
        category: 'Entretenimiento',
        description: descriptions[Math.floor(Math.random() * descriptions.length)],
        date: randomDate(monthStart, effectiveEnd),
        creditCardId: tarjetaNu.id,
      })
    }

    // Servicios (mensuales)
    transactions.push({
      userId: user.id,
      type: TransactionType.expense,
      amount: 850,
      currency: Currency.MXN,
      category: 'Servicios',
      description: 'Internet Telmex',
      date: new Date(monthStart.getFullYear(), monthStart.getMonth(), 10),
      bankAccountId: cuentaNomina.id,
    })

    transactions.push({
      userId: user.id,
      type: TransactionType.expense,
      amount: 1200,
      currency: Currency.MXN,
      category: 'Servicios',
      description: 'Luz CFE',
      date: new Date(monthStart.getFullYear(), monthStart.getMonth(), 18),
      bankAccountId: cuentaNomina.id,
    })

    transactions.push({
      userId: user.id,
      type: TransactionType.expense,
      amount: 450,
      currency: Currency.MXN,
      category: 'Servicios',
      description: 'Agua',
      date: new Date(monthStart.getFullYear(), monthStart.getMonth(), 20),
      bankAccountId: cuentaNomina.id,
    })

    // Suscripciones
    transactions.push({
      userId: user.id,
      type: TransactionType.expense,
      amount: 229,
      currency: Currency.MXN,
      category: 'Suscripciones',
      description: 'Netflix',
      date: new Date(monthStart.getFullYear(), monthStart.getMonth(), 5),
      creditCardId: tarjetaNu.id,
    })

    transactions.push({
      userId: user.id,
      type: TransactionType.expense,
      amount: 115,
      currency: Currency.MXN,
      category: 'Suscripciones',
      description: 'Spotify',
      date: new Date(monthStart.getFullYear(), monthStart.getMonth(), 8),
      creditCardId: tarjetaNu.id,
    })

    transactions.push({
      userId: user.id,
      type: TransactionType.expense,
      amount: 179,
      currency: Currency.MXN,
      category: 'Suscripciones',
      description: 'iCloud',
      date: new Date(monthStart.getFullYear(), monthStart.getMonth(), 12),
      creditCardId: tarjetaBBVA.id,
    })

    // Compras ocasionales
    for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
      const descriptions = ['Amazon', 'Liverpool', 'Ropa', 'Electrónica', 'Mercado Libre']
      transactions.push({
        userId: user.id,
        type: TransactionType.expense,
        amount: Math.floor(Math.random() * 3000) + 500,
        currency: Currency.MXN,
        category: 'Compras',
        description: descriptions[Math.floor(Math.random() * descriptions.length)],
        date: randomDate(monthStart, effectiveEnd),
        creditCardId: Math.random() > 0.5 ? tarjetaAmex.id : tarjetaBBVA.id,
      })
    }

    // Salud ocasional
    if (Math.random() > 0.6) {
      transactions.push({
        userId: user.id,
        type: TransactionType.expense,
        amount: Math.floor(Math.random() * 2000) + 300,
        currency: Currency.MXN,
        category: 'Salud',
        description: Math.random() > 0.5 ? 'Farmacia' : 'Consulta médica',
        date: randomDate(monthStart, effectiveEnd),
        creditCardId: tarjetaBBVA.id,
      })
    }

    // Gasto en USD (solo algunos meses)
    if (Math.random() > 0.7) {
      transactions.push({
        userId: user.id,
        type: TransactionType.expense,
        amount: Math.floor(Math.random() * 200) + 50,
        currency: Currency.USD,
        category: 'Compras',
        description: 'Compra internacional',
        date: randomDate(monthStart, effectiveEnd),
        creditCardId: tarjetaAmex.id,
      })
    }
  }

  // Filtrar transacciones futuras
  const validTransactions = transactions.filter(t => t.date <= today)

  // Insertar transacciones
  for (const tx of validTransactions) {
    await prisma.transaction.create({
      data: {
        userId: tx.userId,
        type: tx.type,
        amount: tx.amount,
        currency: tx.currency,
        category: tx.category,
        description: tx.description,
        date: tx.date,
        bankAccountId: tx.bankAccountId || null,
        creditCardId: tx.creditCardId || null,
        isCardPayment: false,
      },
    })
  }

  console.log(`✅ ${validTransactions.length} transacciones creadas`)

  // ============================================
  // 5. CREAR PRESUPUESTOS (mes actual)
  // ============================================
  console.log('💰 Creando presupuestos...')

  // Usar UTC para consistencia con la API
  const currentMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))

  const budgetData = [
    { category: 'Alimentación', amount: 8000 },
    { category: 'Transporte', amount: 3000 },
    { category: 'Entretenimiento', amount: 2500 },
    { category: 'Servicios', amount: 3000 },
    { category: 'Compras', amount: 5000 },
    { category: 'Suscripciones', amount: 600 },
    { category: 'Salud', amount: 1500 },
  ]

  for (const budget of budgetData) {
    const categoryId = categoryMap.get(budget.category)
    if (categoryId) {
      await prisma.budget.create({
        data: {
          userId: user.id,
          categoryId: categoryId,
          amount: budget.amount,
          month: currentMonth,
        },
      })
    }
  }

  console.log(`✅ ${budgetData.length} presupuestos creados para ${currentMonth.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}`)

  // ============================================
  // 6. CREAR TRANSACCIONES RECURRENTES
  // ============================================
  console.log('🔄 Creando transacciones recurrentes...')

  // Nómina quincenal
  await prisma.recurringTransaction.create({
    data: {
      userId: user.id,
      type: TransactionType.income,
      amount: 65000,
      currency: Currency.MXN,
      category: 'Salario',
      description: 'Pago de nómina quincenal',
      frequency: RecurringFrequency.biweekly,
      startDate: new Date(today.getFullYear(), today.getMonth(), 15),
      nextDueDate: new Date(today.getFullYear(), today.getMonth() + 1, 15),
      bankAccountId: cuentaNomina.id,
      isActive: true,
    },
  })

  // Internet mensual
  await prisma.recurringTransaction.create({
    data: {
      userId: user.id,
      type: TransactionType.expense,
      amount: 850,
      currency: Currency.MXN,
      category: 'Servicios',
      description: 'Internet Telmex',
      frequency: RecurringFrequency.monthly,
      startDate: new Date(today.getFullYear(), today.getMonth(), 10),
      nextDueDate: new Date(today.getFullYear(), today.getMonth() + 1, 10),
      bankAccountId: cuentaNomina.id,
      isActive: true,
    },
  })

  // Netflix mensual
  await prisma.recurringTransaction.create({
    data: {
      userId: user.id,
      type: TransactionType.expense,
      amount: 229,
      currency: Currency.MXN,
      category: 'Suscripciones',
      description: 'Netflix',
      frequency: RecurringFrequency.monthly,
      startDate: new Date(today.getFullYear(), today.getMonth(), 5),
      nextDueDate: new Date(today.getFullYear(), today.getMonth() + 1, 5),
      creditCardId: tarjetaNu.id,
      isActive: true,
    },
  })

  // Spotify mensual
  await prisma.recurringTransaction.create({
    data: {
      userId: user.id,
      type: TransactionType.expense,
      amount: 115,
      currency: Currency.MXN,
      category: 'Suscripciones',
      description: 'Spotify',
      frequency: RecurringFrequency.monthly,
      startDate: new Date(today.getFullYear(), today.getMonth(), 8),
      nextDueDate: new Date(today.getFullYear(), today.getMonth() + 1, 8),
      creditCardId: tarjetaNu.id,
      isActive: true,
    },
  })

  // Gym mensual
  await prisma.recurringTransaction.create({
    data: {
      userId: user.id,
      type: TransactionType.expense,
      amount: 899,
      currency: Currency.MXN,
      category: 'Salud',
      description: 'Membresía Smart Fit',
      frequency: RecurringFrequency.monthly,
      startDate: new Date(today.getFullYear(), today.getMonth(), 1),
      nextDueDate: new Date(today.getFullYear(), today.getMonth() + 1, 1),
      creditCardId: tarjetaBBVA.id,
      isActive: true,
    },
  })

  console.log('✅ 5 transacciones recurrentes creadas')

  // ============================================
  // RESUMEN FINAL
  // ============================================
  console.log('')
  console.log('=' .repeat(50))
  console.log('✅ DATOS DE PRUEBA CREADOS EXITOSAMENTE')
  console.log('=' .repeat(50))
  console.log('')
  console.log('👤 Usuario:', user.name)
  console.log('📧 Email:', user.email)
  console.log('')
  console.log('📊 Resumen de datos creados:')
  console.log('   • Categorías:', EXPENSE_CATEGORIES.length + INCOME_CATEGORIES.length)
  console.log('   • Cuentas bancarias: 3')
  console.log('   • Tarjetas de crédito: 3')
  console.log('   • Transacciones:', validTransactions.length)
  console.log('   • Presupuestos:', budgetData.length)
  console.log('   • Transacciones recurrentes: 5')
  console.log('')
  console.log('💰 Balances:')
  console.log('   • Cuenta Nómina (BBVA): $45,000 MXN')
  console.log('   • Cuenta Ahorro (Nu): $120,000 MXN')
  console.log('   • Cuenta Dólares (Banorte): $2,500 USD')
  console.log('')
  console.log('💳 Deudas en tarjetas:')
  console.log('   • BBVA Azul: $12,500 MXN + $150 USD')
  console.log('   • Nu Card: $8,750 MXN')
  console.log('   • Amex Gold: $25,000 MXN + $500 USD')
  console.log('')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
