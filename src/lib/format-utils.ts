// src/lib/format-utils.ts

// Cache Intl.NumberFormat instances to avoid recreating them
const formattersCache = new Map<string, Intl.NumberFormat>()

export function formatCurrency(amount: number, currency: string = 'MXN'): string {
  const key = `currency-${currency}-es-MX`

  if (!formattersCache.has(key)) {
    formattersCache.set(
      key,
      new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency,
      })
    )
  }

  return formattersCache.get(key)!.format(amount)
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatNumber(value: number): string {
  const key = 'number-es-MX'

  if (!formattersCache.has(key)) {
    formattersCache.set(
      key,
      new Intl.NumberFormat('es-MX')
    )
  }

  return formattersCache.get(key)!.format(value)
}
