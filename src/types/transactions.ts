export enum TransactionStatus {
  PAID = "paid",
  PENDING = "pending",
  FAILED = "failed",
  REFUNDED = "refunded",
  CANCELED = "canceled",
}

export enum TransactionMethod {
  STRIPE = "stripe",
  PAYPAL = "paypal",
  CARD = "card",
  BANK_TRANSFER = "bank-transfer",
}

export interface TransactionsSummary {
  totalRevenue: number
  successful: number
  pending: number
  failed: number
  totalTransactions: number
  successRate: number
}
export interface TransactionUser {
  id: string
  name: string
  email: string
  avatar?: string | null
}

export interface Transaction {
  id: string
  transactionId: string
  user: TransactionUser
  amount: number
  method: TransactionMethod
  status: TransactionStatus
  date: string
  description?: string
  reference?: string
  createdAt: string
  updatedAt?: string
}

export interface CreateTransactionPayload {
  userId: string
  amount: number
  method: TransactionMethod
  status?: TransactionStatus
  description?: string
  reference?: string
}

export type UpdateTransactionPayload = Partial<CreateTransactionPayload>

export interface TransactionFilters {
  status?: TransactionStatus[]
  method?: TransactionMethod[]
}
