import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const user = req.auth?.user

  const isAuthPage =
    nextUrl.pathname.startsWith('/login') ||
    nextUrl.pathname.startsWith('/register')
  const isOnboardingPage = nextUrl.pathname.startsWith('/onboarding')
  const isProtectedPage =
    nextUrl.pathname.startsWith('/dashboard') ||
    nextUrl.pathname.startsWith('/accounts') ||
    nextUrl.pathname.startsWith('/cards') ||
    nextUrl.pathname.startsWith('/transactions')
  const isApiRoute = nextUrl.pathname.startsWith('/api')
  const isPublicPage = nextUrl.pathname === '/'

  // No interferir con rutas de API
  if (isApiRoute) {
    return NextResponse.next()
  }

  // Redirigir usuarios logueados fuera de páginas de auth
  if (isLoggedIn && isAuthPage) {
    if (!user?.onboardingCompleted) {
      return NextResponse.redirect(new URL('/onboarding', nextUrl))
    }
    return NextResponse.redirect(new URL('/dashboard', nextUrl))
  }

  // Proteger rutas que requieren autenticación
  if (!isLoggedIn && (isProtectedPage || isOnboardingPage)) {
    const callbackUrl = encodeURIComponent(nextUrl.pathname)
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${callbackUrl}`, nextUrl)
    )
  }

  // Redirigir a onboarding si no lo ha completado
  if (isLoggedIn && isProtectedPage && !user?.onboardingCompleted) {
    return NextResponse.redirect(new URL('/onboarding', nextUrl))
  }

  // Redirigir a dashboard si ya completó onboarding
  if (isLoggedIn && isOnboardingPage && user?.onboardingCompleted) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)',
  ],
}
