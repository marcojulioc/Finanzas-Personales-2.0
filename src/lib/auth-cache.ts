import { cache } from 'react'
import { auth } from './auth'

/**
 * Cached version of auth() using React.cache()
 * This ensures auth() is only called once per request,
 * even if multiple components need the session.
 *
 * Use this instead of calling auth() directly in Server Components.
 */
export const getAuthSession = cache(async () => {
  return auth()
})

/**
 * Get the current user ID with caching
 * Returns null if not authenticated
 */
export const getCurrentUserId = cache(async () => {
  const session = await getAuthSession()
  return session?.user?.id ?? null
})

/**
 * Require authentication - throws redirect if not logged in
 * Use this in Server Components that require auth
 */
export const requireAuth = cache(async () => {
  const session = await getAuthSession()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }
  return session.user
})
