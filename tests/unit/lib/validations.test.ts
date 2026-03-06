import { describe, it, expect } from 'vitest'
import {
  loginSchema,
  registerSchema,
  bankAccountSchema,
  transactionSchema,
  budgetSchema,
  loanSchema,
} from '@/lib/validations'

// A valid CUID for optional ID fields
const VALID_CUID = 'clh4z2v0e0000356kgbcxyz12'

// ---------------------------------------------------------------------------
// loginSchema
// ---------------------------------------------------------------------------
describe('loginSchema', () => {
  it('should accept valid credentials', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('should reject an invalid email format', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'password123',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('email')
    }
  })

  it('should reject an empty email', () => {
    const result = loginSchema.safeParse({ email: '', password: 'password123' })
    expect(result.success).toBe(false)
  })

  it('should reject an empty password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: '',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('password')
    }
  })

  it('should accept a single-character password (min is 1)', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'x',
    })
    expect(result.success).toBe(true)
  })

  it('should strip extra fields (strict-mode off — extra keys are ignored)', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'pass1',
      extraField: 'should be ignored',
    })
    // Zod strips unknown keys by default — parse should succeed
    expect(result.success).toBe(true)
    if (result.success) {
      expect((result.data as Record<string, unknown>).extraField).toBeUndefined()
    }
  })
})

// ---------------------------------------------------------------------------
// registerSchema
// ---------------------------------------------------------------------------
describe('registerSchema', () => {
  it('should accept a valid registration payload', () => {
    const result = registerSchema.safeParse({
      name: 'Marco Polo',
      email: 'marco@example.com',
      password: 'Secure1234',
    })
    expect(result.success).toBe(true)
  })

  it('should reject a password without an uppercase letter', () => {
    const result = registerSchema.safeParse({
      name: 'Marco Polo',
      email: 'marco@example.com',
      password: 'secure1234',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('password')
    }
  })

  it('should reject a password without a digit', () => {
    const result = registerSchema.safeParse({
      name: 'Marco Polo',
      email: 'marco@example.com',
      password: 'SecurePassword',
    })
    expect(result.success).toBe(false)
  })

  it('should reject a password without a lowercase letter', () => {
    const result = registerSchema.safeParse({
      name: 'Marco Polo',
      email: 'marco@example.com',
      password: 'SECURE1234',
    })
    expect(result.success).toBe(false)
  })

  it('should reject a password shorter than 8 characters', () => {
    const result = registerSchema.safeParse({
      name: 'Marco Polo',
      email: 'marco@example.com',
      password: 'Abc1',
    })
    expect(result.success).toBe(false)
  })

  it('should reject a name shorter than 2 characters', () => {
    const result = registerSchema.safeParse({
      name: 'M',
      email: 'marco@example.com',
      password: 'Secure1234',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('name')
    }
  })

  it('should reject a name longer than 50 characters', () => {
    const result = registerSchema.safeParse({
      name: 'A'.repeat(51),
      email: 'marco@example.com',
      password: 'Secure1234',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('name')
    }
  })

  it('should accept a name that is exactly 2 characters (boundary)', () => {
    const result = registerSchema.safeParse({
      name: 'Al',
      email: 'al@example.com',
      password: 'Secure1234',
    })
    expect(result.success).toBe(true)
  })

  it('should accept a name that is exactly 50 characters (boundary)', () => {
    const result = registerSchema.safeParse({
      name: 'A'.repeat(50),
      email: 'long@example.com',
      password: 'Secure1234',
    })
    expect(result.success).toBe(true)
  })

  it('should reject an invalid email format', () => {
    const result = registerSchema.safeParse({
      name: 'Marco Polo',
      email: 'bad-email',
      password: 'Secure1234',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('email')
    }
  })
})

// ---------------------------------------------------------------------------
// bankAccountSchema
// ---------------------------------------------------------------------------
describe('bankAccountSchema', () => {
  const validSavings = {
    name: 'Mi Cuenta',
    bankName: 'Banco Nacional',
    accountType: 'savings' as const,
    currency: 'USD' as const,
    balance: 1000,
  }

  it('should accept a valid savings account', () => {
    const result = bankAccountSchema.safeParse(validSavings)
    expect(result.success).toBe(true)
  })

  it('should accept a valid checking account', () => {
    const result = bankAccountSchema.safeParse({
      ...validSavings,
      accountType: 'checking',
    })
    expect(result.success).toBe(true)
  })

  it('should reject an invalid account type', () => {
    const result = bankAccountSchema.safeParse({
      ...validSavings,
      accountType: 'investment',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('accountType')
    }
  })

  it('should reject a negative balance', () => {
    const result = bankAccountSchema.safeParse({ ...validSavings, balance: -1 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('balance')
    }
  })

  it('should accept a zero balance (boundary — min is 0)', () => {
    const result = bankAccountSchema.safeParse({ ...validSavings, balance: 0 })
    expect(result.success).toBe(true)
  })

  it('should reject a balance over the maximum limit', () => {
    const result = bankAccountSchema.safeParse({
      ...validSavings,
      balance: 9999999999999,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('balance')
    }
  })

  it('should accept a valid hex color', () => {
    const result = bankAccountSchema.safeParse({
      ...validSavings,
      color: '#1A2B3C',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.color).toBe('#1A2B3C')
    }
  })

  it('should reject an invalid color format (no hash prefix)', () => {
    const result = bankAccountSchema.safeParse({
      ...validSavings,
      color: '1A2B3C',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('color')
    }
  })

  it('should reject a color that is too short', () => {
    const result = bankAccountSchema.safeParse({
      ...validSavings,
      color: '#FFF',
    })
    expect(result.success).toBe(false)
  })

  it('should accept when color is omitted (optional field)', () => {
    const { color: _color, ...withoutColor } = { ...validSavings, color: '#000000' }
    const result = bankAccountSchema.safeParse(withoutColor)
    expect(result.success).toBe(true)
  })

  it('should accept a valid interestRate between 0 and 100', () => {
    const result = bankAccountSchema.safeParse({
      ...validSavings,
      interestRate: 4.5,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.interestRate).toBe(4.5)
    }
  })

  it('should reject an interestRate above 100', () => {
    const result = bankAccountSchema.safeParse({
      ...validSavings,
      interestRate: 101,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('interestRate')
    }
  })

  it('should reject an invalid currency', () => {
    const result = bankAccountSchema.safeParse({
      ...validSavings,
      currency: 'XYZ',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('currency')
    }
  })

  it('should reject a bank name shorter than 2 characters', () => {
    const result = bankAccountSchema.safeParse({ ...validSavings, bankName: 'B' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('bankName')
    }
  })
})

// ---------------------------------------------------------------------------
// transactionSchema
// ---------------------------------------------------------------------------
describe('transactionSchema', () => {
  const validIncome = {
    type: 'income' as const,
    amount: 500,
    currency: 'USD' as const,
    category: 'Salario',
    date: '2026-03-01',
    bankAccountId: VALID_CUID,
  }

  const validExpense = {
    type: 'expense' as const,
    amount: 100,
    currency: 'MXN' as const,
    category: 'Alimentación',
    date: '2026-03-01',
    bankAccountId: VALID_CUID,
  }

  const validTransfer = {
    type: 'transfer' as const,
    amount: 200,
    currency: 'USD' as const,
    category: 'Transferencia',
    date: '2026-03-01',
    bankAccountId: VALID_CUID,
    targetAccountId: VALID_CUID,
  }

  it('should accept a valid income transaction', () => {
    const result = transactionSchema.safeParse(validIncome)
    expect(result.success).toBe(true)
  })

  it('should accept a valid expense transaction', () => {
    const result = transactionSchema.safeParse(validExpense)
    expect(result.success).toBe(true)
  })

  it('should accept a valid transfer transaction', () => {
    const result = transactionSchema.safeParse(validTransfer)
    expect(result.success).toBe(true)
  })

  it('should reject a zero amount', () => {
    const result = transactionSchema.safeParse({ ...validIncome, amount: 0 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('amount')
    }
  })

  it('should reject a negative amount', () => {
    const result = transactionSchema.safeParse({ ...validIncome, amount: -50 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('amount')
    }
  })

  it('should reject a category that exceeds 30 characters', () => {
    const result = transactionSchema.safeParse({
      ...validIncome,
      category: 'A'.repeat(31),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('category')
    }
  })

  it('should reject an empty category (min 1 char)', () => {
    const result = transactionSchema.safeParse({ ...validIncome, category: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('category')
    }
  })

  it('should reject an invalid currency', () => {
    const result = transactionSchema.safeParse({
      ...validIncome,
      currency: 'INVALID',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('currency')
    }
  })

  it('should reject an invalid transaction type', () => {
    const result = transactionSchema.safeParse({
      ...validIncome,
      type: 'loan_payment',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('type')
    }
  })

  it('should coerce a date string into a Date object', () => {
    const result = transactionSchema.safeParse(validIncome)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.date).toBeInstanceOf(Date)
    }
  })

  it('should default isCardPayment to false when omitted', () => {
    const result = transactionSchema.safeParse(validExpense)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.isCardPayment).toBe(false)
    }
  })

  it('should accept a valid transaction with all optional fields', () => {
    const result = transactionSchema.safeParse({
      type: 'expense',
      amount: 75.5,
      currency: 'EUR',
      category: 'Servicios',
      description: 'Factura de luz',
      date: '2026-03-01',
      bankAccountId: VALID_CUID,
      creditCardId: VALID_CUID,
      isCardPayment: true,
      targetCardId: VALID_CUID,
      targetAccountId: VALID_CUID,
      exchangeRate: 1.08,
    })
    expect(result.success).toBe(true)
  })

  it('should reject a description longer than 100 characters', () => {
    const result = transactionSchema.safeParse({
      ...validIncome,
      description: 'D'.repeat(101),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('description')
    }
  })

  it('should reject a zero exchangeRate', () => {
    const result = transactionSchema.safeParse({
      ...validTransfer,
      exchangeRate: 0,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('exchangeRate')
    }
  })

  it('should accept each of the 28 supported currencies', () => {
    const currencies = [
      'USD', 'MXN', 'CAD', 'DOP', 'HTG', 'JMD', 'TTD', 'BBD', 'BSD', 'CUP',
      'GTQ', 'HNL', 'NIO', 'CRC', 'PAB', 'COP', 'VES', 'PEN', 'CLP', 'ARS',
      'BRL', 'UYU', 'PYG', 'BOB', 'EUR', 'GBP', 'CHF',
    ]
    for (const currency of currencies) {
      const result = transactionSchema.safeParse({ ...validIncome, currency })
      expect(result.success, `currency ${currency} should be valid`).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// budgetSchema
// ---------------------------------------------------------------------------
describe('budgetSchema', () => {
  const validBudget = {
    categoryId: VALID_CUID,
    amount: 300,
    month: '2026-03-01',
  }

  it('should accept a valid budget', () => {
    const result = budgetSchema.safeParse(validBudget)
    expect(result.success).toBe(true)
  })

  it('should coerce the month string into a Date object', () => {
    const result = budgetSchema.safeParse(validBudget)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.month).toBeInstanceOf(Date)
    }
  })

  it('should reject an invalid (non-CUID) categoryId', () => {
    const result = budgetSchema.safeParse({
      ...validBudget,
      categoryId: 'not-a-cuid',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('categoryId')
    }
  })

  it('should reject a zero amount', () => {
    const result = budgetSchema.safeParse({ ...validBudget, amount: 0 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('amount')
    }
  })

  it('should reject a negative amount', () => {
    const result = budgetSchema.safeParse({ ...validBudget, amount: -100 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('amount')
    }
  })

  it('should reject a missing categoryId', () => {
    const { categoryId: _id, ...withoutId } = validBudget
    const result = budgetSchema.safeParse(withoutId)
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// loanSchema
// ---------------------------------------------------------------------------
describe('loanSchema', () => {
  const validLoan = {
    name: 'Hipoteca',
    institution: 'Banco Pichincha',
    originalAmount: 50000,
    remainingBalance: 45000,
    currency: 'USD' as const,
    monthlyPayment: 450,
    interestRate: 7.5,
    startDate: '2023-01-01',
    frequency: 'monthly' as const,
  }

  it('should accept a valid loan with all required fields', () => {
    const result = loanSchema.safeParse(validLoan)
    expect(result.success).toBe(true)
  })

  it('should accept a valid loan with endDate explicitly set to null', () => {
    const result = loanSchema.safeParse({ ...validLoan, endDate: null })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.endDate).toBeNull()
    }
  })

  it('should accept a valid loan with a future endDate', () => {
    const result = loanSchema.safeParse({
      ...validLoan,
      endDate: '2033-01-01',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.endDate).toBeInstanceOf(Date)
    }
  })

  it('should reject a negative interestRate', () => {
    const result = loanSchema.safeParse({ ...validLoan, interestRate: -1 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('interestRate')
    }
  })

  it('should reject an interestRate above 100', () => {
    const result = loanSchema.safeParse({ ...validLoan, interestRate: 100.1 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('interestRate')
    }
  })

  it('should accept an interestRate of exactly 0 (boundary)', () => {
    const result = loanSchema.safeParse({ ...validLoan, interestRate: 0 })
    expect(result.success).toBe(true)
  })

  it('should accept an interestRate of exactly 100 (boundary)', () => {
    const result = loanSchema.safeParse({ ...validLoan, interestRate: 100 })
    expect(result.success).toBe(true)
  })

  it('should reject a zero originalAmount', () => {
    const result = loanSchema.safeParse({ ...validLoan, originalAmount: 0 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('originalAmount')
    }
  })

  it('should reject a negative originalAmount', () => {
    const result = loanSchema.safeParse({ ...validLoan, originalAmount: -500 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('originalAmount')
    }
  })

  it('should reject a negative remainingBalance', () => {
    const result = loanSchema.safeParse({ ...validLoan, remainingBalance: -1 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('remainingBalance')
    }
  })

  it('should accept a remainingBalance of zero (fully paid loan)', () => {
    const result = loanSchema.safeParse({ ...validLoan, remainingBalance: 0 })
    expect(result.success).toBe(true)
  })

  it('should reject a zero monthlyPayment', () => {
    const result = loanSchema.safeParse({ ...validLoan, monthlyPayment: 0 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('monthlyPayment')
    }
  })

  it('should reject when required fields are missing', () => {
    const result = loanSchema.safeParse({ name: 'Loan without required fields' })
    expect(result.success).toBe(false)
  })

  it('should accept all valid frequency values', () => {
    const frequencies = ['daily', 'weekly', 'biweekly', 'monthly', 'yearly'] as const
    for (const frequency of frequencies) {
      const result = loanSchema.safeParse({ ...validLoan, frequency })
      expect(result.success, `frequency "${frequency}" should be valid`).toBe(true)
    }
  })

  it('should reject an invalid frequency value', () => {
    const result = loanSchema.safeParse({ ...validLoan, frequency: 'quarterly' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('frequency')
    }
  })

  it('should accept a valid hex color', () => {
    const result = loanSchema.safeParse({ ...validLoan, color: '#FF5733' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.color).toBe('#FF5733')
    }
  })

  it('should reject an invalid color format', () => {
    const result = loanSchema.safeParse({ ...validLoan, color: 'red' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('color')
    }
  })

  it('should reject a name shorter than 2 characters', () => {
    const result = loanSchema.safeParse({ ...validLoan, name: 'L' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('name')
    }
  })

  it('should reject an institution name longer than 50 characters', () => {
    const result = loanSchema.safeParse({
      ...validLoan,
      institution: 'I'.repeat(51),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('institution')
    }
  })

  it('should reject originalAmount above the maximum limit', () => {
    const result = loanSchema.safeParse({
      ...validLoan,
      originalAmount: 9999999999999,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('originalAmount')
    }
  })

  it('should coerce startDate string into a Date object', () => {
    const result = loanSchema.safeParse(validLoan)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.startDate).toBeInstanceOf(Date)
    }
  })

  it('should reject an invalid currency', () => {
    const result = loanSchema.safeParse({ ...validLoan, currency: 'JPY' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('currency')
    }
  })
})
