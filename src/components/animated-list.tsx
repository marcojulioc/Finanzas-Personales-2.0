'use client'

import * as React from 'react'
import { motion } from 'framer-motion'

interface AnimatedListProps {
  children: React.ReactNode
  className?: string
  staggerDelay?: number
}

/**
 * Contenedor para animar listas de elementos con efecto stagger
 */
export function AnimatedList({
  children,
  className,
  staggerDelay = 0.05,
}: AnimatedListProps) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  )
}

interface AnimatedListItemProps {
  children: React.ReactNode
  className?: string
}

/**
 * Item de lista animado (debe ser hijo de AnimatedList)
 */
export function AnimatedListItem({ children, className }: AnimatedListItemProps) {
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <motion.div variants={item} className={className}>
      {children}
    </motion.div>
  )
}
