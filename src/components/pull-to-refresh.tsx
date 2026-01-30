'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Loader2, ArrowDown } from 'lucide-react'
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh'
import { cn } from '@/lib/utils'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: ReactNode
  className?: string
  disabled?: boolean
}

export function PullToRefresh({
  onRefresh,
  children,
  className,
  disabled = false,
}: PullToRefreshProps) {
  const { isRefreshing, pullDistance, containerRef } = usePullToRefresh({
    onRefresh,
    disabled,
  })

  const threshold = 80
  const progress = Math.min(pullDistance / threshold, 1)
  const showIndicator = pullDistance > 10 || isRefreshing

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
    >
      {/* Pull indicator */}
      <motion.div
        className="absolute left-0 right-0 flex items-center justify-center pointer-events-none z-10"
        style={{
          top: -40,
          height: 40,
        }}
        animate={{
          y: showIndicator ? pullDistance : 0,
          opacity: showIndicator ? 1 : 0,
        }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      >
        <div className="bg-card rounded-full p-2 shadow-md">
          {isRefreshing ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : (
            <motion.div
              animate={{ rotate: progress * 180 }}
              transition={{ type: 'spring', damping: 20 }}
            >
              <ArrowDown
                className={cn(
                  'w-5 h-5 transition-colors',
                  progress >= 1 ? 'text-primary' : 'text-muted-foreground'
                )}
              />
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Content with pull offset */}
      <motion.div
        animate={{
          y: isRefreshing ? 50 : pullDistance > 0 ? pullDistance : 0,
        }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      >
        {children}
      </motion.div>
    </div>
  )
}
