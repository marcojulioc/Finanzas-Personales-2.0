import { describe, it, expect } from 'vitest'
import { findByName } from './fuzzy-match.js'

describe('findByName', () => {
  const accounts = [
    { id: '1', name: 'Banco Popular Dominicano' },
    { id: '2', name: 'BHD Dólares' },
    { id: '3', name: 'Banreservas' },
  ]

  it('matches exact substring case-insensitively', () => {
    expect(findByName(accounts, 'popular')?.id).toBe('1')
    expect(findByName(accounts, 'Popular')?.id).toBe('1')
    expect(findByName(accounts, 'BHD')?.id).toBe('2')
  })

  it('matches by any token in the query', () => {
    expect(findByName(accounts, 'dominicano')?.id).toBe('1')
  })

  it('returns null when no match', () => {
    expect(findByName(accounts, 'Santander')).toBeNull()
  })

  it('prefers exact name match over partial', () => {
    const items = [
      { id: '1', name: 'Popular Extra' },
      { id: '2', name: 'Popular' },
    ]
    expect(findByName(items, 'Popular')?.id).toBe('2')
  })

  it('handles accents (tilde-insensitive)', () => {
    expect(findByName(accounts, 'Dolares')?.id).toBe('2')
  })
})
