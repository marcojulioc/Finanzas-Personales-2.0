import { z } from 'zod'

// All supported currencies
const currencyEnum = z.enum([
  // Norteamerica
  'USD', 'MXN', 'CAD',
  // Caribe
  'DOP', 'HTG', 'JMD', 'TTD', 'BBD', 'BSD', 'CUP',
  // Centroamerica
  'GTQ', 'HNL', 'NIO', 'CRC', 'PAB',
  // Sudamerica
  'COP', 'VES', 'PEN', 'CLP', 'ARS', 'BRL', 'UYU', 'PYG', 'BOB',
  // Europa
  'EUR', 'GBP', 'CHF',
], {
  message: 'Moneda inválida',
})

// Autenticación
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede exceder 50 caracteres'),
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'La contraseña debe contener al menos una mayúscula, una minúscula y un número'
    ),
})

// Cuentas bancarias
export const bankAccountSchema = z.object({
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede exceder 50 caracteres'),
  bankName: z
    .string()
    .min(2, 'El banco debe tener al menos 2 caracteres')
    .max(50, 'El banco no puede exceder 50 caracteres'),
  accountType: z.enum(['savings', 'checking'], {
    message: 'Tipo de cuenta inválido',
  }),
  currency: currencyEnum,
  balance: z
    .number()
    .min(0, 'El balance no puede ser negativo')
    .max(999999999999, 'El balance excede el límite'),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color inválido')
    .optional(),
})

// Balance de tarjeta por moneda
export const creditCardBalanceSchema = z.object({
  currency: currencyEnum,
  creditLimit: z.number().min(0, 'El límite no puede ser negativo'),
  balance: z.number().min(0, 'La deuda no puede ser negativa').default(0),
})

// Tarjetas de crédito (multi-moneda)
export const creditCardSchema = z.object({
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede exceder 50 caracteres'),
  bankName: z
    .string()
    .min(2, 'El banco debe tener al menos 2 caracteres')
    .max(50, 'El banco no puede exceder 50 caracteres'),
  cutOffDay: z
    .number()
    .int()
    .min(1, 'El día de corte debe estar entre 1 y 31')
    .max(31, 'El día de corte debe estar entre 1 y 31'),
  paymentDueDay: z
    .number()
    .int()
    .min(1, 'El día de pago debe estar entre 1 y 31')
    .max(31, 'El día de pago debe estar entre 1 y 31'),
  balances: z.array(creditCardBalanceSchema).min(1, 'Debe agregar al menos una moneda'),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color inválido')
    .optional(),
})

// Transacciones
export const transactionSchema = z.object({
  type: z.enum(['income', 'expense'], {
    message: 'Tipo de transacción inválido',
  }),
  amount: z.number().positive('El monto debe ser mayor a 0'),
  currency: currencyEnum,
  category: z
    .string()
    .min(1, 'La categoría es requerida')
    .max(30, 'La categoría no puede exceder 30 caracteres'),
  description: z
    .string()
    .max(100, 'La descripción no puede exceder 100 caracteres')
    .optional(),
  date: z.coerce.date(),
  bankAccountId: z.string().cuid().optional(),
  creditCardId: z.string().cuid().optional(),
  isCardPayment: z.boolean().default(false),
  targetCardId: z.string().cuid().optional(),
})

// Presupuestos
export const budgetSchema = z.object({
  categoryId: z.string().cuid('ID de categoría inválido'),
  amount: z.number().positive('El monto debe ser mayor a 0'),
  month: z.coerce.date(), // Represented as the first day of the month
})

// Transacciones recurrentes
export const recurringTransactionSchema = z.object({
  type: z.enum(['income', 'expense'], {
    message: 'Tipo de transacción inválido',
  }),
  amount: z.number().positive('El monto debe ser mayor a 0'),
  currency: currencyEnum,
  category: z
    .string()
    .min(1, 'La categoría es requerida')
    .max(30, 'La categoría no puede exceder 30 caracteres'),
  description: z
    .string()
    .max(100, 'La descripción no puede exceder 100 caracteres')
    .optional(),
  bankAccountId: z.string().cuid().optional(),
  creditCardId: z.string().cuid().optional(),
  isCardPayment: z.boolean().default(false),
  targetCardId: z.string().cuid().optional(),
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'yearly'], {
    message: 'Frecuencia inválida',
  }),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
})

// Tipos inferidos
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type BankAccountInput = z.infer<typeof bankAccountSchema>
export type CreditCardBalanceInput = z.infer<typeof creditCardBalanceSchema>
export type CreditCardInput = z.infer<typeof creditCardSchema>
export type TransactionInput = z.infer<typeof transactionSchema>
export type BudgetInput = z.infer<typeof budgetSchema>
export type RecurringTransactionInput = z.infer<typeof recurringTransactionSchema>
