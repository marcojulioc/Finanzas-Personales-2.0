import { handlers } from '@/lib/auth';
import { withRateLimit } from './rate-limit';

export const GET = handlers.GET;
export const POST = withRateLimit(handlers.POST);
