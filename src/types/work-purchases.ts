/** What a supplier provides; used to suggest the expense account (Phase 6f). */
export enum SupplierCategory {
  SUBCONTRACTOR = "subcontractor",
  SOFTWARE = "software",
  HARDWARE = "hardware",
  OFFICE = "office",
  SERVICES = "services",
  OTHER = "other",
}

export enum SupplierStatus {
  ACTIVE = "active",
  ARCHIVED = "archived",
}

/** A company or freelancer the workspace buys from (Phase 6f.1). */
export interface Supplier {
  id: string
  workspaceId: string
  name: string
  /** Name on their invoices when it differs */
  legalName?: string
  category: SupplierCategory
  status: SupplierStatus
  /** Morocco: 15-digit company identifier */
  ice?: string
  /** Identifiant fiscal */
  taxId?: string
  /** ISO country code; defaults to the company's */
  country?: string
  email?: string
  phone?: string
  address?: string
  /** Days we have to pay their bills */
  paymentTermsDays: number
  bankName?: string
  /** Morocco: 24-digit RIB; otherwise an IBAN or account number */
  bankAccount?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export type SupplierInput = Omit<Supplier, "id" | "workspaceId" | "createdAt" | "updatedAt">
