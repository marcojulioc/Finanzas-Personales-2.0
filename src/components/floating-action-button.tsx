'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHapticFeedback } from '@/hooks/use-haptic-feedback'
import { useMediaQuery } from '@/hooks/use-media-query'

interface FloatingActionButtonProps {
  onClick: () => void
  className?: string
  icon?: React.ReactNode
  label?: string
}

/**
 * Botón flotante para acciones principales en mobile
 * Solo visible en dispositivos móviles
 */
export function FloatingActionButton({
  onClick,
  className,
  icon,
  label = 'Nueva transacción',
}: FloatingActionButtonProps) {
  const { triggerHaptic } = useHapticFeedback()
  const isMobile = useMediaQuery('(max-width: 768px)')

  if (!isMobile) {
    return null
  }

  const handleClick = () => {
    triggerHaptic('medium')
    onClick()
  }

  return (
    <motion.button
      onClick={handleClick}
      className={cn(
        'fixed bottom-20 right-6 z-40',
        'w-14 h-14 rounded-full',
        'bg-primary text-primary-foreground',
        'shadow-lg hover:shadow-xl',
        'flex items-center justify-center',
        'transition-shadow duration-200',
        className
      )}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileTap={{ scale: 0.9 }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
      }}
      aria-label={label}
    >
      {icon || <Plus className="w-6 h-6" />}
    </motion.button>
  )
}
