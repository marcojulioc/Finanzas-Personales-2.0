import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  children?: ReactNode
}

export function PageHeader({
  title,
  description,
  actionLabel,
  onAction,
  children,
}: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-display font-bold">{title}</h1>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      {actionLabel && onAction ? (
        <Button onClick={onAction}>
          <Plus className="w-4 h-4 mr-2" />
          {actionLabel}
        </Button>
      ) : (
        children
      )}
    </div>
  )
}
