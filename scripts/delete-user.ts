import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const emailToDelete = 'marcojulioc@gmail.com' // lowercase duplicate

  console.log('Eliminando usuario:', emailToDelete)

  try {
    // El schema tiene onDelete: Cascade, así que debería eliminar todo
    const deleted = await prisma.user.delete({
      where: { email: emailToDelete }
    })
    console.log('✅ Usuario eliminado:', deleted.name)
  } catch (error: any) {
    console.log('Error:', error.message)
  }

  // Verificar
  const remaining = await prisma.user.findMany({
    select: { email: true, name: true }
  })
  console.log('\nUsuarios restantes:')
  remaining.forEach(u => console.log('  -', u.email, '|', u.name))
}

main().finally(() => prisma.$disconnect())
