import { ExpenseCategory } from "./work-costs"
import { LeaveType } from "./work-planning"

/** Legal and regional identity of the company (PLT-3). */
export interface CompanySettings {
  legalName: string
  tradeName?: string
  /** Morocco: Identifiant Commun de l'Entreprise, 15 digits */
  ice?: string
  /** Identifiant fiscal / VAT number */
  taxId?: string
  /** Registre de commerce */
  tradeRegister?: string
  address?: string
  city?: string
  country: string
  /** ISO 4217; reports and profit use this currency */
  baseCurrency: string
  /** 1 = January */
  fiscalYearStartMonth: number
  weekStart: "monday" | "sunday"
  /** IANA name, used for reports (TIM-14) */
  timeZone: string
  /** Prefix and pattern for invoice numbers, e.g. INV-{YYYY}-{SEQ} */
  invoiceNumberFormat: string
  /** Contact lines printed on invoices and reports */
  phone?: string
  email?: string
  website?: string
  /** Share capital, printed in the legal footer (e.g. "100 000 MAD") */
  shareCapital?: string
  /** Where clients pay: bank name, account / RIB / IBAN and SWIFT-BIC */
  bankName?: string
  bankAccount?: string
  bankSwift?: string
  /** Free text at the bottom of every invoice (late-payment terms, thank-you note) */
  invoiceFooter?: string
  /** Accent colour of documents, #RRGGBB */
  brandColor?: string
  /** Company logo for documents, as a small PNG/JPEG data URL (the server version stores a file) */
  logoDataUrl?: string
}

export enum ApprovalSubject {
  TIMESHEET = "timesheet",
  LEAVE = "leave",
  EXPENSE = "expense",
  QUOTE = "quote",
  INVOICE = "invoice",
}

export enum ApprovalMode {
  NONE = "none",
  ONE_STEP = "one_step",
  TWO_STEP = "two_step",
}

/** How one subject is approved in this workspace (PLT-8, section 8.3). */
export interface ApprovalRule {
  subject: ApprovalSubject
  mode: ApprovalMode
  /** Two-step rules can apply the second step only above an amount (expenses, quotes, invoices) */
  secondStepAbove?: number
}

export interface LeaveTypeSetting {
  type: LeaveType
  enabled: boolean
  /** Days granted per year; 0 means not counted against a balance */
  yearlyDays: number
  /** Unused days that may move to the next year (0 = none) */
  carryOverMax?: number
}

export interface ExpenseCategorySetting {
  category: ExpenseCategory
  enabled: boolean
}

export interface Holiday {
  /** ISO date */
  date: string
  name: string
}

export interface TaskLabel {
  id: string
  name: string
}

/** Everything an Admin configures for a workspace without code changes. */
export interface WorkspaceSettings {
  company: CompanySettings
  approvals: ApprovalRule[]
  leaveTypes: LeaveTypeSetting[]
  expenseCategories: ExpenseCategorySetting[]
  taskLabels: TaskLabel[]
  /** Receipts are required for expenses above this amount (EXP-2) */
  receiptRequiredAbove: number
  /** Public holidays for the company's country; religious dates are editable (HR-4) */
  holidays: Holiday[]
  /** Nothing dated on or before this day can be created or changed (BR-7) */
  lockedThrough?: string
}

/** Subjects whose second step can depend on an amount. */
export const AMOUNT_SUBJECTS = [ApprovalSubject.EXPENSE, ApprovalSubject.QUOTE, ApprovalSubject.INVOICE]
