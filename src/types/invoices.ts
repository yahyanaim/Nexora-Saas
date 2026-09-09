// types/invoices.ts

import { User } from "./users"

export enum InvoiceStatus {
  DRAFT = "draft",
  PENDING = "pending",
  PAID = "paid",
  OVERDUE = "overdue",
  CANCELLED = "cancelled",
}

export enum InvoiceMethod {
  STRIPE = "stripe",
  PAYPAL = "paypal",
  BANK_TRANSFER = "bank_transfer",
  CARD = "card",
}

export interface InvoicesSummary {
  totalRevenue: number
  paid: number
  pending: number
  overdue: number
  cancelled: number
  totalInvoices: number
  paidPercentage: number
}

export interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export interface Invoice {
  id: string
  invoiceNumber: string
  user: User
  items: InvoiceItem[]
  subtotal: number
  tax: number
  taxRate: number
  total: number
  status: InvoiceStatus
  method: InvoiceMethod
  date: string
  dueDate?: string
  paidAt?: string
  notes?: string
  createdAt: string
  updatedAt?: string
}

export interface CreateInvoicePayload {
  user: string
  items: Omit<InvoiceItem, "id" | "total">[]
  status?: InvoiceStatus
  method?: InvoiceMethod
  taxRate?: number
  dueDate?: string
  notes?: string
}

export interface UpdateInvoicePayload extends Partial<CreateInvoicePayload> {
  status?: InvoiceStatus
}
