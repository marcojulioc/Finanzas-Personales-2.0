import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true }
  })

  console.log('Usuarios en la base de datos:')
  if (users.length === 0) {
    console.log('  (No hay usuarios)')
  } else {
    users.forEach(u => {
      console.log(`  - Email: "${u.email}" | Nombre: ${u.name} | ID: ${u.id}`)
    })
  }
}

main()
  .finally(() => prisma.$disconnect())
