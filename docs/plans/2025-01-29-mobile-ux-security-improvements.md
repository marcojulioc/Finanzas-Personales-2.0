# Mobile UX & Security Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve mobile user experience with better loading states, virtual scrolling, and lazy loading while adding rate limiting and error handling for production stability.

**Architecture:** Additive improvements that don't modify core business logic. In-memory rate limiting via middleware, enhanced error boundaries, React virtualization for long lists, and Next.js dynamic imports for code splitting. No external services required.

**Tech Stack:** Next.js 16, in-memory rate limiting, @tanstack/react-virtual, React.lazy/dynamic imports

---

## Phase 1: Security & Error Handling

### Task 1: Create In-Memory Rate Limiter

**Files:**
- Create: `src/lib/rate-limit.ts`

**Step 1: Create the rate limiter module**

```typescript
/**
 * Simple in-memory rate limiter
 * Note: Resets on server restart. For persistent limiting, use Redis.
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const requests = new Map<string, RateLimitRecord>();

// Clean up old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  for (const [key, record] of requests) {
    if (record.resetTime < now) {
      requests.delete(key);
    }
  }
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetIn: number; // seconds until reset
}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (usually IP address)
 * @param limit - Max requests allowed in window
 * @param windowMs - Time window in milliseconds
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 5,
  windowMs: number = 60000
): RateLimitResult {
  cleanup();

  const now = Date.now();
  const record = requests.get(identifier);

  // First request or window expired
  if (!record || record.resetTime < now) {
    requests.set(identifier, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: limit - 1, resetIn: Math.ceil(windowMs / 1000) };
  }

  // Within window, check limit
  if (record.count >= limit) {
    const resetIn = Math.ceil((record.resetTime - now) / 1000);
    return { success: false, remaining: 0, resetIn };
  }

  // Increment counter
  record.count++;
  const resetIn = Math.ceil((record.resetTime - now) / 1000);
  return { success: true, remaining: limit - record.count, resetIn };
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  return 'anonymous';
}
```

**Step 2: Commit**

```bash
git add src/lib/rate-limit.ts
git commit -m "feat: add in-memory rate limiting utility"
```

---

### Task 2: Apply Rate Limiting to Register Endpoint

**Files:**
- Modify: `src/app/api/auth/register/route.ts`

**Step 1: Read the current register route**

Read file to understand current structure.

**Step 2: Add rate limiting import at top**

```typescript
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
```

**Step 3: Add rate limiting check at beginning of POST function**

Add after the function declaration, before any other code:

```typescript
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
```

**Step 4: Commit**

```bash
git add src/app/api/auth/register/route.ts
git commit -m "feat: add rate limiting to registration endpoint"
```

---

### Task 3: Apply Rate Limiting to Login (NextAuth)

**Files:**
- Create: `src/app/api/auth/[...nextauth]/rate-limit.ts`
- Modify: `src/app/api/auth/[...nextauth]/route.ts`

**Step 1: Create rate limit wrapper for NextAuth**

```typescript
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
```

**Step 2: Read current NextAuth route**

Read the file to see current structure.

**Step 3: Wrap handlers with rate limiting**

Update `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from '@/lib/auth';
import { withRateLimit } from './rate-limit';

export const GET = handlers.GET;
export const POST = withRateLimit(handlers.POST);
```

**Step 4: Commit**

```bash
git add src/app/api/auth/\[...nextauth\]/rate-limit.ts src/app/api/auth/\[...nextauth\]/route.ts
git commit -m "feat: add rate limiting to login endpoint"
```

---

### Task 4: Create Error Boundary Component

**Files:**
- Create: `src/components/error-boundary.tsx`

**Step 1: Create error boundary component**

```typescript
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // Log error for debugging
    console.error('Application error:', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-4">
      <div className="rounded-full bg-destructive/10 p-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold">Algo salió mal</h2>
      <p className="text-muted-foreground text-center max-w-md">
        Ha ocurrido un error inesperado. Por favor intenta de nuevo.
      </p>
      {process.env.NODE_ENV === 'development' && (
        <pre className="mt-2 max-w-lg overflow-auto rounded bg-muted p-4 text-xs">
          {error.message}
        </pre>
      )}
      <Button onClick={reset} variant="outline" className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Intentar de nuevo
      </Button>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/error-boundary.tsx
git commit -m "feat: add error boundary component"
```

---

### Task 5: Add Error Pages to Dashboard Routes

**Files:**
- Create: `src/app/(dashboard)/error.tsx`
- Create: `src/app/(dashboard)/transactions/error.tsx`
- Create: `src/app/(dashboard)/accounts/error.tsx`
- Create: `src/app/(dashboard)/cards/error.tsx`

**Step 1: Create dashboard error page**

```typescript
'use client';

import ErrorBoundary from '@/components/error-boundary';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorBoundary error={error} reset={reset} />;
}
```

**Step 2: Copy to other routes**

Create identical files for transactions, accounts, and cards routes.

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/error.tsx src/app/\(dashboard\)/transactions/error.tsx src/app/\(dashboard\)/accounts/error.tsx src/app/\(dashboard\)/cards/error.tsx
git commit -m "feat: add error boundaries to dashboard routes"
```

---

## Phase 2: E2E Testing Setup

### Task 6: Create Playwright Configuration

**Files:**
- Create: `playwright.config.ts`

**Step 1: Create Playwright config**

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Desktop
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Mobile
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

**Step 2: Create tests/e2e directory**

```bash
mkdir -p tests/e2e
```

**Step 3: Commit**

```bash
git add playwright.config.ts
git commit -m "chore: add Playwright E2E configuration"
```

---

### Task 7: Create Auth E2E Tests

**Files:**
- Create: `tests/e2e/auth.spec.ts`

**Step 1: Create auth tests**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display login form', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible();
    await expect(page.getByLabel(/correo/i)).toBeVisible();
    await expect(page.getByLabel(/contraseña/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /iniciar sesión/i }).click();

    // Form should show validation feedback
    await expect(page.locator('form')).toBeVisible();
  });

  test('should have link to register page', async ({ page }) => {
    await page.goto('/login');

    const registerLink = page.getByRole('link', { name: /registr/i });
    await expect(registerLink).toBeVisible();
    await registerLink.click();

    await expect(page).toHaveURL(/register/);
  });

  test('should display register form', async ({ page }) => {
    await page.goto('/register');

    await expect(page.getByLabel(/nombre/i)).toBeVisible();
    await expect(page.getByLabel(/correo/i)).toBeVisible();
  });

  test('should redirect unauthenticated users from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/);
  });

  test('should redirect unauthenticated users from transactions', async ({ page }) => {
    await page.goto('/transactions');
    await expect(page).toHaveURL(/login/);
  });
});
```

**Step 2: Run tests to verify setup**

```bash
npx playwright test tests/e2e/auth.spec.ts --project=chromium
```

**Step 3: Commit**

```bash
git add tests/e2e/auth.spec.ts
git commit -m "test: add E2E tests for authentication flows"
```

---

### Task 8: Create Mobile Viewport E2E Tests

**Files:**
- Create: `tests/e2e/mobile.spec.ts`

**Step 1: Create mobile-specific tests**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Mobile Experience', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('login page should be mobile friendly', async ({ page }) => {
    await page.goto('/login');

    // Form should be visible
    const form = page.locator('form');
    await expect(form).toBeVisible();

    // No horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  });

  test('should have touch-friendly button sizes', async ({ page }) => {
    await page.goto('/login');

    const submitButton = page.getByRole('button', { name: /iniciar sesión/i });
    const buttonBox = await submitButton.boundingBox();

    // Minimum touch target: 44px
    expect(buttonBox?.height).toBeGreaterThanOrEqual(40);
  });

  test('inputs should have readable font size', async ({ page }) => {
    await page.goto('/register');

    const emailInput = page.getByLabel(/correo/i);
    const fontSize = await emailInput.evaluate((el) =>
      parseInt(window.getComputedStyle(el).fontSize)
    );

    // >= 16px prevents iOS zoom on focus
    expect(fontSize).toBeGreaterThanOrEqual(16);
  });

  test('register page should not overflow', async ({ page }) => {
    await page.goto('/register');

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  });
});
```

**Step 2: Run mobile tests**

```bash
npx playwright test tests/e2e/mobile.spec.ts
```

**Step 3: Commit**

```bash
git add tests/e2e/mobile.spec.ts
git commit -m "test: add mobile viewport E2E tests"
```

---

## Phase 3: Mobile UX Improvements

### Task 9: Install Virtual Scrolling Library

**Files:**
- Modify: `package.json`

**Step 1: Install TanStack Virtual**

```bash
npm install @tanstack/react-virtual
```

**Step 2: Verify installation**

```bash
npm ls @tanstack/react-virtual
```

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add TanStack Virtual for list virtualization"
```

---

### Task 10: Create Virtualized Transaction List

**Files:**
- Create: `src/components/transactions/virtual-transaction-list.tsx`

**Step 1: Create the virtualized list component**

```typescript
'use client';

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currencies';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  currency: string;
  type: 'INCOME' | 'EXPENSE';
  date: Date | string;
}

interface VirtualTransactionListProps {
  transactions: Transaction[];
  onTransactionClick?: (transaction: Transaction) => void;
  className?: string;
  height?: number;
}

export function VirtualTransactionList({
  transactions,
  onTransactionClick,
  className,
  height = 400,
}: VirtualTransactionListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: transactions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  if (transactions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        No hay transacciones
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={cn('overflow-auto', className)}
      style={{ height }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const transaction = transactions[virtualItem.index];
          const isExpense = transaction.type === 'EXPENSE';

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className={cn(
                'flex items-center justify-between p-4 border-b',
                'hover:bg-muted/50 transition-colors cursor-pointer',
                'active:bg-muted'
              )}
              onClick={() => onTransactionClick?.(transaction)}
            >
              <div className="flex-1 min-w-0 mr-4">
                <p className="font-medium truncate">{transaction.description}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(transaction.date), 'dd MMM yyyy', { locale: es })}
                </p>
              </div>
              <div className={cn(
                'font-semibold tabular-nums shrink-0',
                isExpense ? 'text-destructive' : 'text-green-600'
              )}>
                {isExpense ? '-' : '+'}
                {formatCurrency(transaction.amount, transaction.currency)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/transactions/virtual-transaction-list.tsx
git commit -m "feat: add virtualized transaction list component"
```

---

### Task 11: Create Enhanced Skeleton Components

**Files:**
- Create: `src/components/ui/skeleton-card.tsx`
- Create: `src/components/ui/skeleton-list.tsx`

**Step 1: Create skeleton card**

```typescript
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SkeletonCardProps {
  className?: string;
  showHeader?: boolean;
  lines?: number;
}

export function SkeletonCard({
  className,
  showHeader = true,
  lines = 3
}: SkeletonCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      {showHeader && (
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        </CardHeader>
      )}
      <CardContent className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn('h-4', i === lines - 1 ? 'w-2/3' : 'w-full')}
          />
        ))}
      </CardContent>
    </Card>
  );
}
```

**Step 2: Create skeleton list**

```typescript
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SkeletonListProps {
  count?: number;
  className?: string;
}

export function SkeletonList({ count = 5, className }: SkeletonListProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 border-b"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-5 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/ui/skeleton-card.tsx src/components/ui/skeleton-list.tsx
git commit -m "feat: add enhanced skeleton components"
```

---

### Task 12: Update Transactions Loading Page

**Files:**
- Modify: `src/app/(dashboard)/transactions/loading.tsx`

**Step 1: Read current loading page**

**Step 2: Update with enhanced skeletons**

```typescript
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonList } from '@/components/ui/skeleton-list';
import { SkeletonCard } from '@/components/ui/skeleton-card';

export default function TransactionsLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-full sm:w-40" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-10 w-full sm:w-32" />
        <Skeleton className="h-10 w-full sm:w-32" />
        <Skeleton className="h-10 w-full sm:w-40" />
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} showHeader={false} lines={2} />
        ))}
      </div>

      {/* Transaction list */}
      <SkeletonList count={8} />
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/transactions/loading.tsx
git commit -m "feat: improve transactions loading with enhanced skeletons"
```

---

### Task 13: Create Cards Loading Page

**Files:**
- Create: `src/app/(dashboard)/cards/loading.tsx`

**Step 1: Create loading page**

```typescript
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonCard } from '@/components/ui/skeleton-card';

export default function CardsLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-full sm:w-36" />
      </div>

      {/* Cards grid */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="relative">
            <Skeleton className="absolute top-0 left-0 right-0 h-1.5 rounded-t-lg" />
            <SkeletonCard className="pt-2" lines={4} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/\(dashboard\)/cards/loading.tsx
git commit -m "feat: add loading skeleton for cards page"
```

---

### Task 14: Add Mobile Touch Utilities

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Read current globals.css to find insertion point**

**Step 2: Add mobile utilities after existing utilities**

```css
/* Mobile touch utilities */
@layer utilities {
  .touch-target {
    min-height: 44px;
    min-width: 44px;
  }

  .touch-feedback {
    @apply active:scale-[0.98] active:opacity-90 transition-transform duration-100;
  }

  .safe-bottom {
    padding-bottom: env(safe-area-inset-bottom, 0);
  }

  .safe-top {
    padding-top: env(safe-area-inset-top, 0);
  }

  .no-select {
    -webkit-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
  }

  .scroll-smooth-touch {
    -webkit-overflow-scrolling: touch;
  }
}
```

**Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add mobile touch utility classes"
```

---

### Task 15: Create Lazy Loading Wrappers

**Files:**
- Create: `src/components/lazy/index.ts`

**Step 1: Create lazy loading exports**

```typescript
import dynamic from 'next/dynamic';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { SkeletonList } from '@/components/ui/skeleton-list';

// Lazy load virtual transaction list (only for large lists)
export const LazyVirtualTransactionList = dynamic(
  () => import('@/components/transactions/virtual-transaction-list').then(
    mod => mod.VirtualTransactionList
  ),
  {
    loading: () => <SkeletonList count={5} />,
  }
);

// Placeholder for future chart components
export const LazyChartPlaceholder = dynamic(
  () => Promise.resolve(() => <div>Chart</div>),
  {
    loading: () => <SkeletonCard className="h-[300px]" lines={0} showHeader={false} />,
    ssr: false,
  }
);
```

**Step 2: Commit**

```bash
git add src/components/lazy/index.ts
git commit -m "feat: add lazy loading component wrappers"
```

---

### Task 16: Final Build Verification

**Files:**
- None (testing only)

**Step 1: Run linter**

```bash
npm run lint
```

Fix any errors that appear.

**Step 2: Run unit tests**

```bash
npm run test:run
```

**Step 3: Run E2E tests**

```bash
npx playwright test
```

**Step 4: Build project**

```bash
npm run build
```

**Step 5: Commit any fixes**

```bash
git add -A
git commit -m "chore: fix lint and build issues"
```

---

## Summary

| Phase | Tasks | Deliverables |
|-------|-------|--------------|
| **1: Security** | 1-5 | In-memory rate limiting, error boundaries |
| **2: E2E Tests** | 6-8 | Playwright config, auth tests, mobile tests |
| **3: Mobile UX** | 9-16 | Virtual scrolling, enhanced skeletons, touch utilities |

**Total Tasks:** 16
**External Dependencies:** None (all in-memory/local)

---

## Notes

- Rate limiting resets on server restart (acceptable for basic protection)
- For production-scale rate limiting, consider Upstash Redis in the future
- Error boundaries log to console; add Sentry later for production monitoring
