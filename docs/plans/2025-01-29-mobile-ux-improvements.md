# Mobile UX Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Mejorar significativamente la experiencia de usuario en dispositivos móviles con navegación inferior fija, pull-to-refresh, búsqueda global y mejoras visuales.

**Architecture:** Transformar la navegación superior scrolleable a una barra inferior fija estilo app nativa. Implementar pull-to-refresh usando un hook personalizado. Agregar búsqueda global con Command Palette (cmdk). Mejorar estados vacíos con ilustraciones SVG inline.

**Tech Stack:** React 19, Next.js 16, Tailwind CSS 4, Framer Motion, cmdk (Command Menu), SWR

---

## Task 1: Crear componente de navegación inferior fija

**Files:**
- Create: `src/components/mobile-bottom-nav.tsx`
- Modify: `src/app/(dashboard)/layout.tsx`
- Modify: `src/components/dashboard-nav.tsx`

**Step 1: Crear el componente MobileBottomNav**

```tsx
// src/components/mobile-bottom-nav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Landmark,
  CreditCard,
  Receipt,
  MoreHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Repeat, PiggyBank, BarChart3, Tags } from 'lucide-react'

const mainNavItems = [
  { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
  { href: '/accounts', label: 'Cuentas', icon: Landmark },
  { href: '/cards', label: 'Tarjetas', icon: CreditCard },
  { href: '/transactions', label: 'Movim.', icon: Receipt },
]

const moreNavItems = [
  { href: '/recurring', label: 'Recurrentes', icon: Repeat },
  { href: '/budgets', label: 'Presupuestos', icon: PiggyBank },
  { href: '/reports', label: 'Reportes', icon: BarChart3 },
  { href: '/categories', label: 'Categorías', icon: Tags },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  const isMoreActive = moreNavItems.some((item) => pathname === item.href)

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t safe-bottom">
      <div className="flex items-center justify-around h-16">
        {mainNavItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors touch-feedback',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <item.icon className={cn('w-5 h-5', isActive && 'stroke-[2.5]')} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}

        {/* More menu */}
        <DropdownMenu open={moreOpen} onOpenChange={setMoreOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors touch-feedback',
                isMoreActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <MoreHorizontal className={cn('w-5 h-5', isMoreActive && 'stroke-[2.5]')} />
              <span className="text-[10px] font-medium">Más</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-48 mb-2">
            {moreNavItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <DropdownMenuItem key={item.href} asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 cursor-pointer',
                      isActive && 'text-primary font-medium'
                    )}
                    onClick={() => setMoreOpen(false)}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}
```

**Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: Sin errores

**Step 3: Modificar dashboard-nav.tsx para ocultar nav móvil antiguo**

En `src/components/dashboard-nav.tsx`, eliminar completamente la sección del Mobile nav (líneas 141-164):

```tsx
// ELIMINAR esta sección completa:
{/* Mobile nav */}
<div className="md:hidden relative border-t safe-bottom">
  ...
</div>
```

**Step 4: Modificar layout.tsx para incluir MobileBottomNav**

```tsx
// src/app/(dashboard)/layout.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardNav } from '@/components/dashboard-nav'
import { MobileBottomNav } from '@/components/mobile-bottom-nav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  if (!session.user.onboardingCompleted) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardNav user={session.user} />
      <main className="container mx-auto p-4 md:p-8 pb-24 md:pb-8">{children}</main>
      <MobileBottomNav />
    </div>
  )
}
```

**Step 5: Probar en el navegador**

Run: `npm run dev`
Test: Abrir en móvil o DevTools (375x667), verificar que la navegación inferior aparece y funciona

**Step 6: Commit**

```bash
git add src/components/mobile-bottom-nav.tsx src/components/dashboard-nav.tsx src/app/\(dashboard\)/layout.tsx
git commit -m "feat: add fixed bottom navigation for mobile

- Create MobileBottomNav component with 4 main items + More menu
- Remove old scrolling mobile nav from DashboardNav
- Add bottom padding to main content to prevent overlap
- More menu includes: Recurrentes, Presupuestos, Reportes, Categorías"
```

---

## Task 2: Implementar hook usePullToRefresh

**Files:**
- Create: `src/hooks/use-pull-to-refresh.ts`

**Step 1: Crear el hook**

```tsx
// src/hooks/use-pull-to-refresh.ts
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useHapticFeedback } from './use-haptic-feedback'

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number
  disabled?: boolean
}

interface UsePullToRefreshReturn {
  isRefreshing: boolean
  pullDistance: number
  containerRef: React.RefObject<HTMLDivElement>
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  disabled = false,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const currentY = useRef(0)
  const { triggerHaptic } = useHapticFeedback()

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return
    const container = containerRef.current
    if (!container || container.scrollTop > 0) return

    startY.current = e.touches[0].clientY
  }, [disabled, isRefreshing])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing || startY.current === 0) return
    const container = containerRef.current
    if (!container || container.scrollTop > 0) {
      startY.current = 0
      setPullDistance(0)
      return
    }

    currentY.current = e.touches[0].clientY
    const distance = Math.max(0, currentY.current - startY.current)

    // Apply resistance
    const resistance = 0.5
    const resistedDistance = distance * resistance

    setPullDistance(Math.min(resistedDistance, threshold * 1.5))

    if (resistedDistance >= threshold) {
      triggerHaptic('light')
    }
  }, [disabled, isRefreshing, threshold, triggerHaptic])

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing) return

    if (pullDistance >= threshold) {
      setIsRefreshing(true)
      triggerHaptic('medium')

      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }

    setPullDistance(0)
    startY.current = 0
  }, [disabled, isRefreshing, pullDistance, threshold, onRefresh, triggerHaptic])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: true })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  return {
    isRefreshing,
    pullDistance,
    containerRef,
  }
}
```

**Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: Sin errores

**Step 3: Commit**

```bash
git add src/hooks/use-pull-to-refresh.ts
git commit -m "feat: add usePullToRefresh hook for mobile refresh gesture"
```

---

## Task 3: Crear componente PullToRefresh

**Files:**
- Create: `src/components/pull-to-refresh.tsx`

**Step 1: Crear el componente**

```tsx
// src/components/pull-to-refresh.tsx
'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Loader2, ArrowDown } from 'lucide-react'
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh'
import { cn } from '@/lib/utils'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: ReactNode
  className?: string
  disabled?: boolean
}

export function PullToRefresh({
  onRefresh,
  children,
  className,
  disabled = false,
}: PullToRefreshProps) {
  const { isRefreshing, pullDistance, containerRef } = usePullToRefresh({
    onRefresh,
    disabled,
  })

  const threshold = 80
  const progress = Math.min(pullDistance / threshold, 1)
  const showIndicator = pullDistance > 10 || isRefreshing

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
    >
      {/* Pull indicator */}
      <motion.div
        className="absolute left-0 right-0 flex items-center justify-center pointer-events-none z-10"
        style={{
          top: -40,
          height: 40,
        }}
        animate={{
          y: showIndicator ? pullDistance : 0,
          opacity: showIndicator ? 1 : 0,
        }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      >
        <div className="bg-card rounded-full p-2 shadow-md">
          {isRefreshing ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : (
            <motion.div
              animate={{ rotate: progress * 180 }}
              transition={{ type: 'spring', damping: 20 }}
            >
              <ArrowDown
                className={cn(
                  'w-5 h-5 transition-colors',
                  progress >= 1 ? 'text-primary' : 'text-muted-foreground'
                )}
              />
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Content with pull offset */}
      <motion.div
        animate={{
          y: isRefreshing ? 50 : pullDistance > 0 ? pullDistance : 0,
        }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      >
        {children}
      </motion.div>
    </div>
  )
}
```

**Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: Sin errores

**Step 3: Commit**

```bash
git add src/components/pull-to-refresh.tsx
git commit -m "feat: add PullToRefresh wrapper component with visual indicator"
```

---

## Task 4: Integrar Pull-to-Refresh en página de transacciones

**Files:**
- Modify: `src/app/(dashboard)/transactions/page.tsx`

**Step 1: Agregar import y wrapper**

Al inicio del archivo, agregar import:
```tsx
import { PullToRefresh } from '@/components/pull-to-refresh'
```

**Step 2: Envolver el contenido principal**

Modificar el return para envolver con PullToRefresh:

```tsx
// Dentro de TransactionsPage, modificar el return:

const handleRefresh = async () => {
  await mutate()
}

return (
  <PullToRefresh onRefresh={handleRefresh} className="min-h-[calc(100vh-12rem)]">
    <div className="space-y-6">
      {/* ... resto del contenido ... */}
    </div>
  </PullToRefresh>
)
```

**Step 3: Probar en móvil**

Run: `npm run dev`
Test: En DevTools móvil, hacer pull-down en la lista de transacciones

**Step 4: Commit**

```bash
git add src/app/\(dashboard\)/transactions/page.tsx
git commit -m "feat: add pull-to-refresh to transactions page"
```

---

## Task 5: Instalar cmdk para búsqueda global

**Files:**
- Modify: `package.json`

**Step 1: Instalar dependencia**

Run: `npm install cmdk`
Expected: Instalación exitosa

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add cmdk for global search command palette"
```

---

## Task 6: Crear componente de búsqueda global

**Files:**
- Create: `src/components/global-search.tsx`

**Step 1: Crear el componente**

```tsx
// src/components/global-search.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  LayoutDashboard,
  Landmark,
  CreditCard,
  Receipt,
  Repeat,
  PiggyBank,
  BarChart3,
  Tags,
  X,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHapticFeedback } from '@/hooks/use-haptic-feedback'
import { formatCurrency, formatDate } from '@/lib/format-utils'

const navigationItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, keywords: ['inicio', 'home'] },
  { href: '/accounts', label: 'Cuentas', icon: Landmark, keywords: ['bank', 'banco'] },
  { href: '/cards', label: 'Tarjetas', icon: CreditCard, keywords: ['credito', 'credit'] },
  { href: '/transactions', label: 'Transacciones', icon: Receipt, keywords: ['movimientos', 'gastos'] },
  { href: '/recurring', label: 'Recurrentes', icon: Repeat, keywords: ['suscripciones', 'automatico'] },
  { href: '/budgets', label: 'Presupuestos', icon: PiggyBank, keywords: ['limite', 'meta'] },
  { href: '/reports', label: 'Reportes', icon: BarChart3, keywords: ['graficos', 'estadisticas'] },
  { href: '/categories', label: 'Categorías', icon: Tags, keywords: ['tipo', 'clasificacion'] },
]

interface Transaction {
  id: string
  description: string | null
  amount: number
  currency: string
  type: 'income' | 'expense'
  date: string
  category: string
}

interface GlobalSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const router = useRouter()
  const { triggerHaptic } = useHapticFeedback()
  const [search, setSearch] = useState('')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Search transactions when query changes
  useEffect(() => {
    if (!search || search.length < 2) {
      setTransactions([])
      return
    }

    const searchTransactions = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/transactions?search=${encodeURIComponent(search)}&limit=5`)
        const data = await res.json()
        setTransactions(data.data || [])
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    const debounce = setTimeout(searchTransactions, 300)
    return () => clearTimeout(debounce)
  }, [search])

  const handleSelect = useCallback((href: string) => {
    triggerHaptic('light')
    onOpenChange(false)
    setSearch('')
    router.push(href)
  }, [router, onOpenChange, triggerHaptic])

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
      if (e.key === 'Escape') {
        onOpenChange(false)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open, onOpenChange])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => onOpenChange(false)}
          />

          {/* Command palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-x-4 top-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg z-50"
          >
            <Command className="bg-card rounded-xl shadow-2xl border overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b">
                <Search className="w-5 h-5 text-muted-foreground shrink-0" />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Buscar páginas o transacciones..."
                  className="flex-1 bg-transparent outline-none text-base placeholder:text-muted-foreground"
                  autoFocus
                />
                {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                <button
                  onClick={() => onOpenChange(false)}
                  className="p-1 hover:bg-muted rounded-md md:hidden"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <Command.List className="max-h-[60vh] overflow-y-auto p-2">
                <Command.Empty className="py-6 text-center text-muted-foreground">
                  No se encontraron resultados
                </Command.Empty>

                {/* Navigation */}
                <Command.Group heading="Páginas" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  {navigationItems.map((item) => (
                    <Command.Item
                      key={item.href}
                      value={`${item.label} ${item.keywords.join(' ')}`}
                      onSelect={() => handleSelect(item.href)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer data-[selected=true]:bg-accent touch-feedback"
                    >
                      <item.icon className="w-4 h-4 text-muted-foreground" />
                      <span>{item.label}</span>
                    </Command.Item>
                  ))}
                </Command.Group>

                {/* Transactions */}
                {transactions.length > 0 && (
                  <Command.Group heading="Transacciones" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    {transactions.map((tx) => (
                      <Command.Item
                        key={tx.id}
                        value={tx.description || tx.category}
                        onSelect={() => handleSelect(`/transactions?search=${encodeURIComponent(tx.description || '')}`)}
                        className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg cursor-pointer data-[selected=true]:bg-accent touch-feedback"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="truncate">{tx.description || tx.category}</span>
                          <span className="text-xs text-muted-foreground">{formatDate(tx.date)}</span>
                        </div>
                        <span className={cn(
                          'font-mono text-sm shrink-0',
                          tx.type === 'income' ? 'text-success' : 'text-danger'
                        )}>
                          {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </Command.List>

              <div className="hidden md:flex items-center justify-between px-4 py-2 border-t text-xs text-muted-foreground">
                <span>Navegar con ↑↓ • Seleccionar con ↵</span>
                <span>ESC para cerrar</span>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

**Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: Sin errores

**Step 3: Commit**

```bash
git add src/components/global-search.tsx
git commit -m "feat: add global search component with command palette

- Search navigation pages
- Search transactions by description
- Keyboard shortcut Ctrl/Cmd+K
- Mobile-friendly fullscreen mode"
```

---

## Task 7: Integrar búsqueda global en DashboardNav

**Files:**
- Modify: `src/components/dashboard-nav.tsx`

**Step 1: Agregar imports y estado**

```tsx
// Agregar imports
import { Search } from 'lucide-react'
import { GlobalSearch } from '@/components/global-search'
import { useState } from 'react'
```

**Step 2: Agregar estado y botón de búsqueda**

Dentro del componente DashboardNav:

```tsx
const [searchOpen, setSearchOpen] = useState(false)

// En el div con flex items-center gap-2, agregar antes del botón de tema:
<Button
  variant="ghost"
  size="icon"
  onClick={() => setSearchOpen(true)}
  className="hidden md:flex"
>
  <Search className="h-5 w-5" />
  <span className="sr-only">Buscar</span>
</Button>

// Al final del componente, antes del closing </header>:
<GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
```

**Step 3: Agregar botón de búsqueda en mobile-bottom-nav**

En `src/components/mobile-bottom-nav.tsx`, agregar un botón de búsqueda flotante o en el header móvil. Alternativamente, integrar en el menú "Más".

**Step 4: Probar búsqueda**

Run: `npm run dev`
Test: Presionar Ctrl+K o tocar el botón de búsqueda

**Step 5: Commit**

```bash
git add src/components/dashboard-nav.tsx src/components/mobile-bottom-nav.tsx
git commit -m "feat: integrate global search in navigation

- Add search button to desktop nav
- Add Ctrl/Cmd+K keyboard shortcut
- Search icon visible in header"
```

---

## Task 8: Mejorar estados vacíos con ilustraciones

**Files:**
- Modify: `src/components/empty-state.tsx`

**Step 1: Crear versión mejorada del componente**

```tsx
// src/components/empty-state.tsx
'use client'

import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import { motion } from 'framer-motion'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  icon: Icon,
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted/50 flex items-center justify-center"
        >
          <Icon className="w-12 h-12 text-muted-foreground" />
        </motion.div>

        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">{message}</p>
        </motion.div>

        {actionLabel && onAction && (
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Button className="mt-6" onClick={onAction}>
              <Plus className="w-4 h-4 mr-2" />
              {actionLabel}
            </Button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}
```

**Step 2: Actualizar usos del componente en las páginas**

Buscar todos los usos de EmptyState y actualizar para incluir `title`:

Ejemplo en transactions:
```tsx
<EmptyState
  icon={Receipt}
  title="Sin transacciones"
  message="Aún no has registrado ninguna transacción"
  actionLabel="Registrar primera transacción"
  onAction={openCreateDialog}
/>
```

**Step 3: Commit**

```bash
git add src/components/empty-state.tsx
git commit -m "feat: improve empty state with animations and title

- Add title prop for better hierarchy
- Add framer-motion animations
- Larger icon container with background
- Better visual presentation"
```

---

## Task 9: Agregar indicador de conexión offline

**Files:**
- Create: `src/components/offline-indicator.tsx`
- Modify: `src/app/(dashboard)/layout.tsx`

**Step 1: Crear componente**

```tsx
// src/components/offline-indicator.tsx
'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff } from 'lucide-react'

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    // Check initial state
    setIsOffline(!navigator.onLine)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-amber-950 py-2 px-4 flex items-center justify-center gap-2 text-sm font-medium"
        >
          <WifiOff className="w-4 h-4" />
          Sin conexión - Los datos pueden estar desactualizados
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

**Step 2: Agregar al layout**

```tsx
// En src/app/(dashboard)/layout.tsx, agregar:
import { OfflineIndicator } from '@/components/offline-indicator'

// Dentro del return, después de DashboardNav:
<OfflineIndicator />
```

**Step 3: Commit**

```bash
git add src/components/offline-indicator.tsx src/app/\(dashboard\)/layout.tsx
git commit -m "feat: add offline connection indicator"
```

---

## Task 10: Build final y pruebas

**Step 1: Ejecutar build**

Run: `npm run build`
Expected: Build exitoso sin errores

**Step 2: Ejecutar tests**

Run: `npm run test:run`
Expected: Todos los tests pasan

**Step 3: Probar en móvil real o emulador**

Checklist:
- [ ] Navegación inferior visible y funcional
- [ ] Botón "Más" abre menú con opciones adicionales
- [ ] Pull-to-refresh funciona en transacciones
- [ ] Búsqueda global accesible con Ctrl+K
- [ ] Estados vacíos muestran animaciones
- [ ] Indicador offline aparece sin conexión

**Step 4: Commit final y push**

```bash
git add -A
git commit -m "feat: complete mobile UX improvements

Implemented:
- Fixed bottom navigation with More menu
- Pull-to-refresh on transactions
- Global search with command palette (Ctrl+K)
- Improved empty states with animations
- Offline connection indicator"

git push
```

---

## Resumen de archivos creados/modificados

| Archivo | Acción |
|---------|--------|
| `src/components/mobile-bottom-nav.tsx` | Crear |
| `src/components/pull-to-refresh.tsx` | Crear |
| `src/components/global-search.tsx` | Crear |
| `src/components/offline-indicator.tsx` | Crear |
| `src/hooks/use-pull-to-refresh.ts` | Crear |
| `src/components/dashboard-nav.tsx` | Modificar |
| `src/components/empty-state.tsx` | Modificar |
| `src/app/(dashboard)/layout.tsx` | Modificar |
| `src/app/(dashboard)/transactions/page.tsx` | Modificar |

## Tiempo estimado

- Task 1 (Bottom nav): 15-20 min
- Task 2-3 (Pull to refresh): 15 min
- Task 4 (Integrar PTR): 5 min
- Task 5-7 (Global search): 25-30 min
- Task 8 (Empty states): 10 min
- Task 9 (Offline indicator): 10 min
- Task 10 (Build/test): 15 min

**Total: ~2 horas**
