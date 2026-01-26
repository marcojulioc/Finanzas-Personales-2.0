import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { db } from './db'
import { loginSchema } from './validations'
import { authConfig } from './auth.config'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        console.log('=== LOGIN ATTEMPT ===')
        console.log('Credentials received:', { email: credentials?.email, hasPassword: !!credentials?.password })

        const validated = loginSchema.safeParse(credentials)

        if (!validated.success) {
          console.log('Validation failed:', validated.error.flatten())
          return null
        }

        const { email, password } = validated.data
        console.log('Validation passed, looking for user:', email)

        const user = await db.user.findUnique({
          where: { email },
        })

        if (!user || !user.password) {
          console.log('User not found or no password')
          return null
        }

        console.log('User found:', user.id)

        const passwordMatch = await bcrypt.compare(password, user.password)

        if (!passwordMatch) {
          console.log('Password mismatch')
          return null
        }

        console.log('Login successful!')
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          onboardingCompleted: user.onboardingCompleted,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // En login inicial, guardar datos del usuario
      if (user) {
        token.id = user.id
        token.onboardingCompleted = (user as any).onboardingCompleted ?? false
        console.log('JWT created for user:', user.id, 'onboarding:', token.onboardingCompleted)
      }

      // Si se está actualizando la sesión explícitamente
      if (trigger === 'update' && session?.onboardingCompleted !== undefined) {
        console.log('JWT Update Triggered:', session.onboardingCompleted)
        token.onboardingCompleted = session.onboardingCompleted
      }

      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.onboardingCompleted = token.onboardingCompleted as boolean
      }
      return session
    },
  },
})
