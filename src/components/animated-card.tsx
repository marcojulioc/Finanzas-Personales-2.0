'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Card, CardProps } from './ui/card'
import { cn } from '@/lib/utils'

interface AnimatedCardProps extends CardProps {
  delay?: number
  children: React.ReactNode
}

/**
 * Card component con animación fade-in
 */
export function AnimatedCard({
  delay = 0,
  children,
  className,
  ...props
}: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      <Card className={cn(className)} {...props}>
        {children}
      </Card>
    </motion.div>
  )
}
