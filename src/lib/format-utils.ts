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

/**
 * Parse a date string avoiding timezone issues.
 * When dates come from PostgreSQL as "2025-01-30T00:00:00.000Z" (midnight UTC),
 * users in negative UTC timezones (like America) would see the previous day.
 * This function forces midday to avoid the boundary issue.
 */
export function parseLocalDate(dateString: string | Date): Date {
  const str = typeof dateString === 'string' ? dateString : dateString.toISOString()
  // Extract just the date part (YYYY-MM-DD) and force midday
  const datePart = str.slice(0, 10)
  return new Date(datePart + 'T12:00:00')
}

export function formatDate(dateString: string): string {
  return parseLocalDate(dateString).toLocaleDateString('es-MX', {
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
