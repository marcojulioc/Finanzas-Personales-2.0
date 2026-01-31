'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

export function TransactionItemSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b last:border-b-0">
      {/* Icon */}
      <Skeleton className="h-10 w-10 rounded-lg shrink-0" />

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-3 w-32" />
      </div>

      {/* Amount */}
      <div className="text-right space-y-1 shrink-0">
        <Skeleton className="h-5 w-20 ml-auto" />
        <Skeleton className="h-3 w-16 ml-auto" />
      </div>
    </div>
  )
}

export function TransactionListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <Card>
      <CardContent className="p-0">
        {Array.from({ length: count }).map((_, i) => (
          <TransactionItemSkeleton key={i} />
        ))}
      </CardContent>
    </Card>
  )
}

export function TransactionPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      {/* Filters skeleton */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4 items-center">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-[150px]" />
            <Skeleton className="h-10 w-[180px]" />
          </div>
        </CardContent>
      </Card>

      {/* List skeleton */}
      <TransactionListSkeleton count={8} />

      {/* Pagination skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>
    </div>
  )
}
