import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

export function withRateLimit(
  handler: (req: NextRequest) => Promise<Response>
) {
  return async (req: NextRequest): Promise<Response> => {
    // Only rate limit POST requests (login attempts)
    if (req.method === 'POST') {
      const clientIP = getClientIP(req);
      const rateLimit = checkRateLimit(clientIP, 10, 60000); // 10 attempts per minute

      if (!rateLimit.success) {
        return NextResponse.json(
          { error: 'Too many login attempts. Please wait.' },
          {
            status: 429,
            headers: { 'Retry-After': rateLimit.resetIn.toString() }
          }
        );
      }
    }

    return handler(req);
  };
}
