import { createCollection } from "@/lib/workforce/demo-store"
import { assertSupplier, cleanSupplier } from "@/lib/workforce/suppliers"
import { recordAudit } from "@/lib/workforce/audit"
import { SupplierCategory, SupplierStatus, type Supplier, type SupplierInput } from "@/types/work-purchases"

/**
 * Suppliers and subcontractors (Phase 6f.1). Backed by the browser demo store
 * for now; replace the bodies with apiClient calls once the backend exists.
 */
const STAMP = "2026-01-01T00:00:00.000Z"
const suppliers = createCollection<Supplier>("suppliers", "sup", (workspaceId) => {
  const rows: Omit<Supplier, "workspaceId" | "createdAt" | "updatedAt">[] =
    workspaceId === "ws_atlas"
      ? [
          { id: "sup_cloud", name: "Maghreb Cloud", legalName: "Maghreb Cloud SARL", category: SupplierCategory.SOFTWARE, status: SupplierStatus.ACTIVE, ice: "001987654000033", taxId: "45129873", email: "factures@maghrebcloud.example", phone: "+212 522 30 40 50", address: "Technopark, Casablanca", paymentTermsDays: 30, bankName: "Attijariwafa Bank", bankAccount: "007780000123456789012345" },
          { id: "sup_dev", name: "Youssef Amrani (freelance)", category: SupplierCategory.SUBCONTRACTOR, status: SupplierStatus.ACTIVE, ice: "003214569000071", taxId: "50311224", email: "youssef@amrani.example", address: "Rabat", paymentTermsDays: 15, bankName: "CIH Bank", bankAccount: "230810000987654321098765" },
          { id: "sup_office", name: "Bureau Plus", legalName: "Bureau Plus SA", category: SupplierCategory.OFFICE, status: SupplierStatus.ACTIVE, ice: "000456123000018", taxId: "1098765", address: "Bd Zerktouni, Casablanca", paymentTermsDays: 60 },
          { id: "sup_old", name: "Print Express", category: SupplierCategory.SERVICES, status: SupplierStatus.ARCHIVED, paymentTermsDays: 30 },
        ]
      : workspaceId === "ws_northwind"
        ? [{ id: "sup_gear", name: "Gear Rental Co", category: SupplierCategory.HARDWARE, status: SupplierStatus.ACTIVE, country: "US", taxId: "93-1234567", email: "billing@gear.example", paymentTermsDays: 30 }]
        : []
  return rows.map((r) => ({ ...r, workspaceId, createdAt: STAMP, updatedAt: STAMP }))
})

async function companyCountry(workspaceId: string) {
  const { getSettingsApi } = await import("./settings-api")
  return (await getSettingsApi(workspaceId)).company.country
}

export async function listSuppliersApi(workspaceId: string): Promise<Supplier[]> {
  return suppliers.list(workspaceId)
}

export async function createSupplierApi(workspaceId: string, input: SupplierInput): Promise<Supplier> {
  const clean = cleanSupplier(input)
  assertSupplier(clean, await companyCountry(workspaceId), suppliers.list(workspaceId))
  const created = suppliers.create(workspaceId, clean)
  recordAudit(workspaceId, { action: "Supplier created", actionKey: "supplier.created", category: "Billing", target: created.name })
  return created
}

export async function updateSupplierApi(workspaceId: string, id: string, input: Partial<SupplierInput>): Promise<Supplier> {
  const current = suppliers.get(workspaceId, id)
  if (!current) throw new Error("Supplier not found")
  const clean = cleanSupplier(input)
  assertSupplier({ ...current, ...clean }, await companyCountry(workspaceId), suppliers.list(workspaceId), id)
  const updated = suppliers.update(workspaceId, id, clean)
  recordAudit(workspaceId, { action: "Supplier updated", actionKey: "supplier.updated", category: "Billing", target: updated.name })
  return updated
}

/** Deletes a supplier. Once bills exist (Phase 6f.2) suppliers are archived instead. */
export async function deleteSupplierApi(workspaceId: string, id: string): Promise<void> {
  const current = suppliers.get(workspaceId, id)
  if (!current) throw new Error("Supplier not found")
  suppliers.remove(workspaceId, id)
  recordAudit(workspaceId, { action: "Supplier deleted", actionKey: "supplier.deleted", category: "Billing", target: current.name })
}
