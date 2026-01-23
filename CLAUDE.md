# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev              # Start development server (port 3000)
npm run build            # Build for production
npm run lint             # Run ESLint
npm test                 # Run tests in watch mode (Vitest)
npm run test:run         # Run tests once
npm run test:coverage    # Run tests with coverage
npm run test:e2e         # Run Playwright E2E tests
npm run test:e2e:ui      # Run E2E tests with interactive UI
```

### Database Commands
```bash
npx prisma migrate dev   # Run migrations in development
npx prisma studio        # Open Prisma GUI for data management
npx prisma db push       # Sync schema without migration files
```

## Tech Stack

- **Next.js 16** (App Router, React 19, Turbopack)
- **Prisma 6** with PostgreSQL
- **NextAuth.js 5** (Credentials + Google OAuth, JWT sessions)
- **Tailwind CSS 4** with shadcn/ui components
- **Zod** for validation, **React Hook Form** for forms
- **Vitest** for unit/integration tests, **Playwright** for E2E
- **PWA** enabled with @ducanh2912/next-pwa

## Architecture Overview

### Route Structure
- `src/app/(auth)/` - Login and register pages (public)
- `src/app/(dashboard)/` - Protected routes with shared layout
- `src/app/api/` - REST API routes (all require authentication)
- `src/app/onboarding/` - Post-registration onboarding flow (4 steps)

### Key Patterns

**Authentication**: Middleware at `src/middleware.ts` protects routes. All API routes check session via `auth()` from NextAuth. Users must complete onboarding before accessing dashboard.

**API Design**: RESTful endpoints with Zod validation. Responses use `{ data: ... }` or `{ error: ..., details: ... }` format. HTTP codes: 401 (unauthorized), 422 (validation), 500 (server error).

**Category System**: Hybrid approach with legacy static categories + user-created custom categories in database. Categories seeded on first access via `/api/categories/seed`.

**Multi-Currency**: Supports 28 currencies. Credit cards track separate MXN/USD limits and balances. Transactions store currency per record.

**Recurring Transactions**: Frequencies: daily, weekly, biweekly, monthly, yearly. System generates actual Transaction records based on recurrence rules.

### Core Libraries
- `src/lib/auth.ts` - NextAuth configuration with providers
- `src/lib/db.ts` - Prisma client singleton
- `src/lib/validations.ts` - All Zod schemas for entities
- `src/lib/categories.ts` - Category logic (static + DB merge)
- `src/lib/currencies.ts` - Currency definitions
- `src/lib/balance-utils.ts` - Balance calculation utilities
- `src/lib/notification-utils.ts` - In-app notification generation
- `src/lib/recurring-utils.ts` - Recurring transaction logic

### Database Models (Prisma)
User, BankAccount, CreditCard, Transaction, Budget, RecurringTransaction, Notification, Category, plus NextAuth models (Account, Session, VerificationToken).

All user-related models cascade delete when user is deleted.

## Environment Variables

Required in `.env`:
```
DATABASE_URL=postgresql://...
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<openssl rand -base64 32>
GOOGLE_CLIENT_ID=<optional>
GOOGLE_CLIENT_SECRET=<optional>
```

## Testing

Unit tests use Vitest with jsdom environment. Test files in `tests/` directory. E2E tests use Playwright with auto-starting dev server.

Run single test file:
```bash
npx vitest run tests/unit/lib/validations.test.ts
```

## Code Conventions

- All API input validated with Zod before processing
- Use shadcn/ui components from `src/components/ui/`
- Forms use React Hook Form with Zod resolver
- Toast notifications via Sonner (`toast.success()`, `toast.error()`)
- TypeScript strict mode enabled
