'use client'

import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import { motion } from 'framer-motion'

interface EmptyStateProps {
  icon: LucideIcon
  title?: string
  message: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  icon: Icon,
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted/50 flex items-center justify-center"
        >
          <Icon className="w-12 h-12 text-muted-foreground" />
        </motion.div>

        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
          <p className="text-muted-foreground max-w-sm mx-auto">{message}</p>
        </motion.div>

        {actionLabel && onAction && (
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Button className="mt-6" onClick={onAction}>
              <Plus className="w-4 h-4 mr-2" />
              {actionLabel}
            </Button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}
