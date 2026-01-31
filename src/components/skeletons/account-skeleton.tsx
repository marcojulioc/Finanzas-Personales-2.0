'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function AccountSkeleton() {
  return (
    <Card className="relative overflow-hidden">
      {/* Top color bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-muted" />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="flex gap-1">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
          <div className="pt-2 border-t space-y-2">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-8 w-28" />
          </div>
          <Skeleton className="h-4 w-full mt-3" />
        </div>
      </CardContent>
    </Card>
  )
}

export function AccountSkeletonGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <AccountSkeleton key={i} />
      ))}
    </div>
  )
}
