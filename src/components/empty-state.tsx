import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  message: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  icon: Icon,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <Icon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{message}</p>
        {actionLabel && onAction && (
          <Button className="mt-4" onClick={onAction}>
            <Plus className="w-4 h-4 mr-2" />
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
