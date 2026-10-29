import { ExpenseCategory, ExpenseStatus } from "@/types/work-costs"

/** Translation keys and badge styles for expenses. */

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  [ExpenseCategory.TRAVEL]: "travel",
  [ExpenseCategory.MEALS]: "meals",
  [ExpenseCategory.SOFTWARE]: "software",
  [ExpenseCategory.HARDWARE]: "hardware",
  [ExpenseCategory.SUBCONTRACTOR]: "subcontractor",
  [ExpenseCategory.OTHER]: "other",
}

export const EXPENSE_STATUS_LABEL: Record<ExpenseStatus, string> = {
  [ExpenseStatus.SUBMITTED]: "submitted",
  [ExpenseStatus.APPROVED]: "approved",
  [ExpenseStatus.REJECTED]: "rejected",
  [ExpenseStatus.REIMBURSED]: "reimbursed",
}

/** Receipts we accept: images and PDFs up to 10 MB. */
export const RECEIPT_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"]
export const RECEIPT_MAX_BYTES = 10 * 1024 * 1024
