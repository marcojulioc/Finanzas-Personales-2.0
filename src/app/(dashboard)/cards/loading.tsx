import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function CardsLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-5 w-56" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      {/* Card cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i} className="relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-muted" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="space-y-1">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                </div>
                <div className="flex gap-1">
                  <Skeleton className="w-8 h-8 rounded" />
                  <Skeleton className="w-8 h-8 rounded" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* MXN section */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
                <Skeleton className="h-3 w-20 ml-auto" />
              </div>

              {/* Total */}
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-7 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
