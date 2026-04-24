import { describe, it, expect } from 'vitest'
import { findByName } from './fuzzy-match.js'

describe('findByName', () => {
  const accounts = [
    { id: '1', name: 'Banco Popular Dominicano' },
    { id: '2', name: 'BHD Dólares' },
    { id: '3', name: 'Banreservas' },
  ]

  it('matches exact substring case-insensitively', () => {
    expect(findByName(accounts, 'popular').map((a) => a.id)).toEqual(['1'])
    expect(findByName(accounts, 'Popular').map((a) => a.id)).toEqual(['1'])
    expect(findByName(accounts, 'BHD').map((a) => a.id)).toEqual(['2'])
  })

  it('matches by any token in the query (substring)', () => {
    expect(findByName(accounts, 'dominicano').map((a) => a.id)).toEqual(['1'])
  })

  it('returns empty array when no match', () => {
    expect(findByName(accounts, 'Santander')).toEqual([])
  })

  it('exact match wins even if substring would match multiple', () => {
    const items = [
      { id: '1', name: 'Popular' },
      { id: '2', name: 'Popular 8695' },
    ]
    const result = findByName(items, 'Popular')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })

  it('handles accents (tilde-insensitive)', () => {
    expect(findByName(accounts, 'Dolares').map((a) => a.id)).toEqual(['2'])
  })

  it('returns empty array for empty query', () => {
    expect(findByName(accounts, '')).toEqual([])
  })

  it('returns all substring matches when ambiguous', () => {
    const items = [
      { id: '1', name: 'Popular 8695' },
      { id: '2', name: 'Popular 4866' },
    ]
    expect(findByName(items, 'Popular')).toHaveLength(2)
  })

  it('returns empty when query is more specific than any item (regression: no silent token fallback)', () => {
    // Critical regression test: old implementation matched "Popular 4866" against
    // item "Popular 8695" via the nq.includes(token) branch — silently charging
    // transactions to the wrong account. The new contract must return [].
    const items = [{ id: '1', name: 'Popular 8695' }]
    expect(findByName(items, 'Popular 4866')).toEqual([])
  })

  it('returns empty when single-token item has no match with more-specific query', () => {
    const items = [{ id: '1', name: 'Popular' }]
    expect(findByName(items, 'Popular 4866')).toEqual([])
  })

  it('returns multiple exact matches (edge case)', () => {
    const items = [
      { id: '1', name: 'Popular' },
      { id: '2', name: 'POPULAR' },
    ]
    expect(findByName(items, 'popular')).toHaveLength(2)
  })
})
