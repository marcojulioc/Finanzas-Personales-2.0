import { AlertCircle, Calendar, CreditCard } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { type CardAlert, formatAlertMessage } from '@/lib/card-alerts'

interface CardAlertsProps {
  alerts: CardAlert[]
}

export function CardAlerts({ alerts }: CardAlertsProps) {
  if (alerts.length === 0) return null

  return (
    <div className="space-y-3">
      {alerts.map((alert, index) => {
        const isUrgent = alert.daysUntil <= 2
        const Icon = alert.type === 'cutoff' ? Calendar : CreditCard

        return (
          <Alert
            key={`${alert.cardName}-${alert.type}-${index}`}
            variant={isUrgent ? 'destructive' : 'default'}
            className={!isUrgent ? 'border-warning bg-warning/10' : ''}
          >
            <Icon className="h-4 w-4" />
            <AlertTitle className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: alert.cardColor || '#f97316' }}
              />
              {alert.cardName}
            </AlertTitle>
            <AlertDescription>
              {formatAlertMessage(alert)}
              {alert.type === 'cutoff'
                ? ' - Los gastos después de esta fecha se cobrarán el siguiente mes'
                : ' - Recuerda pagar antes de esta fecha para evitar intereses'}
            </AlertDescription>
          </Alert>
        )
      })}
    </div>
  )
}
