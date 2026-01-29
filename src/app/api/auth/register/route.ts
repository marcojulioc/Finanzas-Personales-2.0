import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { registerSchema } from '@/lib/validations'
import { seedUserCategories } from '@/lib/categories'
import { checkRateLimit, getClientIP } from '@/lib/rate-limit'

export async function POST(request: Request) {
  // Rate limiting: 5 attempts per minute
  const clientIP = getClientIP(request);
  const rateLimit = checkRateLimit(clientIP, 5, 60000);

  if (!rateLimit.success) {
    return NextResponse.json(
      {
        error: {
          code: 'RATE_LIMITED',
          message: 'Demasiados intentos. Por favor espera un momento.',
        }
      },
      {
        status: 429,
        headers: {
          'Retry-After': rateLimit.resetIn.toString(),
          'X-RateLimit-Remaining': '0',
        }
      }
    );
  }

  try {
    const body = await request.json()
    const validated = registerSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Datos inválidos',
            details: validated.error.flatten().fieldErrors,
          },
        },
        { status: 422 }
      )
    }

    const { name, email, password } = validated.data

    // Verificar si el email ya existe
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        {
          error: {
            code: 'EMAIL_EXISTS',
            message: 'Este email ya está registrado',
          },
        },
        { status: 409 }
      )
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 12)

    // Crear usuario
    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        onboardingCompleted: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        onboardingCompleted: true,
        createdAt: true,
      },
    })

    // Crear categorias por defecto para el usuario
    await seedUserCategories(user.id)

    return NextResponse.json(
      {
        data: user,
        message: 'Usuario creado exitosamente',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error en registro:', error)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error interno del servidor',
        },
      },
      { status: 500 }
    )
  }
}
