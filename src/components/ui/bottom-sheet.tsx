'use client'

import * as React from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

interface BottomSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
}

export function BottomSheet({
  open,
  onOpenChange,
  children,
  title,
  description,
  className,
}: BottomSheetProps) {
  const [isDragging, setIsDragging] = React.useState(false)

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false)
    
    // Si se arrastra más de 150px hacia abajo, cerrar
    if (info.offset.y > 150) {
      onOpenChange(false)
    }
  }

  const handleDragStart = () => {
    setIsDragging(true)
  }

  // Prevenir scroll del body cuando el bottom sheet está abierto
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 300,
            }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className={cn(
              'fixed inset-x-0 bottom-0 z-50',
              'max-h-[90vh] overflow-hidden',
              'rounded-t-2xl bg-background',
              'border-t border-border',
              'shadow-2xl',
              className
            )}
          >
            {/* Drag Handle */}
            <div className="mx-auto mt-3 mb-2 h-1 w-12 rounded-full bg-muted-foreground/30" />

            {/* Header */}
            {(title || description) && (
              <div className="px-6 py-4 border-b">
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-8">
                    {title && (
                      <h2 className="text-xl font-semibold leading-tight">
                        {title}
                      </h2>
                    )}
                    {description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => onOpenChange(false)}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Cerrar</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-120px)] overscroll-contain">
              <div className="px-6 py-4">
                {children}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
