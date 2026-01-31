'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function CreditCardSkeleton() {
  return (
    <Card className="relative overflow-hidden">
      {/* Top color bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-muted" />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <div className="flex gap-1">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Balance skeleton */}
        <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
        {/* Link skeleton */}
        <Skeleton className="h-4 w-full" />
      </CardContent>
    </Card>
  )
}

export function CreditCardSkeletonGrid({ count = 2 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <CreditCardSkeleton key={i} />
      ))}
    </div>
  )
}
