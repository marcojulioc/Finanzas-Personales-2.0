import dynamic from 'next/dynamic';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { SkeletonList } from '@/components/ui/skeleton-list';

// Lazy load virtual transaction list (only for large lists)
export const LazyVirtualTransactionList = dynamic(
  () => import('@/components/transactions/virtual-transaction-list').then(
    mod => mod.VirtualTransactionList
  ),
  {
    loading: () => <SkeletonList count={5} />,
  }
);

// Placeholder for future chart components
export const LazyChartPlaceholder = dynamic(
  () => Promise.resolve(() => <div>Chart</div>),
  {
    loading: () => <SkeletonCard className="h-[300px]" lines={0} showHeader={false} />,
    ssr: false,
  }
);
