'use client';

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { formatCurrencyAmount } from '@/lib/currencies';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  currency: string;
  type: 'INCOME' | 'EXPENSE';
  date: Date | string;
}

interface VirtualTransactionListProps {
  transactions: Transaction[];
  onTransactionClick?: (transaction: Transaction) => void;
  className?: string;
  height?: number;
}

export function VirtualTransactionList({
  transactions,
  onTransactionClick,
  className,
  height = 400,
}: VirtualTransactionListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: transactions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  if (transactions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        No hay transacciones
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={cn('overflow-auto', className)}
      style={{ height }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const transaction = transactions[virtualItem.index];
          if (!transaction) return null;
          const isExpense = transaction.type === 'EXPENSE';

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className={cn(
                'flex items-center justify-between p-4 border-b',
                'hover:bg-muted/50 transition-colors cursor-pointer',
                'active:bg-muted'
              )}
              onClick={() => onTransactionClick?.(transaction)}
            >
              <div className="flex-1 min-w-0 mr-4">
                <p className="font-medium truncate">{transaction.description}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(transaction.date), 'dd MMM yyyy', { locale: es })}
                </p>
              </div>
              <div className={cn(
                'font-semibold tabular-nums shrink-0',
                isExpense ? 'text-destructive' : 'text-green-600'
              )}>
                {isExpense ? '-' : '+'}
                {formatCurrencyAmount(transaction.amount, transaction.currency)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
