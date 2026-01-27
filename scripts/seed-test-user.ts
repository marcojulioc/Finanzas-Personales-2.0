import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = 'test@example.com'
  const password = 'Test1234!'
  const name = 'Usuario de Prueba'

  // Verificar si ya existe
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log('⚠️  Usuario de prueba ya existe')
    console.log(`   Email: ${email}`)
    console.log(`   Password: ${password}`)
    return
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12)

  // Crear usuario
  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
      onboardingCompleted: true,
      primaryCurrency: 'MXN',
      currencies: ['MXN', 'USD'],
    },
  })

  console.log('✅ Usuario de prueba creado:')
  console.log(`   Email: ${email}`)
  console.log(`   Password: ${password}`)
  console.log(`   ID: ${user.id}`)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
