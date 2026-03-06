import { handlers } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

export const GET = handlers.GET;

export async function POST(req: NextRequest): Promise<Response> {
  // Only rate limit credential login attempts.
  // NextAuth v5 routes credential logins through:
  //   POST /api/auth/callback/credentials
  // which means the URL path will contain "callback/credentials".
  const url = req.nextUrl?.pathname ?? '';
  const isCredentialLogin = url.includes('callback/credentials');

  if (isCredentialLogin) {
    const clientIP = getClientIP(req);
    // 10 attempts per 5 minutes — more generous than registration since typos happen
    const rateLimit = checkRateLimit(`login:${clientIP}`, 10, 5 * 60 * 1000);

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: 'Demasiados intentos de inicio de sesión. Por favor espera antes de intentar de nuevo.',
          resetIn: rateLimit.resetIn,
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimit.resetIn.toString(),
          },
        }
      );
    }
  }

  return handlers.POST(req);
}
