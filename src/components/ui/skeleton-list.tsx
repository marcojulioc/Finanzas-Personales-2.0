import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SkeletonListProps {
  count?: number;
  className?: string;
}

export function SkeletonList({ count = 5, className }: SkeletonListProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 border-b"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-5 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}
