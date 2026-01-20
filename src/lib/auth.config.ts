import type { NextAuthConfig } from "next-auth"

export const authConfig = {
    pages: {
        signIn: '/login',
        newUser: '/onboarding',
    },
    session: {
        strategy: 'jwt',
    },
    trustHost: true,
    providers: [], // Providers added in auth.ts
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user
            const isOnDashboard = nextUrl.pathname.startsWith('/dashboard')
            if (isOnDashboard) {
                if (isLoggedIn) return true
                return false // Redirect unauthenticated users to login page
            }
            return true
        },
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id
                // Use the type assertion to access custom properties if not typed
                token.onboardingCompleted = (user as any).onboardingCompleted
            }
            if (trigger === 'update' && session?.onboardingCompleted !== undefined) {
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
} satisfies NextAuthConfig
