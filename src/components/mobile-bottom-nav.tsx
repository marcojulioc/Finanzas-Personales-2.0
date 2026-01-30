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
