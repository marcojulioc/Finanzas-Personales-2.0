function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

/**
 * Finds items whose name matches the query (case/accent-insensitive).
 *
 * Returns all matches so the caller can handle 0/1/N with descriptive errors.
 * An exact normalized match shortcuts substring matching — exact wins even when
 * substring would match more items. If multiple items are exactly equal under
 * normalization, all are returned.
 *
 * Intentionally NO token fallback and NO bidirectional inclusion: a previous
 * implementation matched "Popular 4866" against an item "Popular 8695" via
 * `query.includes(itemToken)`, silently routing transactions to the wrong
 * account. The current contract requires the item's normalized name to
 * *contain* the normalized query.
 */
export function findByName<T extends { name: string }>(items: T[], query: string): T[] {
  if (!query) return []
  const nq = normalize(query)

  const exact = items.filter((it) => normalize(it.name) === nq)
  if (exact.length > 0) return exact

  return items.filter((it) => normalize(it.name).includes(nq))
}
