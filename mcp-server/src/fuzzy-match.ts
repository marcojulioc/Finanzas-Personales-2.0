function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

export function findByName<T extends { name: string }>(
  items: T[],
  query: string,
): T | null {
  if (!query) return null
  const nq = normalize(query)

  // 1. Exact match on normalized
  const exact = items.find((it) => normalize(it.name) === nq)
  if (exact) return exact

  // 2. Substring match
  const substring = items.find((it) => normalize(it.name).includes(nq))
  if (substring) return substring

  // 3. Any token of the item includes the query (or vice versa)
  const token = items.find((it) => {
    const tokens = normalize(it.name).split(/\s+/)
    return tokens.some((t) => t.includes(nq) || nq.includes(t))
  })
  return token ?? null
}
