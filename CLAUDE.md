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

Run single test file:
```bash
npx vitest run tests/unit/lib/validations.test.ts
```

## Tech Stack

- **Next.js 16** (App Router, React 19, Turbopack)
- **Prisma 6** with PostgreSQL
- **NextAuth.js 5** (Credentials + Google OAuth, JWT sessions)
- **Tailwind CSS 4** with shadcn/ui components
- **Zod** for validation, **React Hook Form** for forms
- **SWR** for client-side data fetching
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

**Data Fetching**: SWR hooks in `src/hooks/` (use-transactions, use-accounts, use-cards, use-budgets, use-recurring, use-loans, use-net-worth, use-reports, etc.) wrap all API calls. Pages use these hooks, never raw fetch. SWR config: `revalidateOnFocus: false`, `dedupingInterval: 2000ms`.

**Balance Atomicity**: All balance changes use `db.$transaction()` for atomicity. Pattern: decrement source, increment destination. This applies to income, expenses, transfers, and card payments.

**Soft Deletes**: All entities use `isActive: Boolean @default(true)` instead of hard delete. Always filter by `isActive: true` in queries.

**Category System**: Hybrid approach with legacy static categories + user-created custom categories in database. Categories seeded on first access via `/api/categories/seed`. **Important**: `Transaction.category` stores the category name as a string (not a foreign key).

**Multi-Currency**: Supports 28 currencies. Credit cards track separate balances per currency via `CreditCardBalance` model. Transactions store currency per record.

**Transaction Types**:
- `income` - Increases bank account balance
- `expense` - Decreases bank account balance OR increases credit card debt
- `transfer` - Decreases source account, increases destination account (same currency required). Uses `bankAccountId` (source) + `targetAccountId` (destination). Category auto-set to "Transferencia".

**Card Payments**: Special expense subtype where `isCardPayment=true` + `targetCardId`. Supports cross-currency with `exchangeRate` field.

**Tax Transactions**: Expenses can auto-generate a linked 0.15% IDE tax transaction. Linked via description pattern `Impuesto IDE (0.15%) | ref:{parentId}`. Tax transactions auto-recalculate on edit and cascade-delete with parent.

**Recurring Transactions**: Frequencies: daily, weekly, biweekly, monthly, yearly. Generated lazily via `/api/recurring/generate`. Uses `lastGeneratedDate` and `nextDueDate` for tracking.

### Core Libraries
- `src/lib/auth.ts` - NextAuth configuration with providers
- `src/lib/db.ts` - Prisma client singleton
- `src/lib/validations.ts` - All Zod schemas for API entities
- `src/lib/categories.ts` - Category logic (static + DB merge)
- `src/lib/currencies.ts` - Currency definitions (28 currencies)
- `src/lib/balance-utils.ts` - Balance calculation utilities
- `src/lib/notification-utils.ts` - In-app notification generation
- `src/lib/recurring-utils.ts` - Recurring transaction logic
- `src/lib/format-utils.ts` - Currency formatting, date parsing (Spanish locale)
- `src/lib/export-pdf.ts` / `export-excel.ts` - Report export utilities

### Database Models (Prisma)
User, BankAccount, CreditCard, CreditCardBalance, Transaction, Budget, RecurringTransaction, Notification, Category, Loan, NetWorthSnapshot, plus NextAuth models (Account, Session, VerificationToken).

All user-related models cascade delete when user is deleted.

**Prisma relations note**: When adding a second relation between the same two models (e.g., Transaction→BankAccount), BOTH relations must be named. The existing unnamed relation must also get a name.

### Reports & Net Worth
- Reports exclude transfers from income/expense totals — check ALL `else` branches when modifying
- Net worth = bank account balances - (credit card debt + loan remaining balances)
- `NetWorthSnapshot` stores one snapshot per user per day with breakdown JSON
- Exchange rates for net worth conversion are currently hardcoded in `src/app/api/net-worth/route.ts`

## Deployment

- **Platform**: Railway (auto-deploys on push to `master`)
- **Database**: PostgreSQL on Railway (port 5435, not default 5432)
- **Build**: `prisma generate && next build`
- **Start**: `prisma migrate deploy && next start`

## Environment Variables

Required in `.env`:
```
DATABASE_URL=postgresql://...
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<openssl rand -base64 32>
GOOGLE_CLIENT_ID=<optional>
GOOGLE_CLIENT_SECRET=<optional>
```

## Code Conventions

- All API input validated with Zod schemas from `src/lib/validations.ts` before processing
- Use shadcn/ui components from `src/components/ui/`
- Forms use React Hook Form with Zod resolver
- Toast notifications via Sonner (`toast.success()`, `toast.error()`)
- TypeScript strict mode enabled
- Financial amounts use `Decimal(12,2)` in Prisma — never floating point
- UI text is in Spanish
