import { describe, it, expect } from 'vitest'
import { detectCrossCurrencyPayment } from '@/lib/card-payment-utils'

describe('detectCrossCurrencyPayment', () => {
  const dopAccount = { currency: 'DOP' }
  const usdAccount = { currency: 'USD' }
  const dopOnlyCard = {
    id: 'c1',
    balances: [{ currency: 'DOP', balance: '1000' }],
  }
  const usdOnlyCard = {
    id: 'c2',
    balances: [{ currency: 'USD', balance: '500' }],
  }
  const multiCurrencyCard = {
    id: 'c3',
    balances: [
      { currency: 'DOP', balance: '10953.7' },
      { currency: 'USD', balance: '0' },
    ],
  }

  it('returns not cross-currency when isCardPayment is false', () => {
    const result = detectCrossCurrencyPayment({
      isCardPayment: false,
      sourceAccount: dopAccount,
      targetCard: usdOnlyCard,
    })
    expect(result.isCrossCurrency).toBe(false)
    expect(result.targetBalance).toBeNull()
  })

  it('returns not cross-currency when source account is missing', () => {
    const result = detectCrossCurrencyPayment({
      isCardPayment: true,
      sourceAccount: null,
      targetCard: usdOnlyCard,
    })
    expect(result.isCrossCurrency).toBe(false)
  })

  it('returns not cross-currency when target card is missing', () => {
    const result = detectCrossCurrencyPayment({
      isCardPayment: true,
      sourceAccount: dopAccount,
      targetCard: null,
    })
    expect(result.isCrossCurrency).toBe(false)
  })

  it('returns not cross-currency when card has no balances', () => {
    const result = detectCrossCurrencyPayment({
      isCardPayment: true,
      sourceAccount: dopAccount,
      targetCard: { id: 'empty', balances: [] },
    })
    expect(result.isCrossCurrency).toBe(false)
    expect(result.targetBalance).toBeNull()
  })

  it('returns not cross-currency when card has same-currency balance (regression: multi-currency card with same source)', () => {
    // The bug: card has both DOP and USD balances, source DOP.
    // Old code returned cross-currency=true with USD target.
    // Fix: when same-currency balance exists, this is a same-currency payment.
    const result = detectCrossCurrencyPayment({
      isCardPayment: true,
      sourceAccount: dopAccount,
      targetCard: multiCurrencyCard,
    })
    expect(result.isCrossCurrency).toBe(false)
    expect(result.targetBalance).toBeNull()
  })

  it('returns cross-currency when card has only foreign balance', () => {
    const result = detectCrossCurrencyPayment({
      isCardPayment: true,
      sourceAccount: dopAccount,
      targetCard: usdOnlyCard,
    })
    expect(result.isCrossCurrency).toBe(true)
    expect(result.targetBalance?.currency).toBe('USD')
  })

  it('matches DOP source to DOP-only card as same-currency (sanity)', () => {
    const result = detectCrossCurrencyPayment({
      isCardPayment: true,
      sourceAccount: dopAccount,
      targetCard: dopOnlyCard,
    })
    expect(result.isCrossCurrency).toBe(false)
  })

  it('handles USD source to DOP-only card as cross-currency', () => {
    const result = detectCrossCurrencyPayment({
      isCardPayment: true,
      sourceAccount: usdAccount,
      targetCard: dopOnlyCard,
    })
    expect(result.isCrossCurrency).toBe(true)
    expect(result.targetBalance?.currency).toBe('DOP')
  })
})
