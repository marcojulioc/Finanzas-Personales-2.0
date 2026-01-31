'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function BudgetSummarySkeleton() {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>

        {/* Progress */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-8" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      </CardContent>
    </Card>
  )
}

export function BudgetCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="flex gap-1">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Amount */}
        <div className="text-center py-2 space-y-2">
          <Skeleton className="h-3 w-16 mx-auto" />
          <Skeleton className="h-8 w-28 mx-auto" />
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <Skeleton className="h-2 w-full rounded-full" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function BudgetPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-10 w-40" />
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-center gap-2">
        <Skeleton className="h-10 w-10 rounded-md" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-10 rounded-md" />
      </div>

      <Skeleton className="h-px w-full" />

      {/* Summary card */}
      <BudgetSummarySkeleton />

      {/* Budget grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <BudgetCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
