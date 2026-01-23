import { Loader2 } from 'lucide-react'

export default function RecurringLoading() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Recurrentes</h1>
        <p className="text-muted-foreground">
          Transacciones que se repiten automáticamente
        </p>
      </div>
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    </div>
  )
}
