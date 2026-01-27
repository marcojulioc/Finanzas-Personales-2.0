# Performance Optimization Plan - Finanzas Personales 2.0

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Optimizar el rendimiento de la aplicación siguiendo las mejores prácticas de Vercel/React, mejorando la experiencia de usuario y reduciendo tiempos de carga.

**Architecture:** Implementación por fases comenzando con client-side data fetching (SWR), seguido de bundle optimization (lazy loading), re-render optimization, y finalmente mejoras de composición de componentes.

**Tech Stack:** Next.js 16, React 19, SWR, TypeScript, Prisma, shadcn/ui

**Skills de Apoyo:**
- `vercel-react-best-practices` - Reglas de optimización
- `vercel-composition-patterns` - Patrones de composición React
- `superpowers:test-driven-development` - TDD en cada tarea
- `code-best-practices` - Revisión de código

**Puntuación Actual:** 6.2/10
**Puntuación Objetivo:** 8.5/10

---

## Resumen de Fases

| Fase | Nombre | Impacto | Duración Est. | Dependencias |
|------|--------|---------|---------------|--------------|
| 1 | SWR Data Fetching | CRITICAL | 8 tareas | Ninguna |
| 2 | Bundle Optimization | CRITICAL | 6 tareas | Ninguna |
| 3 | Re-render Optimization | MEDIUM | 5 tareas | Fase 1 |
| 4 | Component Composition | MEDIUM | 4 tareas | Fase 1, 3 |
| 5 | Server Optimizations | LOW | 3 tareas | Ninguna |

---

## Phase 1: SWR Data Fetching (CRITICAL)

**Objetivo:** Reemplazar fetch manual con SWR para obtener deduplicación automática, caché, y revalidación.

**Reglas Vercel aplicadas:**
- `client-swr-dedup` - Deduplicación de requests
- `async-parallel` - Fetching paralelo

### Task 1.1: Instalar y Configurar SWR

**Files:**
- Modify: `package.json`
- Create: `src/lib/swr-config.tsx`
- Modify: `src/components/providers.tsx`

**Step 1: Instalar SWR**

```bash
npm install swr
```

**Step 2: Crear configuración global de SWR**

```typescript
// src/lib/swr-config.tsx
'use client'

import { SWRConfig } from 'swr'
import { ReactNode } from 'react'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = new Error('Error fetching data')
    throw error
  }
  const json = await res.json()
  return json.data
}

interface SWRProviderProps {
  children: ReactNode
}

export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false,
        revalidateIfStale: true,
        dedupingInterval: 2000,
      }}
    >
      {children}
    </SWRConfig>
  )
}
```

**Step 3: Integrar SWRProvider en providers.tsx**

```typescript
// src/components/providers.tsx - añadir import y wrapper
import { SWRProvider } from '@/lib/swr-config'

// Envolver children con SWRProvider
<SWRProvider>
  <ThemeProvider>
    {children}
  </ThemeProvider>
</SWRProvider>
```

**Step 4: Verificar que la app funciona**

```bash
npm run dev
```
Expected: App carga sin errores

**Step 5: Commit**

```bash
git add package.json package-lock.json src/lib/swr-config.tsx src/components/providers.tsx
git commit -m "feat: add SWR configuration for data fetching"
```

---

### Task 1.2: Crear Custom Hooks con SWR

**Files:**
- Create: `src/hooks/use-accounts.ts`
- Create: `src/hooks/use-cards.ts`
- Create: `src/hooks/use-categories.ts`
- Create: `src/hooks/use-transactions.ts`

**Step 1: Crear hook useAccounts**

```typescript
// src/hooks/use-accounts.ts
'use client'

import useSWR from 'swr'

interface BankAccount {
  id: string
  name: string
  bankName: string
  accountType: 'savings' | 'checking'
  currency: string
  balance: number
  color: string | null
  isActive: boolean
}

export function useAccounts() {
  const { data, error, isLoading, mutate } = useSWR<BankAccount[]>('/api/accounts')

  return {
    accounts: data ?? [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}
```

**Step 2: Crear hook useCards**

```typescript
// src/hooks/use-cards.ts
'use client'

import useSWR from 'swr'

interface CreditCard {
  id: string
  name: string
  lastFourDigits: string
  creditLimitMXN: number
  creditLimitUSD: number | null
  currentBalanceMXN: number
  currentBalanceUSD: number | null
  cutOffDay: number
  paymentDueDay: number
  color: string | null
  isActive: boolean
}

export function useCards() {
  const { data, error, isLoading, mutate } = useSWR<CreditCard[]>('/api/cards')

  return {
    cards: data ?? [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}
```

**Step 3: Crear hook useCategories**

```typescript
// src/hooks/use-categories.ts
'use client'

import useSWR from 'swr'
import type { Category } from '@/lib/categories'

export function useCategories() {
  const { data, error, isLoading, mutate } = useSWR<Category[]>('/api/categories')

  return {
    categories: data ?? [],
    expenseCategories: (data ?? []).filter((c) => c.type === 'expense'),
    incomeCategories: (data ?? []).filter((c) => c.type === 'income'),
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}
```

**Step 4: Crear hook useTransactions con paginación**

```typescript
// src/hooks/use-transactions.ts
'use client'

import useSWR from 'swr'

interface Transaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  currency: string
  category: string
  description: string | null
  date: string
  bankAccountId: string | null
  creditCardId: string | null
  isCardPayment: boolean
  targetCardId: string | null
  bankAccount: { id: string; name: string; color: string | null } | null
  creditCard: { id: string; name: string; color: string | null } | null
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface TransactionsResponse {
  transactions: Transaction[]
  pagination: Pagination
}

interface UseTransactionsParams {
  page?: number
  limit?: number
  type?: string
  category?: string
}

export function useTransactions(params: UseTransactionsParams = {}) {
  const { page = 1, limit = 20, type, category } = params

  const searchParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  })
  if (type && type !== 'all') searchParams.append('type', type)
  if (category && category !== 'all') searchParams.append('category', category)

  const key = `/api/transactions?${searchParams.toString()}`

  const { data, error, isLoading, mutate } = useSWR<TransactionsResponse>(
    key,
    async (url: string) => {
      const res = await fetch(url)
      const json = await res.json()
      return {
        transactions: json.data ?? [],
        pagination: json.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
      }
    }
  )

  return {
    transactions: data?.transactions ?? [],
    pagination: data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}
```

**Step 5: Commit**

```bash
git add src/hooks/use-accounts.ts src/hooks/use-cards.ts src/hooks/use-categories.ts src/hooks/use-transactions.ts
git commit -m "feat: add SWR-based data fetching hooks"
```

---

### Task 1.3: Refactorizar useUserCurrencies con SWR

**Files:**
- Modify: `src/hooks/use-user-currencies.ts`

**Step 1: Reescribir hook con SWR**

```typescript
// src/hooks/use-user-currencies.ts
'use client'

import useSWR from 'swr'
import { useMemo } from 'react'
import { CURRENCIES, type CurrencyInfo } from '@/lib/currencies'

interface UserCurrenciesResponse {
  currencies: string[]
  primaryCurrency: string
}

export function useUserCurrencies() {
  const { data, error, isLoading } = useSWR<UserCurrenciesResponse>(
    '/api/user/currencies',
    async (url: string) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Error fetching currencies')
      const json = await res.json()
      return json.data
    }
  )

  const currencies = data?.currencies ?? ['USD']
  const primaryCurrency = data?.primaryCurrency ?? 'USD'

  const currencyOptions = useMemo(() => {
    return currencies
      .map((code) => CURRENCIES[code])
      .filter(Boolean) as CurrencyInfo[]
  }, [currencies])

  return {
    currencies,
    primaryCurrency,
    currencyOptions,
    isLoading,
    error: error ? (error instanceof Error ? error.message : 'Error') : null,
  }
}
```

**Step 2: Verificar que funciona**

```bash
npm run dev
```
Expected: Páginas que usan useUserCurrencies funcionan correctamente

**Step 3: Commit**

```bash
git add src/hooks/use-user-currencies.ts
git commit -m "refactor: migrate useUserCurrencies to SWR with memoization"
```

---

### Task 1.4: Migrar Accounts Page a SWR

**Files:**
- Modify: `src/app/(dashboard)/accounts/page.tsx`

**Step 1: Reemplazar useState/useEffect con hook SWR**

Cambios principales:
- Eliminar `useState` para accounts
- Eliminar `fetchAccounts` function
- Eliminar `useEffect` que llama a fetchAccounts
- Usar `useAccounts()` hook
- Usar `mutate()` después de crear/editar/eliminar

```typescript
// Antes (eliminar):
const [accounts, setAccounts] = useState<BankAccount[]>([])
const [isLoading, setIsLoading] = useState(true)

const fetchAccounts = async () => { ... }

useEffect(() => {
  fetchAccounts()
}, [])

// Después (añadir):
import { useAccounts } from '@/hooks/use-accounts'

const { accounts, isLoading, mutate } = useAccounts()

// En onSubmit, después de éxito:
mutate() // En lugar de fetchAccounts()

// En handleDelete, después de éxito:
mutate() // En lugar de fetchAccounts()
```

**Step 2: Verificar funcionamiento**

```bash
npm run dev
```
Navigate to /accounts - verificar CRUD funciona

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/accounts/page.tsx
git commit -m "refactor: migrate accounts page to SWR"
```

---

### Task 1.5: Migrar Cards Page a SWR

**Files:**
- Modify: `src/app/(dashboard)/cards/page.tsx`

**Step 1: Aplicar mismo patrón que accounts**

```typescript
import { useCards } from '@/hooks/use-cards'

const { cards, isLoading, mutate } = useCards()

// Reemplazar fetchCards() con mutate()
```

**Step 2: Verificar funcionamiento**

```bash
npm run dev
```
Navigate to /cards - verificar CRUD funciona

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/cards/page.tsx
git commit -m "refactor: migrate cards page to SWR"
```

---

### Task 1.6: Migrar Transactions Page a SWR

**Files:**
- Modify: `src/app/(dashboard)/transactions/page.tsx`

**Step 1: Reemplazar fetching con hooks SWR**

```typescript
import { useTransactions } from '@/hooks/use-transactions'
import { useAccounts } from '@/hooks/use-accounts'
import { useCards } from '@/hooks/use-cards'
import { useCategories } from '@/hooks/use-categories'

// Estado para filtros y paginación
const [page, setPage] = useState(1)
const [filterType, setFilterType] = useState('all')
const [filterCategory, setFilterCategory] = useState('all')

// Hooks SWR
const { transactions, pagination, isLoading, mutate } = useTransactions({
  page,
  type: filterType,
  category: filterCategory,
})
const { accounts } = useAccounts()
const { cards } = useCards()
const { categories: userCategories, expenseCategories, incomeCategories } = useCategories()

// Eliminar fetchTransactions, fetchAccountsAndCards
// Eliminar useEffects de fetching
```

**Step 2: Actualizar handlers para usar mutate**

```typescript
// En onSubmit después de éxito:
mutate()

// En handleDelete después de éxito:
mutate()

// En paginación:
onClick={() => setPage(page - 1)}
onClick={() => setPage(page + 1)}
```

**Step 3: Verificar funcionamiento**

```bash
npm run dev
```
Navigate to /transactions - verificar filtros, paginación, CRUD

**Step 4: Commit**

```bash
git add src/app/\(dashboard\)/transactions/page.tsx
git commit -m "refactor: migrate transactions page to SWR with filters"
```

---

### Task 1.7: Migrar Budgets Page a SWR

**Files:**
- Create: `src/hooks/use-budgets.ts`
- Modify: `src/app/(dashboard)/budgets/page.tsx`

**Step 1: Crear hook useBudgets**

```typescript
// src/hooks/use-budgets.ts
'use client'

import useSWR from 'swr'

interface Budget {
  id: string
  categoryId: string
  category: {
    id: string
    name: string
    icon: string
    color: string
    type: string
  }
  limitAmount: number
  currency: string
  currentSpent: number
  month: string
}

export function useBudgets(month: string) {
  const { data, error, isLoading, mutate } = useSWR<Budget[]>(
    `/api/budgets?month=${month}`
  )

  return {
    budgets: data ?? [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}
```

**Step 2: Actualizar budgets page**

```typescript
import { useBudgets } from '@/hooks/use-budgets'

const { budgets, isLoading, mutate } = useBudgets(selectedMonth.toISOString())
```

**Step 3: Commit**

```bash
git add src/hooks/use-budgets.ts src/app/\(dashboard\)/budgets/page.tsx
git commit -m "refactor: migrate budgets page to SWR"
```

---

### Task 1.8: Migrar Remaining Pages a SWR

**Files:**
- Modify: `src/app/(dashboard)/recurring/page.tsx`
- Modify: `src/app/(dashboard)/categories/page.tsx`
- Modify: `src/app/(dashboard)/reports/page.tsx`

**Step 1: Crear hooks necesarios y migrar páginas**

Aplicar el mismo patrón:
1. Crear hook SWR si no existe
2. Reemplazar useState/useEffect con hook
3. Usar mutate() después de mutaciones

**Step 2: Verificar todas las páginas**

```bash
npm run dev
```

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/recurring/page.tsx src/app/\(dashboard\)/categories/page.tsx src/app/\(dashboard\)/reports/page.tsx
git commit -m "refactor: migrate remaining pages to SWR"
```

---

## Phase 2: Bundle Optimization (CRITICAL)

**Objetivo:** Reducir el bundle size inicial mediante lazy loading de componentes pesados.

**Reglas Vercel aplicadas:**
- `bundle-dynamic-imports` - Lazy load componentes pesados
- `bundle-defer-third-party` - Diferir carga de third-party
- `bundle-preload` - Precargar en hover

### Task 2.1: Lazy Load Recharts en Reports

**Files:**
- Modify: `src/app/(dashboard)/reports/page.tsx`
- Create: `src/components/lazy-charts.tsx`

**Step 1: Crear componente lazy para charts**

```typescript
// src/components/lazy-charts.tsx
'use client'

import dynamic from 'next/dynamic'

export const LazyBarChart = dynamic(
  () => import('recharts').then((mod) => mod.BarChart),
  {
    loading: () => (
      <div className="h-[300px] bg-muted animate-pulse rounded-lg" />
    ),
    ssr: false,
  }
)

export const LazyPieChart = dynamic(
  () => import('recharts').then((mod) => mod.PieChart),
  {
    loading: () => (
      <div className="h-[300px] bg-muted animate-pulse rounded-lg" />
    ),
    ssr: false,
  }
)

export const LazyLineChart = dynamic(
  () => import('recharts').then((mod) => mod.LineChart),
  {
    loading: () => (
      <div className="h-[300px] bg-muted animate-pulse rounded-lg" />
    ),
    ssr: false,
  }
)

// Re-exportar componentes que no necesitan lazy load
export {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Bar,
  Pie,
  Cell,
  Line,
  ResponsiveContainer,
} from 'recharts'
```

**Step 2: Actualizar reports page para usar lazy charts**

```typescript
// En lugar de:
import { BarChart, PieChart, ... } from 'recharts'

// Usar:
import {
  LazyBarChart as BarChart,
  LazyPieChart as PieChart,
  XAxis,
  YAxis,
  ...
} from '@/components/lazy-charts'
```

**Step 3: Verificar**

```bash
npm run build
npm run start
```
Navigate to /reports - charts deben cargar después de la página

**Step 4: Commit**

```bash
git add src/components/lazy-charts.tsx src/app/\(dashboard\)/reports/page.tsx
git commit -m "perf: lazy load recharts components"
```

---

### Task 2.2: Expandir Lazy Forms

**Files:**
- Modify: `src/components/lazy-forms.tsx`

**Step 1: Añadir más forms al lazy loading**

```typescript
// src/components/lazy-forms.tsx - añadir:
export const LazyTransactionForm = dynamic(
  () => import('@/components/transaction-form').then((mod) => mod.TransactionForm),
  {
    loading: () => <FormSkeleton />,
    ssr: false,
  }
)

export const LazyAccountForm = dynamic(
  () => import('@/components/account-form').then((mod) => mod.AccountForm),
  {
    loading: () => <FormSkeleton />,
    ssr: false,
  }
)

export const LazyCardForm = dynamic(
  () => import('@/components/card-form').then((mod) => mod.CardForm),
  {
    loading: () => <FormSkeleton />,
    ssr: false,
  }
)
```

**Nota:** Esto requiere extraer los forms inline a componentes separados (ver Task 2.3)

**Step 2: Commit**

```bash
git add src/components/lazy-forms.tsx
git commit -m "perf: add more lazy-loaded form components"
```

---

### Task 2.3: Extraer Forms a Componentes Separados

**Files:**
- Create: `src/components/transaction-form.tsx`
- Create: `src/components/account-form.tsx`
- Create: `src/components/card-form.tsx`
- Modify: `src/app/(dashboard)/transactions/page.tsx`
- Modify: `src/app/(dashboard)/accounts/page.tsx`
- Modify: `src/app/(dashboard)/cards/page.tsx`

**Step 1: Extraer TransactionForm**

Mover el form de transactions/page.tsx a su propio componente con props:
- `initialData?: Transaction`
- `onSuccess: () => void`
- `onCancel: () => void`

**Step 2: Extraer AccountForm y CardForm**

Mismo patrón de extracción

**Step 3: Actualizar páginas para usar lazy forms**

```typescript
import { LazyTransactionForm } from '@/components/lazy-forms'

// En el Dialog:
<LazyTransactionForm
  initialData={editingTransaction}
  onSuccess={() => {
    setIsDialogOpen(false)
    mutate()
  }}
  onCancel={() => setIsDialogOpen(false)}
/>
```

**Step 4: Commit**

```bash
git add src/components/transaction-form.tsx src/components/account-form.tsx src/components/card-form.tsx
git add src/app/\(dashboard\)/transactions/page.tsx src/app/\(dashboard\)/accounts/page.tsx src/app/\(dashboard\)/cards/page.tsx
git commit -m "refactor: extract forms to separate components for lazy loading"
```

---

### Task 2.4: Implementar Preload on Hover

**Files:**
- Create: `src/hooks/use-preload.ts`
- Modify: Botones que abren dialogs

**Step 1: Crear hook de preload**

```typescript
// src/hooks/use-preload.ts
'use client'

import { useCallback } from 'react'

export function usePreload() {
  const preloadComponent = useCallback((importFn: () => Promise<unknown>) => {
    importFn()
  }, [])

  return { preloadComponent }
}
```

**Step 2: Aplicar preload en botones**

```typescript
<Button
  onClick={openCreateDialog}
  onMouseEnter={() => import('@/components/transaction-form')}
>
  <Plus className="w-4 h-4 mr-2" />
  Nueva Transacción
</Button>
```

**Step 3: Commit**

```bash
git add src/hooks/use-preload.ts
git commit -m "perf: add preload on hover for lazy components"
```

---

### Task 2.5: Analizar Bundle Size

**Files:**
- Modify: `next.config.ts`

**Step 1: Habilitar análisis de bundle**

```bash
npm install @next/bundle-analyzer
```

```typescript
// next.config.ts
import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

export default withBundleAnalyzer(nextConfig)
```

**Step 2: Ejecutar análisis**

```bash
ANALYZE=true npm run build
```

**Step 3: Commit**

```bash
git add next.config.ts package.json
git commit -m "chore: add bundle analyzer for optimization tracking"
```

---

### Task 2.6: Optimizar Imports de Lucide Icons

**Files:**
- Todos los archivos que importan de lucide-react

**Step 1: Verificar que imports son tree-shakeable**

```typescript
// ✅ Correcto (tree-shakeable):
import { Plus, Trash2, Pencil } from 'lucide-react'

// ❌ Incorrecto (importa todo):
import * as Icons from 'lucide-react'
```

**Step 2: Auditar y corregir si es necesario**

```bash
grep -r "from 'lucide-react'" src/ --include="*.tsx"
```

**Step 3: Commit si hay cambios**

```bash
git commit -m "perf: ensure tree-shakeable lucide imports"
```

---

## Phase 3: Re-render Optimization (MEDIUM)

**Objetivo:** Reducir re-renders innecesarios mediante memoización y mejores patrones.

**Reglas Vercel aplicadas:**
- `rerender-memo` - Memoizar componentes costosos
- `rerender-functional-setstate` - Usar setState funcional
- `js-cache-function-results` - Cachear resultados de funciones

### Task 3.1: Memoizar formatCurrency

**Files:**
- Create: `src/lib/format-utils.ts`
- Modify: Archivos que usan formatCurrency inline

**Step 1: Crear utilidad memoizada**

```typescript
// src/lib/format-utils.ts
const formattersCache = new Map<string, Intl.NumberFormat>()

export function formatCurrency(amount: number, currency: string): string {
  const key = `${currency}-es-MX`

  if (!formattersCache.has(key)) {
    formattersCache.set(
      key,
      new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency,
      })
    )
  }

  return formattersCache.get(key)!.format(amount)
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
```

**Step 2: Actualizar imports en archivos**

```typescript
// En lugar de definir formatCurrency inline:
import { formatCurrency, formatDate } from '@/lib/format-utils'
```

**Step 3: Commit**

```bash
git add src/lib/format-utils.ts
git commit -m "perf: memoize Intl.NumberFormat instances"
```

---

### Task 3.2: Optimizar watch() de React Hook Form

**Files:**
- Modify: `src/app/(dashboard)/transactions/page.tsx`
- Modify: Otros forms que usen múltiples watch()

**Step 1: Usar useWatch con campos específicos**

```typescript
// Antes:
const watchType = watch('type')
const watchSourceType = watch('sourceType')
const watchIsCardPayment = watch('isCardPayment')

// Después - usar un solo useWatch:
import { useWatch } from 'react-hook-form'

const [type, sourceType, isCardPayment] = useWatch({
  control,
  name: ['type', 'sourceType', 'isCardPayment'],
})
```

**Step 2: Commit**

```bash
git commit -m "perf: optimize react-hook-form watch usage"
```

---

### Task 3.3: Memoizar Componentes de Lista

**Files:**
- Create: `src/components/transaction-item.tsx`
- Modify: `src/app/(dashboard)/transactions/page.tsx`

**Step 1: Extraer y memoizar item de lista**

```typescript
// src/components/transaction-item.tsx
'use client'

import { memo } from 'react'
import { formatCurrency, formatDate } from '@/lib/format-utils'
// ... otros imports

interface TransactionItemProps {
  transaction: Transaction
  onEdit: (t: Transaction) => void
  onDelete: (id: string) => void
}

export const TransactionItem = memo(function TransactionItem({
  transaction,
  onEdit,
  onDelete,
}: TransactionItemProps) {
  // ... render
})
```

**Step 2: Usar en transactions page**

```typescript
{transactions.map((transaction) => (
  <TransactionItem
    key={transaction.id}
    transaction={transaction}
    onEdit={openEditDialog}
    onDelete={(id) => {
      setDeletingTransactionId(id)
      setIsDeleteDialogOpen(true)
    }}
  />
))}
```

**Step 3: Commit**

```bash
git add src/components/transaction-item.tsx
git commit -m "perf: memoize transaction list items"
```

---

### Task 3.4: Usar useCallback para Handlers

**Files:**
- Modify: `src/app/(dashboard)/transactions/page.tsx`
- Modify: `src/app/(dashboard)/accounts/page.tsx`
- Modify: `src/app/(dashboard)/cards/page.tsx`

**Step 1: Envolver handlers en useCallback**

```typescript
const openEditDialog = useCallback((transaction: Transaction) => {
  setEditingTransaction(transaction)
  // ... reset form
  setIsDialogOpen(true)
}, [reset, accounts])

const openCreateDialog = useCallback(() => {
  setEditingTransaction(null)
  // ... reset form
  setIsDialogOpen(true)
}, [reset, primaryCurrency, accounts])
```

**Step 2: Commit**

```bash
git commit -m "perf: memoize event handlers with useCallback"
```

---

### Task 3.5: Optimizar Derivación de Estado

**Files:**
- Modify: `src/app/(dashboard)/transactions/page.tsx`

**Step 1: Usar useMemo para cálculos derivados**

```typescript
// Antes:
const expenseCategories = userCategories.filter((c) => c.type === 'expense')
const incomeCategories = userCategories.filter((c) => c.type === 'income')
const categories = watchType === 'expense' ? expenseCategories : incomeCategories

// Después:
const categories = useMemo(() => {
  return userCategories.filter((c) => c.type === type)
}, [userCategories, type])
```

**Step 2: Commit**

```bash
git commit -m "perf: use useMemo for derived state calculations"
```

---

## Phase 4: Component Composition (MEDIUM)

**Objetivo:** Mejorar la composición de componentes para mejor mantenibilidad y rendimiento.

**Skill de apoyo:** `vercel-composition-patterns`

### Task 4.1: Crear Compound Component para Dialog + Form

**Files:**
- Create: `src/components/form-dialog.tsx`

**Step 1: Crear componente compuesto**

```typescript
// src/components/form-dialog.tsx
'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ReactNode } from 'react'

interface FormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
}

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Usar en páginas**

```typescript
<FormDialog
  open={isDialogOpen}
  onOpenChange={setIsDialogOpen}
  title={editingTransaction ? 'Editar Transacción' : 'Nueva Transacción'}
  description="Registra un nuevo ingreso o gasto"
>
  <LazyTransactionForm ... />
</FormDialog>
```

**Step 3: Commit**

```bash
git add src/components/form-dialog.tsx
git commit -m "refactor: create FormDialog compound component"
```

---

### Task 4.2: Crear DeleteConfirmDialog Reutilizable

**Files:**
- Create: `src/components/delete-confirm-dialog.tsx`

**Step 1: Crear componente**

```typescript
// src/components/delete-confirm-dialog.tsx
'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  title?: string
  description?: string
  isLoading?: boolean
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title = '¿Eliminar?',
  description = 'Esta acción no se puede deshacer.',
  isLoading = false,
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-danger hover:bg-danger/90"
          >
            {isLoading ? 'Eliminando...' : 'Eliminar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

**Step 2: Usar en páginas**

```typescript
<DeleteConfirmDialog
  open={isDeleteDialogOpen}
  onOpenChange={setIsDeleteDialogOpen}
  onConfirm={handleDelete}
  title="¿Eliminar transacción?"
  description="El balance de la cuenta/tarjeta asociada será actualizado."
/>
```

**Step 3: Commit**

```bash
git add src/components/delete-confirm-dialog.tsx
git commit -m "refactor: create reusable DeleteConfirmDialog"
```

---

### Task 4.3: Crear EmptyState Component

**Files:**
- Create: `src/components/empty-state.tsx`

**Step 1: Crear componente**

```typescript
// src/components/empty-state.tsx
import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  message: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  icon: Icon,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <Icon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{message}</p>
        {actionLabel && onAction && (
          <Button className="mt-4" onClick={onAction}>
            <Plus className="w-4 h-4 mr-2" />
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
```

**Step 2: Usar en páginas**

```typescript
{transactions.length === 0 ? (
  <EmptyState
    icon={Receipt}
    message="No hay transacciones"
    actionLabel="Registrar tu primera transacción"
    onAction={openCreateDialog}
  />
) : (
  // ... lista
)}
```

**Step 3: Commit**

```bash
git add src/components/empty-state.tsx
git commit -m "refactor: create reusable EmptyState component"
```

---

### Task 4.4: Crear DataList Component

**Files:**
- Create: `src/components/data-list.tsx`

**Step 1: Crear componente genérico para listas**

```typescript
// src/components/data-list.tsx
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { ReactNode } from 'react'

interface DataListProps<T> {
  items: T[]
  renderItem: (item: T) => ReactNode
  keyExtractor: (item: T) => string
  emptyState?: ReactNode
  isLoading?: boolean
  loadingState?: ReactNode
}

export function DataList<T>({
  items,
  renderItem,
  keyExtractor,
  emptyState,
  isLoading,
  loadingState,
}: DataListProps<T>) {
  if (isLoading && loadingState) {
    return <>{loadingState}</>
  }

  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {items.map((item) => (
            <div key={keyExtractor(item)}>{renderItem(item)}</div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/data-list.tsx
git commit -m "refactor: create generic DataList component"
```

---

## Phase 5: Server Optimizations (LOW)

**Objetivo:** Optimizaciones adicionales en el servidor para completar el stack.

### Task 5.1: Añadir Cache Headers a API Routes

**Files:**
- Modify: `src/app/api/categories/route.ts`
- Modify: `src/app/api/user/currencies/route.ts`

**Step 1: Añadir headers de cache para datos estáticos**

```typescript
// Para endpoints con datos que cambian poco:
return NextResponse.json(
  { data },
  {
    headers: {
      'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
    },
  }
)
```

**Step 2: Commit**

```bash
git commit -m "perf: add cache headers to static API endpoints"
```

---

### Task 5.2: Implementar after() para Background Tasks

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

**Step 1: Usar after() de Next.js 15+ para tareas no críticas**

```typescript
import { after } from 'next/server'

// En el server component:
after(async () => {
  // Tareas que no bloquean el render
  await generatePendingTransactions(userId)
  await generateAllNotifications(userId)
})
```

**Step 2: Commit**

```bash
git commit -m "perf: use after() for non-blocking background tasks"
```

---

### Task 5.3: Añadir Error Boundaries

**Files:**
- Create: `src/components/error-boundary.tsx`
- Modify: `src/app/(dashboard)/layout.tsx`

**Step 1: Crear Error Boundary**

```typescript
// src/components/error-boundary.tsx
'use client'

import { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <Card>
            <CardHeader>
              <CardTitle>Algo salió mal</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Ha ocurrido un error inesperado.
              </p>
              <Button onClick={() => this.setState({ hasError: false })}>
                Reintentar
              </Button>
            </CardContent>
          </Card>
        )
      )
    }

    return this.props.children
  }
}
```

**Step 2: Commit**

```bash
git add src/components/error-boundary.tsx
git commit -m "feat: add ErrorBoundary component"
```

---

## Checklist de Verificación Final

Después de completar todas las fases, verificar:

- [ ] `npm run build` sin errores
- [ ] `npm run lint` sin errores
- [ ] `npm run test:run` todos los tests pasan
- [ ] Todas las páginas cargan correctamente
- [ ] CRUD funciona en todas las entidades
- [ ] No hay regresiones de funcionalidad
- [ ] Bundle size reducido (verificar con analyzer)

---

## Métricas de Éxito

| Métrica | Antes | Objetivo |
|---------|-------|----------|
| Score General | 6.2/10 | 8.5/10 |
| Client Fetching | 4/10 | 9/10 |
| Bundle Size | 7/10 | 9/10 |
| Re-render Opt | 6/10 | 8/10 |

---

## Notas Adicionales

### Skills a invocar durante implementación:

- `superpowers:test-driven-development` - Para cada nueva feature
- `vercel-composition-patterns` - Al refactorizar componentes
- `code-best-practices` - Para code review
- `superpowers:verification-before-completion` - Antes de cada commit

### Archivos de referencia:

- Reglas Vercel: `.claude/skills/vercel-react-best-practices/rules/`
- Patrones de composición: `.claude/skills/vercel-composition-patterns/`
