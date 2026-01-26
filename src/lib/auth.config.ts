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
} satisfies NextAuthConfig
