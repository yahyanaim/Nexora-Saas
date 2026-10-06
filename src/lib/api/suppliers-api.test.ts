import { describe, it, expect, beforeEach } from "vitest"
import { createSupplierApi, deleteSupplierApi, listSuppliersApi, updateSupplierApi } from "./suppliers-api"
import { SupplierCategory, SupplierStatus } from "@/types/work-purchases"

const WS = "ws_atlas"
const base = { name: "Atlas Print", category: SupplierCategory.SERVICES, status: SupplierStatus.ACTIVE, paymentTermsDays: 30 }

describe("suppliers (Phase 6f.1)", () => {
  beforeEach(() => localStorage.clear())

  it("seeds Moroccan suppliers with ICE and RIB", async () => {
    const list = await listSuppliersApi(WS)
    expect(list.find((s) => s.id === "sup_cloud")).toMatchObject({ ice: "001987654000033", bankAccount: "007780000123456789012345" })
  })

  it("cleans identifiers and checks Moroccan formats", async () => {
    const s = await createSupplierApi(WS, { ...base, ice: "001 112 223 000 044", bankAccount: "0077 8000 0123 4567 8901 2399" })
    expect(s.ice).toBe("001112223000044")
    expect(s.bankAccount).toBe("007780000123456789012399")
    await expect(createSupplierApi(WS, { ...base, name: "Bad RIB", bankAccount: "12345" })).rejects.toThrow(/24 digits/)
    await expect(createSupplierApi(WS, { ...base, name: "Bad ICE", ice: "123" })).rejects.toThrow(/15 digits/)
    await expect(createSupplierApi(WS, { ...base, name: "Bad IF", taxId: "12" })).rejects.toThrow(/6 to 8 digits/)
    // A foreign supplier keeps its own formats
    await expect(createSupplierApi(WS, { ...base, name: "Paris SAS", country: "FR", taxId: "FR12345678901", bankAccount: "FR7630006000011234567890189" })).resolves.toBeTruthy()
  })

  it("refuses duplicates, bad terms and archives or deletes", async () => {
    await expect(createSupplierApi(WS, { ...base, name: "maghreb cloud" })).rejects.toThrow(/already exists/)
    await expect(createSupplierApi(WS, { ...base, name: "Copy", ice: "001987654000033" })).rejects.toThrow(/ICE/)
    await expect(createSupplierApi(WS, { ...base, name: "Late", paymentTermsDays: 400 })).rejects.toThrow(/365/)
    expect((await updateSupplierApi(WS, "sup_dev", { status: SupplierStatus.ARCHIVED })).status).toBe(SupplierStatus.ARCHIVED)
    await deleteSupplierApi(WS, "sup_old")
    expect((await listSuppliersApi(WS)).some((s) => s.id === "sup_old")).toBe(false)
  })
})
