'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

// Loading skeleton for forms
function FormSkeleton() {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
}

/**
 * Lazy-loaded form components using next/dynamic
 * These are loaded on-demand to reduce initial bundle size
 */

export const LazyBudgetForm = dynamic(
  () => import('@/components/budget-form').then((mod) => mod.BudgetForm),
  {
    loading: () => <FormSkeleton />,
    ssr: true,
  }
)

export const LazyCategoryForm = dynamic(
  () => import('@/components/category-form').then((mod) => mod.CategoryForm),
  {
    loading: () => <FormSkeleton />,
    ssr: true,
  }
)

export const LazyRecurringForm = dynamic(
  () => import('@/components/recurring-form').then((mod) => mod.RecurringForm),
  {
    loading: () => <FormSkeleton />,
    ssr: true,
  }
)
