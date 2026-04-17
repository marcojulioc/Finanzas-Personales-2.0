# MCP Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an MCP (Model Context Protocol) server deployed alongside the existing Next.js app on Railway, exposing 4 tools so the user can manage transactions by voice/text from the Claude mobile app.

**Architecture:** Second Railway service (Node.js/TypeScript) lives in `mcp-server/` of the existing monorepo. It receives Streamable HTTP MCP requests from the Claude app, authenticates with a public Bearer key, then calls the existing Next.js API over Railway's private network with an internal API key. Minimal changes to Next.js: one auth helper that accepts `X-API-Key` as an alternative to NextAuth sessions, wired into 5 endpoints.

**Tech Stack:**
- MCP server: Node.js 20, TypeScript, `@modelcontextprotocol/sdk`, `hono` (HTTP), `zod`
- Next.js side: Existing stack (NextAuth 5, Prisma, Zod)
- Tests: Vitest (both sides)
- Deploy: Railway (Dockerfile)

**Reference design:** `docs/plans/2026-04-16-mcp-integration-design.md`

---

## Phase 0: Setup

### Task 0.1: Create feature branch

**Step 1: Create and switch to branch**

```bash
cd C:\Users\marco\Desktop\Proyectos\Finanzas-Personales-2.0
git checkout -b feat/mcp-integration
```

**Step 2: Verify clean state**

Run: `git status`
Expected: `On branch feat/mcp-integration`, no unstaged important changes.

---

## Phase 1: Next.js auth helper (TDD)

### Task 1.1: Write failing test for `authenticateRequest`

**Files:**
- Create: `tests/unit/lib/auth-api-key.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/lib/auth-api-key.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual('@/lib/auth')
  return {
    ...actual,
    auth: vi.fn(),
  }
})

import { authenticateRequest } from '@/lib/auth-api-key'
import { auth } from '@/lib/auth'

describe('authenticateRequest', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    vi.resetAllMocks()
    process.env = {
      ...OLD_ENV,
      INTERNAL_API_KEY: 'test-internal-key',
      OWNER_USER_ID: 'owner-123',
    }
  })

  function makeReq(headers: Record<string, string>): NextRequest {
    return new NextRequest('http://localhost/api/test', { headers })
  }

  it('returns owner identity when X-API-Key matches INTERNAL_API_KEY', async () => {
    const req = makeReq({ 'x-api-key': 'test-internal-key' })
    const result = await authenticateRequest(req)
    expect(result).toEqual({ userId: 'owner-123', via: 'mcp' })
    expect(auth).not.toHaveBeenCalled()
  })

  it('falls back to NextAuth session when X-API-Key missing', async () => {
    ;(auth as any).mockResolvedValue({ user: { id: 'user-456' } })
    const req = makeReq({})
    const result = await authenticateRequest(req)
    expect(result).toEqual({ userId: 'user-456', via: 'session' })
  })

  it('returns null when X-API-Key wrong and no session', async () => {
    ;(auth as any).mockResolvedValue(null)
    const req = makeReq({ 'x-api-key': 'wrong-key' })
    const result = await authenticateRequest(req)
    expect(result).toBeNull()
  })

  it('does not accept empty string API key as valid', async () => {
    ;(auth as any).mockResolvedValue(null)
    const req = makeReq({ 'x-api-key': '' })
    const result = await authenticateRequest(req)
    expect(result).toBeNull()
  })
})
```

**Step 2: Run test — expected to fail**

Run: `npx vitest run tests/unit/lib/auth-api-key.test.ts`
Expected: FAIL — module `@/lib/auth-api-key` not found.

### Task 1.2: Implement `authenticateRequest`

**Files:**
- Create: `src/lib/auth-api-key.ts`

**Step 1: Write implementation**

```typescript
// src/lib/auth-api-key.ts
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
```

**Step 2: Run test — expected to pass**

Run: `npx vitest run tests/unit/lib/auth-api-key.test.ts`
Expected: PASS (4 tests).

**Step 3: Commit**

```bash
git add src/lib/auth-api-key.ts tests/unit/lib/auth-api-key.test.ts
git commit -m "feat(auth): add authenticateRequest helper for MCP API key support"
```

---

## Phase 2: Wire helper into API endpoints

Five endpoints need updating. For each: replace the `const session = await auth()` + 401 check with `authenticateRequest(request)` + 401 check, and replace `session.user.id` with `auth.userId`. Do it one endpoint at a time, one commit per endpoint.

### Task 2.1: Update `GET /api/accounts`

**Files:**
- Modify: `src/app/api/accounts/route.ts`

**Step 1: Apply the edit**

Replace lines 1–17 (imports and the GET function auth block):

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { authenticateRequest } from '@/lib/auth-api-key'
import { db } from '@/lib/db'
import { bankAccountSchema } from '@/lib/validations'

// GET /api/accounts - Listar cuentas del usuario
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if (!authResult) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const accounts = await db.bankAccount.findMany({
      where: { userId: authResult.userId, isActive: true },
      orderBy: { createdAt: 'asc' },
    })
```

**Step 2: Manually smoke-test**

Run (in a second terminal with `npm run dev` running):
```bash
curl -H "x-api-key: test-dev-key" http://localhost:3000/api/accounts
```

After setting in `.env.local`:
```
INTERNAL_API_KEY=test-dev-key
OWNER_USER_ID=<your actual user id from prisma studio>
```

Expected: `{ "data": [...] }` with your accounts.

**Step 3: Run existing tests**

Run: `npm run test:run`
Expected: All pre-existing tests still pass.

**Step 4: Commit**

```bash
git add src/app/api/accounts/route.ts
git commit -m "feat(api): accept MCP API key auth on GET /api/accounts"
```

### Task 2.2: Update `GET /api/cards`

**Files:**
- Modify: `src/app/api/cards/route.ts:1-13`

**Step 1: Apply edit** — same pattern as Task 2.1 but for the `GET` function. Add `request: NextRequest` parameter, import `authenticateRequest`, replace auth block.

**Step 2: Smoke-test**

```bash
curl -H "x-api-key: test-dev-key" http://localhost:3000/api/cards
```

Expected: `{ "data": [...] }` with your cards.

**Step 3: Commit**

```bash
git add src/app/api/cards/route.ts
git commit -m "feat(api): accept MCP API key auth on GET /api/cards"
```

### Task 2.3: Update `GET /api/categories`

**Files:**
- Modify: `src/app/api/categories/route.ts:14-20`

**Step 1: Apply same pattern.**

**Step 2: Smoke-test**

```bash
curl -H "x-api-key: test-dev-key" "http://localhost:3000/api/categories?type=income"
```

Expected: list of categories.

**Step 3: Commit**

```bash
git add src/app/api/categories/route.ts
git commit -m "feat(api): accept MCP API key auth on GET /api/categories"
```

### Task 2.4: Update `GET /api/transactions`

**Files:**
- Modify: `src/app/api/transactions/route.ts:7-31` (the GET function)

**Step 1: Apply same pattern.** Replace `session.user.id` → `authResult.userId` on line 30.

**Step 2: Smoke-test**

```bash
curl -H "x-api-key: test-dev-key" "http://localhost:3000/api/transactions?limit=5"
```

Expected: up to 5 transactions.

**Step 3: Commit**

```bash
git add src/app/api/transactions/route.ts
git commit -m "feat(api): accept MCP API key auth on GET /api/transactions"
```

### Task 2.5: Update `POST /api/transactions`

**Files:**
- Modify: `src/app/api/transactions/route.ts:109-114` (POST auth block), and every subsequent use of `session.user.id` inside that function.

**Step 1: Apply pattern.** Search for all `session.user.id` occurrences inside the POST handler and replace with `authResult.userId`. (Use grep to find them first — there are several inside transaction logic.)

**Step 2: Smoke-test — create a tiny test transaction**

```bash
curl -X POST -H "x-api-key: test-dev-key" -H "Content-Type: application/json" \
  -d '{"type":"income","amount":1,"description":"MCP smoke test","bankAccountId":"<your-account-id>","category":"Otros","currency":"DOP","date":"2026-04-16"}' \
  http://localhost:3000/api/transactions
```

Expected: `{ "data": { "id": "...", ... } }`, balance increased by 1.

**Step 3: Clean up test transaction via Prisma Studio or API.**

**Step 4: Run full test suite**

Run: `npm run test:run`
Expected: all pass.

**Step 5: Commit**

```bash
git add src/app/api/transactions/route.ts
git commit -m "feat(api): accept MCP API key auth on POST /api/transactions"
```

---

## Phase 3: MCP server scaffolding

### Task 3.1: Initialize MCP server package

**Files:**
- Create: `mcp-server/package.json`
- Create: `mcp-server/tsconfig.json`
- Create: `mcp-server/.gitignore`

**Step 1: Create directory and package.json**

```bash
mkdir mcp-server
cd mcp-server
```

Write `package.json`:

```json
{
  "name": "finanzas-mcp",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20.9.0" },
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.4",
    "hono": "^4.6.14",
    "@hono/node-server": "^1.13.7",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^20",
    "tsx": "^4.19.2",
    "typescript": "^5.6.3",
    "vitest": "^2.1.8"
  }
}
```

Write `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": false,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

Write `.gitignore`:
```
node_modules/
dist/
.env
.env.local
```

**Step 2: Install**

Run:
```bash
cd mcp-server && npm install
```

Expected: no errors.

**Step 3: Commit**

```bash
cd ..
git add mcp-server/package.json mcp-server/package-lock.json mcp-server/tsconfig.json mcp-server/.gitignore
git commit -m "chore(mcp): scaffold MCP server package"
```

### Task 3.2: Write failing test for api-client

**Files:**
- Create: `mcp-server/src/api-client.test.ts`

**Step 1: Write test**

```typescript
// mcp-server/src/api-client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiClient } from './api-client.js'

describe('ApiClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('sends X-API-Key header and parses JSON data', async () => {
    ;(fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ id: 'a1' }] }),
    })
    const client = new ApiClient('http://api.test', 'secret-key')
    const result = await client.get('/accounts')

    expect(fetch).toHaveBeenCalledWith('http://api.test/accounts', expect.objectContaining({
      headers: expect.objectContaining({ 'x-api-key': 'secret-key' }),
    }))
    expect(result).toEqual([{ id: 'a1' }])
  })

  it('throws descriptive error on non-2xx', async () => {
    ;(fetch as any).mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ error: 'Datos inválidos' }),
    })
    const client = new ApiClient('http://api.test', 'k')
    await expect(client.get('/bad')).rejects.toThrow(/422.*Datos inválidos/)
  })

  it('sends POST with JSON body', async () => {
    ;(fetch as any).mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ data: { id: 'x' } }),
    })
    const client = new ApiClient('http://api.test', 'k')
    await client.post('/transactions', { type: 'income', amount: 5 })

    expect(fetch).toHaveBeenCalledWith('http://api.test/transactions', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ type: 'income', amount: 5 }),
      headers: expect.objectContaining({
        'content-type': 'application/json',
        'x-api-key': 'k',
      }),
    }))
  })
})
```

**Step 2: Run — expected fail**

Run: `cd mcp-server && npm test`
Expected: FAIL — module `./api-client.js` not found.

### Task 3.3: Implement api-client

**Files:**
- Create: `mcp-server/src/api-client.ts`

**Step 1: Implement**

```typescript
// mcp-server/src/api-client.ts
export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    const json = (await res.json()) as { data?: T; error?: string; details?: unknown }
    if (!res.ok) {
      throw new Error(`API ${res.status} ${method} ${path}: ${json.error ?? 'unknown error'}`)
    }
    return json.data as T
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path)
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body)
  }
}
```

**Step 2: Run — expected pass**

Run: `npm test`
Expected: 3 PASS.

**Step 3: Commit**

```bash
cd ..
git add mcp-server/src/api-client.ts mcp-server/src/api-client.test.ts
git commit -m "feat(mcp): add ApiClient with X-API-Key auth"
```

### Task 3.4: Write failing test for fuzzy account match

**Files:**
- Create: `mcp-server/src/fuzzy-match.test.ts`

**Step 1: Write test**

```typescript
// mcp-server/src/fuzzy-match.test.ts
import { describe, it, expect } from 'vitest'
import { findByName } from './fuzzy-match.js'

describe('findByName', () => {
  const accounts = [
    { id: '1', name: 'Banco Popular Dominicano' },
    { id: '2', name: 'BHD Dólares' },
    { id: '3', name: 'Banreservas' },
  ]

  it('matches exact substring case-insensitively', () => {
    expect(findByName(accounts, 'popular')?.id).toBe('1')
    expect(findByName(accounts, 'Popular')?.id).toBe('1')
    expect(findByName(accounts, 'BHD')?.id).toBe('2')
  })

  it('matches by any token in the query', () => {
    expect(findByName(accounts, 'dominicano')?.id).toBe('1')
  })

  it('returns null when no match', () => {
    expect(findByName(accounts, 'Santander')).toBeNull()
  })

  it('prefers exact name match over partial', () => {
    const items = [
      { id: '1', name: 'Popular Extra' },
      { id: '2', name: 'Popular' },
    ]
    expect(findByName(items, 'Popular')?.id).toBe('2')
  })

  it('handles accents (tilde-insensitive)', () => {
    expect(findByName(accounts, 'Dolares')?.id).toBe('2')
  })
})
```

**Step 2: Run — expected fail**

Run: `npm test`
Expected: FAIL.

### Task 3.5: Implement fuzzy match

**Files:**
- Create: `mcp-server/src/fuzzy-match.ts`

**Step 1: Implement**

```typescript
// mcp-server/src/fuzzy-match.ts
function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

export function findByName<T extends { name: string }>(
  items: T[],
  query: string,
): T | null {
  if (!query) return null
  const nq = normalize(query)

  // 1. Exact match on normalized
  const exact = items.find((it) => normalize(it.name) === nq)
  if (exact) return exact

  // 2. Substring match
  const substring = items.find((it) => normalize(it.name).includes(nq))
  if (substring) return substring

  // 3. Any token of the item includes the query (or vice versa)
  const token = items.find((it) => {
    const tokens = normalize(it.name).split(/\s+/)
    return tokens.some((t) => t.includes(nq) || nq.includes(t))
  })
  return token ?? null
}
```

**Step 2: Run — expected pass**

Run: `npm test`
Expected: 5 PASS (total 8 with previous).

**Step 3: Commit**

```bash
cd ..
git add mcp-server/src/fuzzy-match.ts mcp-server/src/fuzzy-match.test.ts
git commit -m "feat(mcp): add tilde-insensitive fuzzy name matcher"
```

---

## Phase 4: MCP tools (one at a time)

### Task 4.1: `list_accounts` tool — test

**Files:**
- Create: `mcp-server/src/tools/list-accounts.test.ts`

**Step 1: Write test**

```typescript
// mcp-server/src/tools/list-accounts.test.ts
import { describe, it, expect, vi } from 'vitest'
import { listAccountsTool } from './list-accounts.js'

describe('list_accounts tool', () => {
  it('returns aggregated accounts, cards, and categories', async () => {
    const mockClient = {
      get: vi.fn((path: string) => {
        if (path === '/accounts') return Promise.resolve([{ id: 'a1', name: 'Popular', currency: 'DOP', balance: '100.00' }])
        if (path === '/cards') return Promise.resolve([
          { id: 'c1', name: 'Visa', currency: 'DOP', balances: [{ currency: 'DOP', balance: '50.00' }] },
        ])
        if (path.startsWith('/categories')) return Promise.resolve([{ name: 'Bono' }, { name: 'Salario' }])
        throw new Error('unexpected ' + path)
      }),
    } as any

    const result = await listAccountsTool.handler({}, { api: mockClient })

    expect(result.bankAccounts).toHaveLength(1)
    expect(result.bankAccounts[0]).toMatchObject({ id: 'a1', name: 'Popular', currency: 'DOP' })
    expect(result.creditCards).toHaveLength(1)
    expect(result.categories).toContain('Bono')
  })
})
```

**Step 2: Run — expected fail**

Run: `cd mcp-server && npm test`
Expected: FAIL, module not found.

### Task 4.2: `list_accounts` tool — implement

**Files:**
- Create: `mcp-server/src/tools/list-accounts.ts`
- Create: `mcp-server/src/types.ts`

**Step 1: Write types.ts**

```typescript
// mcp-server/src/types.ts
import { ApiClient } from './api-client.js'

export interface ToolContext {
  api: ApiClient
}

export interface BankAccount {
  id: string
  name: string
  currency: string
  balance: string
}

export interface CreditCard {
  id: string
  name: string
  currency: string
  balances?: Array<{ currency: string; balance: string }>
}

export interface Category {
  name: string
  type?: 'income' | 'expense'
}

export interface Transaction {
  id: string
  type: 'income' | 'expense' | 'transfer'
  amount: string
  description: string | null
  category: string
  date: string
  bankAccount?: { name: string }
  creditCard?: { name: string }
}
```

**Step 2: Write list-accounts.ts**

```typescript
// mcp-server/src/tools/list-accounts.ts
import { z } from 'zod'
import type { ToolContext, BankAccount, CreditCard, Category } from '../types.js'

export const listAccountsTool = {
  name: 'list_accounts',
  description:
    'List all active bank accounts, credit cards, and available categories. ' +
    'Always call this first when the user references an account/card/category by name, ' +
    'so you know their exact IDs and spellings before creating a transaction.',
  inputSchema: z.object({}),
  handler: async (_input: unknown, ctx: ToolContext) => {
    const [accounts, cards, catsIncome, catsExpense] = await Promise.all([
      ctx.api.get<BankAccount[]>('/accounts'),
      ctx.api.get<CreditCard[]>('/cards'),
      ctx.api.get<Category[]>('/categories?type=income'),
      ctx.api.get<Category[]>('/categories?type=expense'),
    ])

    const categories = Array.from(
      new Set([...catsIncome, ...catsExpense].map((c) => c.name)),
    ).sort()

    return {
      bankAccounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        currency: a.currency,
        balance: a.balance,
      })),
      creditCards: cards.map((c) => ({
        id: c.id,
        name: c.name,
        currency: c.currency,
        debt: c.balances?.[0]?.balance ?? '0.00',
      })),
      categories,
    }
  },
}
```

**Step 3: Run — expected pass**

Run: `npm test`
Expected: PASS.

**Step 4: Commit**

```bash
cd ..
git add mcp-server/src/tools/list-accounts.ts mcp-server/src/tools/list-accounts.test.ts mcp-server/src/types.ts
git commit -m "feat(mcp): add list_accounts tool"
```

### Task 4.3: `get_balance` tool — test + implement

**Files:**
- Create: `mcp-server/src/tools/get-balance.test.ts`
- Create: `mcp-server/src/tools/get-balance.ts`

**Step 1: Write test**

```typescript
// mcp-server/src/tools/get-balance.test.ts
import { describe, it, expect, vi } from 'vitest'
import { getBalanceTool } from './get-balance.js'

describe('get_balance tool', () => {
  it('returns matched account balance', async () => {
    const mockClient = {
      get: vi.fn().mockResolvedValue([
        { id: 'a1', name: 'Banco Popular Dominicano', currency: 'DOP', balance: '15420.50' },
        { id: 'a2', name: 'BHD Dólares', currency: 'USD', balance: '1200.00' },
      ]),
    } as any

    const result = await getBalanceTool.handler({ accountName: 'Popular' }, { api: mockClient })

    expect(result).toEqual({
      account: 'Banco Popular Dominicano',
      balance: '15420.50',
      currency: 'DOP',
    })
  })

  it('throws when no account matches', async () => {
    const mockClient = {
      get: vi.fn().mockResolvedValue([{ id: 'a1', name: 'Popular', currency: 'DOP', balance: '0' }]),
    } as any

    await expect(
      getBalanceTool.handler({ accountName: 'Santander' }, { api: mockClient }),
    ).rejects.toThrow(/no account matching/i)
  })
})
```

**Step 2: Run — expected fail.**

**Step 3: Implement**

```typescript
// mcp-server/src/tools/get-balance.ts
import { z } from 'zod'
import { findByName } from '../fuzzy-match.js'
import type { ToolContext, BankAccount } from '../types.js'

const inputSchema = z.object({
  accountName: z.string().min(1),
})

export const getBalanceTool = {
  name: 'get_balance',
  description:
    'Get the current balance of a bank account. The accountName is matched fuzzily (case/accent insensitive, substring match), ' +
    'so "Popular" will match "Banco Popular Dominicano".',
  inputSchema,
  handler: async (input: z.infer<typeof inputSchema>, ctx: ToolContext) => {
    const parsed = inputSchema.parse(input)
    const accounts = await ctx.api.get<BankAccount[]>('/accounts')
    const match = findByName(accounts, parsed.accountName)
    if (!match) {
      throw new Error(`No account matching "${parsed.accountName}". Call list_accounts to see options.`)
    }
    return {
      account: match.name,
      balance: match.balance,
      currency: match.currency,
    }
  },
}
```

**Step 4: Run — expected pass.**

**Step 5: Commit**

```bash
cd ..
git add mcp-server/src/tools/get-balance.ts mcp-server/src/tools/get-balance.test.ts
git commit -m "feat(mcp): add get_balance tool"
```

### Task 4.4: `list_transactions` tool — test + implement

**Files:**
- Create: `mcp-server/src/tools/list-transactions.test.ts`
- Create: `mcp-server/src/tools/list-transactions.ts`

**Step 1: Write test**

```typescript
// mcp-server/src/tools/list-transactions.test.ts
import { describe, it, expect, vi } from 'vitest'
import { listTransactionsTool } from './list-transactions.js'

describe('list_transactions tool', () => {
  it('returns formatted recent transactions', async () => {
    const mockClient = {
      get: vi.fn().mockResolvedValue([
        {
          id: 't1',
          type: 'income',
          amount: '500.00',
          description: 'Bono',
          category: 'Ingresos varios',
          date: '2026-04-15T00:00:00Z',
          bankAccount: { name: 'Popular' },
        },
      ]),
    } as any

    const result = await listTransactionsTool.handler({ limit: 10 }, { api: mockClient })

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      type: 'income',
      amount: '500.00',
      description: 'Bono',
      account: 'Popular',
    })
    expect(mockClient.get).toHaveBeenCalledWith(expect.stringContaining('limit=10'))
  })

  it('defaults limit to 10 and computes startDate when days provided', async () => {
    const mockClient = { get: vi.fn().mockResolvedValue([]) } as any
    await listTransactionsTool.handler({ days: 7 }, { api: mockClient })

    const call = mockClient.get.mock.calls[0][0] as string
    expect(call).toContain('limit=10')
    expect(call).toContain('startDate=')
  })
})
```

**Step 2: Run — expected fail.**

**Step 3: Implement**

```typescript
// mcp-server/src/tools/list-transactions.ts
import { z } from 'zod'
import type { ToolContext, Transaction } from '../types.js'

const inputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(10),
  accountName: z.string().optional(),
  days: z.number().int().min(1).max(365).optional(),
})

export const listTransactionsTool = {
  name: 'list_transactions',
  description:
    'List recent transactions, optionally filtered. Useful for questions like ' +
    '"¿cuánto gasté esta semana?" or "muéstrame mis últimos 5 movimientos".',
  inputSchema,
  handler: async (rawInput: unknown, ctx: ToolContext) => {
    const input = inputSchema.parse(rawInput)
    const params = new URLSearchParams({ limit: String(input.limit) })
    if (input.days) {
      const startDate = new Date(Date.now() - input.days * 86400000).toISOString()
      params.set('startDate', startDate)
    }
    const txns = await ctx.api.get<Transaction[]>(`/transactions?${params.toString()}`)
    return txns.map((t) => ({
      date: t.date,
      type: t.type,
      amount: t.amount,
      description: t.description,
      category: t.category,
      account: t.bankAccount?.name ?? t.creditCard?.name ?? null,
    }))
  },
}
```

**Step 4: Run — expected pass.**

**Step 5: Commit**

```bash
cd ..
git add mcp-server/src/tools/list-transactions.ts mcp-server/src/tools/list-transactions.test.ts
git commit -m "feat(mcp): add list_transactions tool"
```

### Task 4.5: `create_transaction` tool — test

**Files:**
- Create: `mcp-server/src/tools/create-transaction.test.ts`

**Step 1: Write test**

```typescript
// mcp-server/src/tools/create-transaction.test.ts
import { describe, it, expect, vi } from 'vitest'
import { createTransactionTool } from './create-transaction.js'

const mockAccounts = [
  { id: 'a1', name: 'Banco Popular Dominicano', currency: 'DOP', balance: '1000.00' },
  { id: 'a2', name: 'BHD Dólares', currency: 'USD', balance: '500.00' },
]
const mockCards = [
  { id: 'c1', name: 'Visa Popular', currency: 'DOP', balances: [] },
]

function mockClient() {
  return {
    get: vi.fn((path: string) => {
      if (path === '/accounts') return Promise.resolve(mockAccounts)
      if (path === '/cards') return Promise.resolve(mockCards)
      throw new Error('unexpected ' + path)
    }),
    post: vi.fn().mockResolvedValue({ id: 'tx-new', type: 'income', amount: '500.00' }),
  }
}

describe('create_transaction tool', () => {
  it('resolves account name, infers currency, posts income', async () => {
    const api = mockClient()
    const result = await createTransactionTool.handler(
      { type: 'income', amount: 500, description: 'Bono', accountName: 'Popular', category: 'Bono' },
      { api: api as any },
    )

    expect(api.post).toHaveBeenCalledWith('/transactions', expect.objectContaining({
      type: 'income',
      amount: 500,
      bankAccountId: 'a1',
      currency: 'DOP',
      category: 'Bono',
      description: 'Bono',
    }))
    expect(result).toMatchObject({ id: 'tx-new', success: true })
  })

  it('handles transfer with target account', async () => {
    const api = mockClient()
    await createTransactionTool.handler(
      { type: 'transfer', amount: 100, description: 't', accountName: 'Popular', targetAccountName: 'BHD' },
      { api: api as any },
    )
    expect(api.post).toHaveBeenCalledWith('/transactions', expect.objectContaining({
      type: 'transfer',
      bankAccountId: 'a1',
      targetAccountId: 'a2',
    }))
  })

  it('throws on unknown account', async () => {
    const api = mockClient()
    await expect(
      createTransactionTool.handler(
        { type: 'income', amount: 1, description: 'x', accountName: 'Santander' },
        { api: api as any },
      ),
    ).rejects.toThrow(/no account matching/i)
  })

  it('throws on transfer without targetAccountName', async () => {
    const api = mockClient()
    await expect(
      createTransactionTool.handler(
        { type: 'transfer', amount: 1, description: 'x', accountName: 'Popular' },
        { api: api as any },
      ),
    ).rejects.toThrow(/targetAccountName required/i)
  })
})
```

**Step 2: Run — expected fail.**

### Task 4.6: `create_transaction` tool — implement

**Files:**
- Create: `mcp-server/src/tools/create-transaction.ts`

**Step 1: Implement**

```typescript
// mcp-server/src/tools/create-transaction.ts
import { z } from 'zod'
import { findByName } from '../fuzzy-match.js'
import type { ToolContext, BankAccount, CreditCard } from '../types.js'

const inputSchema = z.object({
  type: z.enum(['income', 'expense', 'transfer']),
  amount: z.number().positive(),
  description: z.string().min(1),
  accountName: z.string().min(1),
  category: z.string().optional(),
  currency: z.string().optional(),
  date: z.string().optional(),
  targetAccountName: z.string().optional(),
  targetCardName: z.string().optional(),
})

export const createTransactionTool = {
  name: 'create_transaction',
  description: [
    'Create a financial transaction (income, expense, or transfer).',
    '',
    'IMPORTANT — BEFORE CALLING THIS TOOL:',
    '1. Summarize in Spanish what will be created: type, amount, currency, account, category, date, and (if transfer) destination.',
    '2. Ask the user to confirm explicitly (sí/no).',
    '3. Only invoke this tool after the user confirms.',
    '',
    'Account/card names are matched fuzzily. Currency defaults to the account currency. Date defaults to today.',
    'For transfers, both accountName (source) and targetAccountName (destination) are required and must use the same currency.',
  ].join('\n'),
  inputSchema,
  handler: async (rawInput: unknown, ctx: ToolContext) => {
    const input = inputSchema.parse(rawInput)

    const accounts = await ctx.api.get<BankAccount[]>('/accounts')
    const sourceAccount = findByName(accounts, input.accountName)
    if (!sourceAccount) {
      throw new Error(`No account matching "${input.accountName}". Call list_accounts for options.`)
    }

    const payload: Record<string, unknown> = {
      type: input.type,
      amount: input.amount,
      description: input.description,
      bankAccountId: sourceAccount.id,
      currency: input.currency ?? sourceAccount.currency,
      category: input.category ?? (input.type === 'transfer' ? 'Transferencia' : 'Otros'),
      date: input.date ?? new Date().toISOString(),
    }

    if (input.type === 'transfer') {
      if (!input.targetAccountName) {
        throw new Error('targetAccountName required for transfer')
      }
      const targetAccount = findByName(accounts, input.targetAccountName)
      if (!targetAccount) {
        throw new Error(`No target account matching "${input.targetAccountName}"`)
      }
      payload.targetAccountId = targetAccount.id
    }

    if (input.targetCardName) {
      const cards = await ctx.api.get<CreditCard[]>('/cards')
      const targetCard = findByName(cards, input.targetCardName)
      if (!targetCard) {
        throw new Error(`No card matching "${input.targetCardName}"`)
      }
      payload.targetCardId = targetCard.id
      payload.isCardPayment = true
    }

    const created = await ctx.api.post<{ id: string; type: string; amount: string }>(
      '/transactions',
      payload,
    )

    return {
      id: created.id,
      type: created.type,
      amount: created.amount,
      account: sourceAccount.name,
      success: true,
    }
  },
}
```

**Step 2: Run — expected pass.**

**Step 3: Commit**

```bash
cd ..
git add mcp-server/src/tools/create-transaction.ts mcp-server/src/tools/create-transaction.test.ts
git commit -m "feat(mcp): add create_transaction tool with confirmation guidance"
```

---

## Phase 5: MCP server entry point

### Task 5.1: Wire up MCP server with HTTP transport

**Files:**
- Create: `mcp-server/src/server.ts`
- Create: `mcp-server/src/index.ts`

**Step 1: Write server.ts (tool registration)**

```typescript
// mcp-server/src/server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import type { ApiClient } from './api-client.js'
import { listAccountsTool } from './tools/list-accounts.js'
import { getBalanceTool } from './tools/get-balance.js'
import { createTransactionTool } from './tools/create-transaction.js'
import { listTransactionsTool } from './tools/list-transactions.js'

const ALL_TOOLS = [listAccountsTool, getBalanceTool, createTransactionTool, listTransactionsTool]

export function buildMcpServer(api: ApiClient): Server {
  const server = new Server(
    { name: 'finanzas-mcp', version: '0.1.0' },
    { capabilities: { tools: {} } },
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: ALL_TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: zodToJsonSchema(t.inputSchema),
    })),
  }))

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const tool = ALL_TOOLS.find((t) => t.name === req.params.name)
    if (!tool) throw new Error(`Unknown tool: ${req.params.name}`)

    const result = await tool.handler(req.params.arguments ?? {}, { api })
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  })

  return server
}

// Minimal zod → JSON schema (only for simple object schemas we use)
function zodToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as Record<string, z.ZodTypeAny>
    const properties: Record<string, unknown> = {}
    const required: string[] = []
    for (const [key, val] of Object.entries(shape)) {
      properties[key] = primitiveToJsonSchema(val)
      if (!val.isOptional()) required.push(key)
    }
    return { type: 'object', properties, required }
  }
  return { type: 'object' }
}

function primitiveToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  const inner = schema._def.innerType ?? schema
  if (inner instanceof z.ZodString) return { type: 'string' }
  if (inner instanceof z.ZodNumber) return { type: 'number' }
  if (inner instanceof z.ZodBoolean) return { type: 'boolean' }
  if (inner instanceof z.ZodEnum) return { type: 'string', enum: inner.options }
  if (inner instanceof z.ZodOptional) return primitiveToJsonSchema(inner._def.innerType)
  if (inner instanceof z.ZodDefault) return primitiveToJsonSchema(inner._def.innerType)
  return {}
}
```

**Step 2: Write index.ts (HTTP entry)**

```typescript
// mcp-server/src/index.ts
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { ApiClient } from './api-client.js'
import { buildMcpServer } from './server.js'

const PORT = Number(process.env.PORT ?? 3333)
const APP_URL = process.env.APP_URL
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY
const MCP_PUBLIC_KEY = process.env.MCP_PUBLIC_KEY

if (!APP_URL || !INTERNAL_API_KEY || !MCP_PUBLIC_KEY) {
  console.error('Missing required env vars: APP_URL, INTERNAL_API_KEY, MCP_PUBLIC_KEY')
  process.exit(1)
}

const api = new ApiClient(APP_URL.replace(/\/$/, '') + '/api', INTERNAL_API_KEY)
const app = new Hono()

app.get('/health', (c) => c.json({ ok: true }))

app.all('/mcp', async (c) => {
  const authHeader = c.req.header('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (token !== MCP_PUBLIC_KEY) {
    return c.json({ error: 'unauthorized' }, 401)
  }

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  const mcpServer = buildMcpServer(api)
  await mcpServer.connect(transport)

  // Hono <-> Node req/res bridge
  const { req, res } = c.env.incoming
    ? { req: c.env.incoming, res: c.env.outgoing }
    : await import('./hono-bridge.js').then((m) => m.bridge(c))

  await transport.handleRequest(req, res, await c.req.json().catch(() => undefined))
  return undefined as any
})

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`finanzas-mcp listening on :${info.port}`)
})
```

> **Note:** The Hono↔Node bridge is a known wart when pairing MCP's Node-stream-based transport with modern fetch-based frameworks. If this bridge is painful, **fall back to raw `node:http`** instead of Hono — simpler, no bridge needed. That is encouraged; Hono is optional.

**Step 3: Build to check types**

Run: `cd mcp-server && npm run build`
Expected: no TS errors. If bridge issues, swap to raw `node:http` (see note).

**Step 4: Commit**

```bash
cd ..
git add mcp-server/src/server.ts mcp-server/src/index.ts
git commit -m "feat(mcp): wire up Streamable HTTP transport and tool registry"
```

### Task 5.2: Local integration smoke test

**Step 1: Set dev env vars**

Create `mcp-server/.env.local`:
```
PORT=3333
APP_URL=http://localhost:3000
INTERNAL_API_KEY=test-dev-key
MCP_PUBLIC_KEY=test-mcp-key
```

**Step 2: Run both services**

Terminal 1: `npm run dev` (Next.js app on :3000)
Terminal 2: `cd mcp-server && npm run dev` (MCP on :3333)

**Step 3: Health check**

Run: `curl http://localhost:3333/health`
Expected: `{"ok":true}`

**Step 4: Auth check**

Run: `curl -i http://localhost:3333/mcp -X POST`
Expected: 401.

Run: `curl -i -H "Authorization: Bearer test-mcp-key" -H "Content-Type: application/json" -X POST http://localhost:3333/mcp -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`
Expected: 200 with JSON listing the 4 tools.

**Step 5: MCP Inspector test (optional but strongly recommended)**

Run: `npx @modelcontextprotocol/inspector`
In the UI: connect to `http://localhost:3333/mcp` with Bearer token `test-mcp-key`. Try each tool.

---

## Phase 6: Deployment

### Task 6.1: Create Dockerfile for MCP server

**Files:**
- Create: `mcp-server/Dockerfile`
- Create: `mcp-server/.dockerignore`

**Step 1: Dockerfile**

```dockerfile
# mcp-server/Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
EXPOSE 3333
CMD ["node", "dist/index.js"]
```

**Step 2: .dockerignore**

```
node_modules
dist
.env*
*.test.ts
```

**Step 3: Test build locally**

Run: `cd mcp-server && docker build -t finanzas-mcp .`
Expected: image builds without error.

**Step 4: Commit**

```bash
cd ..
git add mcp-server/Dockerfile mcp-server/.dockerignore
git commit -m "chore(mcp): add Dockerfile for Railway deploy"
```

### Task 6.2: Add railway.json

**Files:**
- Create: `mcp-server/railway.json`

**Step 1: Write config**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": { "builder": "DOCKERFILE", "dockerfilePath": "Dockerfile" },
  "deploy": {
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE"
  }
}
```

**Step 2: Commit**

```bash
git add mcp-server/railway.json
git commit -m "chore(mcp): add Railway service config"
```

### Task 6.3: Push branch + prep Railway

**Step 1: Push**

```bash
git push -u origin feat/mcp-integration
```

**Step 2: In Railway dashboard (manual steps, not scripted):**

1. Project → New Service → GitHub Repo → pick same repo → set **Root Directory** to `mcp-server`, **Branch** to `feat/mcp-integration`.
2. Variables (new MCP service):
   - `MCP_PUBLIC_KEY` = `openssl rand -base64 32`
   - `INTERNAL_API_KEY` = `openssl rand -base64 32`
   - `OWNER_USER_ID` = your user id (from Prisma Studio)
   - `APP_URL` = `http://<existing-nextjs-service-name>.railway.internal:3000`
   - `PORT` = `3333`
3. Variables (existing Next.js service — add these):
   - `INTERNAL_API_KEY` = same value as above
   - `OWNER_USER_ID` = same value as above
4. Networking: Generate Domain for MCP service → copy URL.
5. Trigger redeploy of Next.js service so it picks up the new env vars.

**Step 3: Smoke test production**

```bash
curl https://<mcp-domain>/health
# → {"ok":true}

curl -H "Authorization: Bearer <MCP_PUBLIC_KEY>" -H "Content-Type: application/json" \
  -X POST https://<mcp-domain>/mcp \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
# → JSON with 4 tools
```

**Step 4: Merge**

Open PR from `feat/mcp-integration` → `master`. After review, merge. Railway auto-redeploys both services.

### Task 6.4: Connect Claude app

**Step 1: Claude web first**

1. Settings → Connectors → Add custom MCP server.
2. URL: `https://<mcp-domain>/mcp`
3. Auth: Bearer → paste `MCP_PUBLIC_KEY`.
4. Verify 4 tools appear.

**Step 2: Test flow end-to-end**

Prompt Claude: *"¿Cuál es mi saldo en Popular?"*
Expected: Claude calls `get_balance`, reports balance.

Prompt: *"Agrega un ingreso de $1 DOP en Popular por 'MCP production smoke test'"*
Expected:
1. Claude summarizes and asks to confirm.
2. User confirms.
3. Claude calls `create_transaction`, reports success.
4. Transaction appears in the web app at `/transactions`.

**Step 3: Clean up test transaction from web app.**

**Step 4: Configure on Claude mobile** (same URL and token).

---

## Phase 7: Docs

### Task 7.1: Update CLAUDE.md with MCP integration notes

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Add a new section after "Tech Stack":**

```markdown
## MCP Server Integration

A second Railway service in `mcp-server/` exposes the API as MCP tools for Claude
(voice/text control from mobile). Auth uses `X-API-Key` header validated in
`src/lib/auth-api-key.ts` — endpoints that support MCP access use
`authenticateRequest()` instead of `auth()` directly.

Modified endpoints:
- `GET/POST /api/transactions`
- `GET /api/accounts`
- `GET /api/cards`
- `GET /api/categories`

Design: `docs/plans/2026-04-16-mcp-integration-design.md`
Plan: `docs/plans/2026-04-16-mcp-integration-plan.md`
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document MCP integration in CLAUDE.md"
```

---

## Verification checklist before claiming done

- [ ] `npm run test:run` passes in repo root
- [ ] `cd mcp-server && npm test` passes (all tool tests + api-client + fuzzy-match)
- [ ] `cd mcp-server && npm run build` compiles with no TS errors
- [ ] Local cURL against `/api/accounts` with `x-api-key` returns accounts
- [ ] Local cURL against `/mcp` with Bearer returns tool list
- [ ] MCP Inspector can call each of the 4 tools locally
- [ ] Production `/health` returns `{ok:true}`
- [ ] Production `/mcp` requires Bearer, returns tools with it
- [ ] Claude web can create a transaction end-to-end
- [ ] Claude mobile works (same)
- [ ] CLAUDE.md updated
- [ ] Merged to `master`, Railway redeployed both services

## Rollback

If anything breaks the main app: pause the MCP service in Railway and revert the `feat/mcp-integration` merge. Since all changes in the Next.js app are additive (new helper, new code paths gated on `x-api-key` presence), rollback is low-risk. Ensure the `INTERNAL_API_KEY` and `OWNER_USER_ID` env vars can remain set in Next.js with no effect when nothing sends them.
