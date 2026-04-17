import { NextRequest } from 'next/server'
import { auth } from './auth'

export type AuthResult =
  | { userId: string; via: 'mcp' }
  | { userId: string; via: 'session' }
  | null

export async function authenticateRequest(req: NextRequest): Promise<AuthResult> {
  const apiKey = req.headers.get('x-api-key')
  const configuredKey = process.env.INTERNAL_API_KEY
  const ownerUserId = process.env.OWNER_USER_ID

  if (apiKey && configuredKey && ownerUserId && apiKey === configuredKey) {
    return { userId: ownerUserId, via: 'mcp' }
  }

  const session = await auth()
  if (session?.user?.id) {
    return { userId: session.user.id, via: 'session' }
  }

  return null
}
