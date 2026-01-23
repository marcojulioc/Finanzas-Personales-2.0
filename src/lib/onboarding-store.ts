// Estado del onboarding guardado en localStorage
export interface BankAccountDraft {
  id: string
  name: string
  bankName: string
  accountType: 'savings' | 'checking'
  currency: string
  balance: number
  color?: string
}

export interface CreditCardDraft {
  id: string
  name: string
  bankName: string
  cutOffDay: number
  paymentDueDay: number
  limitMXN: number
  limitUSD: number
  balanceMXN: number
  balanceUSD: number
  color?: string
}

export interface OnboardingState {
  bankAccounts: BankAccountDraft[]
  creditCards: CreditCardDraft[]
}

const STORAGE_KEY = 'onboarding-state'

export function getOnboardingState(): OnboardingState {
  if (typeof window === 'undefined') {
    return { bankAccounts: [], creditCards: [] }
  }

  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    return { bankAccounts: [], creditCards: [] }
  }

  try {
    return JSON.parse(stored) as OnboardingState
  } catch {
    return { bankAccounts: [], creditCards: [] }
  }
}

export function saveOnboardingState(state: OnboardingState): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function clearOnboardingState(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

export function addBankAccount(account: BankAccountDraft): void {
  const state = getOnboardingState()
  state.bankAccounts.push(account)
  saveOnboardingState(state)
}

export function updateBankAccount(id: string, account: Partial<BankAccountDraft>): void {
  const state = getOnboardingState()
  const index = state.bankAccounts.findIndex((a) => a.id === id)
  if (index !== -1) {
    state.bankAccounts[index] = { ...state.bankAccounts[index]!, ...account }
    saveOnboardingState(state)
  }
}

export function removeBankAccount(id: string): void {
  const state = getOnboardingState()
  state.bankAccounts = state.bankAccounts.filter((a) => a.id !== id)
  saveOnboardingState(state)
}

export function addCreditCard(card: CreditCardDraft): void {
  const state = getOnboardingState()
  state.creditCards.push(card)
  saveOnboardingState(state)
}

export function updateCreditCard(id: string, card: Partial<CreditCardDraft>): void {
  const state = getOnboardingState()
  const index = state.creditCards.findIndex((c) => c.id === id)
  if (index !== -1) {
    state.creditCards[index] = { ...state.creditCards[index]!, ...card }
    saveOnboardingState(state)
  }
}

export function removeCreditCard(id: string): void {
  const state = getOnboardingState()
  state.creditCards = state.creditCards.filter((c) => c.id !== id)
  saveOnboardingState(state)
}

// Generador de IDs únicos
export function generateId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// Bancos comunes (República Dominicana, México y otros)
export const COMMON_BANKS = [
  // República Dominicana
  'Banco Popular',
  'Banreservas',
  'BHD León',
  'Scotiabank RD',
  'Banco Santa Cruz',
  'Banco BDI',
  'Banco Caribe',
  'Banco López de Haro',
  'Banco Vimenca',
  'Asociación Popular',
  'Banco Promerica',
  // México
  'BBVA',
  'Santander',
  'Banorte',
  'Citibanamex',
  'HSBC',
  'Scotiabank',
  'Banco Azteca',
  'Inbursa',
  'BanCoppel',
  'Banregio',
  'Hey Banco',
  'Nu',
  // Otros
  'Otro',
] as const

// Colores disponibles para cuentas/tarjetas
export const ACCOUNT_COLORS = [
  '#0d9488', // teal
  '#f97316', // orange
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#6366f1', // indigo
] as const
