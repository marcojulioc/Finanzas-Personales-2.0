import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('Test1234', 10)

  const user = await db.user.upsert({
    where: { email: 'demo@test.com' },
    update: {},
    create: {
      email: 'demo@test.com',
      name: 'Usuario Demo',
      password: hashedPassword,
      onboardingCompleted: true,
      bankAccounts: {
        create: [
          {
            name: 'Cuenta Nomina',
            bankName: 'BBVA',
            accountType: 'checking',
            currency: 'MXN',
            balance: 25000,
            color: '#0d9488',
          },
          {
            name: 'Ahorro',
            bankName: 'Nu',
            accountType: 'savings',
            currency: 'MXN',
            balance: 50000,
            color: '#8b5cf6',
          },
        ],
      },
      creditCards: {
        create: [
          {
            name: 'Visa Oro',
            bankName: 'Santander',
            cutOffDay: 15,
            paymentDueDay: 5,
            currency: 'MXN',
            creditLimit: 80000,
            balance: 12500,
            color: '#f97316',
          },
        ],
      },
    },
  })

  // Crear algunas transacciones de ejemplo
  const accounts = await db.bankAccount.findMany({
    where: { userId: user.id },
  })

  const card = await db.creditCard.findFirst({
    where: { userId: user.id },
  })

  const firstAccount = accounts[0]
  if (firstAccount) {
    await db.transaction.createMany({
      data: [
        {
          userId: user.id,
          bankAccountId: firstAccount.id,
          type: 'income',
          amount: 35000,
          currency: 'MXN',
          category: 'salary',
          description: 'Salario quincenal',
          date: new Date('2026-01-15'),
        },
        {
          userId: user.id,
          bankAccountId: firstAccount.id,
          type: 'expense',
          amount: 1500,
          currency: 'MXN',
          category: 'food',
          description: 'Despensa semanal',
          date: new Date('2026-01-18'),
        },
        {
          userId: user.id,
          bankAccountId: firstAccount.id,
          type: 'expense',
          amount: 800,
          currency: 'MXN',
          category: 'transport',
          description: 'Gasolina',
          date: new Date('2026-01-19'),
        },
        {
          userId: user.id,
          creditCardId: card?.id,
          type: 'expense',
          amount: 2500,
          currency: 'MXN',
          category: 'entertainment',
          description: 'Cena restaurante',
          date: new Date('2026-01-17'),
        },
        {
          userId: user.id,
          creditCardId: card?.id,
          type: 'expense',
          amount: 4500,
          currency: 'MXN',
          category: 'shopping',
          description: 'Ropa',
          date: new Date('2026-01-16'),
        },
      ],
    })
  }

  console.log('Usuario demo creado exitosamente!')
  console.log('Email: demo@test.com')
  console.log('Password: Test1234')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
