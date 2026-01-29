'use client'

import * as React from 'react'
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion'
import { Trash2, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHapticFeedback } from '@/hooks/use-haptic-feedback'
import { Badge } from './ui/badge'
import { formatCurrency, formatDate } from '@/lib/format-utils'

interface SwipeableTransactionItemProps {
  transaction: {
    id: string
    type: 'income' | 'expense'
    amount: number
    currency: string
    category: string
    description: string | null
    date: string
    bankAccount?: { id: string; name: string; color: string | null } | null
    creditCard?: { id: string; name: string; color: string | null } | null
  }
  category?: {
    name: string
    icon: string
    color: string
  }
  onEdit: () => void
  onDelete: () => void
  className?: string
}

export function SwipeableTransactionItem({
  transaction,
  category,
  onEdit,
  onDelete,
  className,
}: SwipeableTransactionItemProps) {
  const { triggerHaptic } = useHapticFeedback()
  const [isDeleting, setIsDeleting] = React.useState(false)
  const x = useMotionValue(0)

  // Transformar el desplazamiento en opacidad para el fondo rojo
  const deleteBackgroundOpacity = useTransform(x, [-200, -80, 0], [1, 0.7, 0])
  const deleteIconScale = useTransform(x, [-200, -80, 0], [1.2, 1, 0.8])

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Si se arrastra más de 100px a la izquierda, eliminar
    if (info.offset.x < -100) {
      triggerHaptic('warning')
      setIsDeleting(true)

      // Animar hacia la izquierda completamente antes de eliminar
      setTimeout(() => {
        triggerHaptic('error')
        onDelete()
      }, 300)
    } else {
      // Volver a la posición original
      x.set(0)
    }
  }

  const handleDrag = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Haptic feedback cuando se alcanza el umbral de eliminación
    if (info.offset.x < -100 && Math.abs(info.offset.x + 100) < 5) {
      triggerHaptic('medium')
    }
  }

  const handleEdit = () => {
    triggerHaptic('light')
    onEdit()
  }

  const handleDelete = () => {
    triggerHaptic('warning')
    onDelete()
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Background de eliminación (visible al hacer swipe left) */}
      <motion.div
        className="absolute inset-0 bg-danger flex items-center justify-end px-6"
        style={{ opacity: deleteBackgroundOpacity }}
      >
        <motion.div style={{ scale: deleteIconScale }}>
          <Trash2 className="w-6 h-6 text-white" />
        </motion.div>
      </motion.div>

      {/* Item de transacción - área draggable */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -200, right: 0 }}
        dragElastic={0.2}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ x }}
        animate={
          isDeleting
            ? { x: -500, opacity: 0 }
            : undefined
        }
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
        }}
        className={cn(
          'flex items-center justify-between p-4 pr-24',
          'bg-background',
          'hover:bg-muted/50 transition-colors',
          'touch-pan-y',
        )}
      >
        {/* Contenido de la transacción */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
            style={{
              backgroundColor: `${category?.color || '#6b7280'}20`,
            }}
          >
            {category?.icon || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">
              {category?.name || transaction.category}
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
              <span>{formatDate(transaction.date)}</span>
              {(transaction.bankAccount || transaction.creditCard) && (
                <>
                  <span>•</span>
                  <Badge
                    variant="outline"
                    className="font-normal"
                    style={{
                      borderColor:
                        transaction.bankAccount?.color ||
                        transaction.creditCard?.color ||
                        undefined,
                    }}
                  >
                    {transaction.bankAccount?.name ||
                      transaction.creditCard?.name}
                  </Badge>
                </>
              )}
              {transaction.description && (
                <>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline truncate max-w-[120px]">
                    {transaction.description}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Monto */}
        <span
          className={cn(
            'font-mono font-bold text-sm sm:text-base shrink-0',
            transaction.type === 'income'
              ? 'text-success'
              : 'text-danger'
          )}
        >
          {transaction.type === 'income' ? '+' : '-'}
          {formatCurrency(
            Number(transaction.amount),
            transaction.currency
          )}
        </span>
      </motion.div>

      {/* Botones de acción - FUERA del área draggable */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        <button
          type="button"
          onClick={handleEdit}
          className="p-2 hover:bg-muted rounded-lg transition-colors bg-background/80 backdrop-blur-sm"
          aria-label="Editar transacción"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="p-2 hover:bg-danger/20 rounded-lg transition-colors bg-background/80 backdrop-blur-sm text-danger"
          aria-label="Eliminar transacción"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
