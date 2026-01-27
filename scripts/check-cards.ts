import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Get all users with their cards
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      creditCards: {
        include: {
          balances: true,
        },
      },
    },
  })

  console.log('=== Users and their Credit Cards ===\n')

  for (const user of users) {
    console.log(`User: ${user.email} (${user.name})`)
    console.log(`  Cards: ${user.creditCards.length}`)

    for (const card of user.creditCards) {
      console.log(`    - ${card.name} (${card.bankName})`)
      console.log(`      ID: ${card.id}`)
      console.log(`      isActive: ${card.isActive}`)
      console.log(`      Balances: ${card.balances.length}`)
      for (const balance of card.balances) {
        console.log(`        ${balance.currency}: limit=${balance.creditLimit}, balance=${balance.balance}`)
      }
    }
    console.log('')
  }

  // Also check orphaned balances
  const allBalances = await prisma.creditCardBalance.findMany()
  console.log(`\n=== Total CreditCardBalance records: ${allBalances.length} ===`)

  const allCards = await prisma.creditCard.findMany()
  console.log(`=== Total CreditCard records: ${allCards.length} ===`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
