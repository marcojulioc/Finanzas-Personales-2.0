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
  { href: '/categories', label: 'Categorias', icon: Tags, keywords: ['tipo', 'clasificacion'] },
]

interface Transaction {
  id: string
  description: string | null
  amount: number
  currency: string
  type: 'income' | 'expense' | 'transfer'
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
                  placeholder="Buscar paginas o transacciones..."
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
                <Command.Group heading="Paginas" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
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
                          tx.type === 'income' ? 'text-success' : tx.type === 'transfer' ? 'text-primary' : 'text-danger'
                        )}>
                          {tx.type === 'income' ? '+' : tx.type === 'transfer' ? '' : '-'}{formatCurrency(tx.amount, tx.currency)}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </Command.List>

              <div className="hidden md:flex items-center justify-between px-4 py-2 border-t text-xs text-muted-foreground">
                <span>Navegar con ↑↓ - Seleccionar con ↵</span>
                <span>ESC para cerrar</span>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
