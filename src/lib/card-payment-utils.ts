/**
 * Pure helpers for card payment currency detection.
 * Extracted from the transactions form so the logic can be unit-tested in
 * isolation. The bug this fixes: when a credit card has balances in MULTIPLE
 * currencies (e.g. both DOP and USD), the old inline detection looked for any
 * non-matching balance and forced the form into "cross-currency" mode — even
 * when the source account's currency matched one of the card's balances.
 *
 * The corrected rule: a payment is only cross-currency when the card has NO
 * balance in the source account's currency. If the card has a same-currency
 * balance, the user can pay it directly without an exchange rate.
 */

export interface CardBalance {
  currency: string
  balance: string | number
}

export interface CardWithBalances {
  id: string
  balances?: CardBalance[]
}

export interface AccountWithCurrency {
  currency: string
}

export interface CrossCurrencyDetection {
  isCrossCurrency: boolean
  targetBalance: CardBalance | null
}

export function detectCrossCurrencyPayment(params: {
  isCardPayment: boolean
  sourceAccount: AccountWithCurrency | null | undefined
  targetCard: CardWithBalances | null | undefined
}): CrossCurrencyDetection {
  const { isCardPayment, sourceAccount, targetCard } = params

  if (!isCardPayment || !sourceAccount || !targetCard) {
    return { isCrossCurrency: false, targetBalance: null }
  }

  const balances = targetCard.balances ?? []

  // If the card has a balance in the source account's currency, the user can
  // pay it directly. Don't force cross-currency mode.
  const sameCurrencyAvailable = balances.some(
    (b) => b.currency === sourceAccount.currency,
  )
  if (sameCurrencyAvailable) {
    return { isCrossCurrency: false, targetBalance: null }
  }

  // Otherwise, find a foreign-currency balance to credit.
  const foreign = balances.find((b) => b.currency !== sourceAccount.currency)
  if (!foreign) {
    return { isCrossCurrency: false, targetBalance: null }
  }

  return { isCrossCurrency: true, targetBalance: foreign }
}
