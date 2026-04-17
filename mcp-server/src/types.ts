import { ApiClient } from './api-client.js'

export interface ToolContext {
  api: ApiClient
}

export interface BankAccount {
  id: string
  name: string
  currency: string
  balance: string
}

export interface CreditCard {
  id: string
  name: string
  currency: string
  balances?: Array<{ currency: string; balance: string }>
}

export interface Category {
  name: string
  type?: 'income' | 'expense'
}

export interface Transaction {
  id: string
  type: 'income' | 'expense' | 'transfer'
  amount: string
  description: string | null
  category: string
  date: string
  bankAccount?: { name: string }
  creditCard?: { name: string }
}
