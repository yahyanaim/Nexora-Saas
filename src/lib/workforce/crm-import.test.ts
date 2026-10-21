import { beforeEach, describe, expect, it } from "vitest"
import { checkRows, clientFields, guessColumns, hasErrors, readDate, readRows, templateRows, type ImportContext } from "./crm-import"
import { importContextApi, importCrmApi } from "@/lib/api/crm-import-api"
import { listClientsApi } from "@/lib/api/clients-api"
import { listDealsApi } from "@/lib/api/deals-api"
import { readXlsx, excelSerialToIso } from "@/lib/utils/xlsx-read"
import { ClientStatus, LeadSource } from "@/types/workforce"
import { DealStage } from "@/types/work-sales"

let ctx: ImportContext

describe("CSV / Excel import (CRM step 7)", () => {
  beforeEach(async () => {
    localStorage.clear()
    ctx = await importContextApi("ws_atlas")
  })

  it("guesses the columns from the template, French and other names", () => {
    const [headers] = templateRows("clients")
    const mapping = guessColumns(headers!, "clients")
    expect(mapping.name).toBe(0)
    expect(mapping.contactEmail).toBe(headers!.indexOf("Contact email"))
    const fr = guessColumns(["Raison sociale", "Courriel", "Téléphone", "Délai de paiement", "Divers"], "clients")
    expect(fr).toMatchObject({ name: 0, email: 1, phone: 2, paymentTermsDays: 3 })
    expect(Object.values(fr)).not.toContain(4)
  })

  it("flags each bad cell and finds the clients that already exist", () => {
    const mapping = { name: 0, email: 1, ice: 2, status: 3, leadSource: 4, accountManager: 5 }
    const rows = readRows(
      [
        ["New Co", "hello@new.example", "", "prospect", "salon", "Sara Bennani"],
        ["", "not-an-email", "123", "maybe", "tv", "Nobody"],
        ["Medica (renamed)", "finance@medica.example", "", "", "", ""],
        ["Again", "hello@new.example", "", "", "", ""],
        ["With ICE", "other@new.example", "001234567000089", "", "", ""],
        ["Same e-mail, no ICE", "OTHER@new.example", "", "", "", ""],
      ],
      mapping,
      "clients",
      ctx
    )
    expect(rows[0]).toMatchObject({ line: 2, action: "create", errors: {} })
    expect(clientFields(rows[0]!, ctx)).toMatchObject({ status: ClientStatus.LEAD, leadSource: LeadSource.EVENT, accountManagerId: "emp_sara" })
    expect(rows[1]!.errors).toEqual({ name: "required", email: "email", ice: "ice", status: "status", leadSource: "source", accountManager: "unknownPerson" })
    expect(rows[2]).toMatchObject({ action: "update", target: "cli_medica" })
    expect(rows[3]!.errors).toEqual({ email: "duplicate" })
    // a row repeating an earlier row's e-mail is a duplicate even when only the earlier one has an ICE
    expect(rows[4]!.errors).toEqual({})
    expect(rows[5]!.errors).toEqual({ email: "duplicate" })
  })

  it("checks contacts and deals against their client", () => {
    const contacts = checkRows([{ line: 2, values: { client: "001523874000062", name: "Rachid A.", email: "RACHID@helio.example", role: "cto" } }, { line: 3, values: { client: "Unknown Ltd", name: "X", email: "x@y.z" } }], "contacts", ctx)
    expect(contacts[0]).toMatchObject({ clientId: "cli_helio", action: "update", target: "con_3", errors: {} })
    expect(contacts[1]!.errors).toEqual({ client: "unknownClient" })
    const deals = checkRows([{ line: 2, values: { client: "Orbit Logistics", title: "warehouse app audit", amount: "95 000,00", expectedClose: "31/12/2026", stage: "négociation", contact: "Nobody" } }], "deals", ctx)
    expect(deals[0]).toMatchObject({ clientId: "cli_orbit", action: "update", target: "deal_orbit_old", errors: { contact: "unknownContact" } })
  })

  it("reads dates written by people and by Excel", () => {
    expect(readDate("2026-12-31")).toBe("2026-12-31")
    expect(readDate("31/12/2026")).toBe("2026-12-31")
    expect(readDate("46387")).toBe("2026-12-31")
    expect(excelSerialToIso("12")).toBeNull()
    expect(readDate("soon")).toBe("")
  })

  it("adds new clients with their main contact and updates known ones without erasing empty cells", async () => {
    const res = await importCrmApi("ws_atlas", "clients", [
      { line: 2, values: { name: "Atlas Print", email: "billing@atlasprint.example", status: "lead", tags: "Print; Casablanca", contactName: "Karim", contactEmail: "karim@atlasprint.example" } },
      { line: 3, values: { name: "", email: "finance@medica.example", phone: "+212 522 11 22 33" } },
      { line: 4, values: { name: "", email: "broken" } },
    ])
    expect(res).toEqual({ created: 1, updated: 1, failed: [{ line: 4, message: "This row still has errors" }] })
    const clients = await listClientsApi("ws_atlas")
    const atlas = clients.find((c) => c.name === "Atlas Print")!
    expect(atlas).toMatchObject({ status: ClientStatus.LEAD, tags: ["Print", "Casablanca"], paymentTermsDays: 30 })
    expect(atlas.contacts).toEqual([expect.objectContaining({ name: "Karim", email: "karim@atlasprint.example", isPrimary: true })])
    const medica = clients.find((c) => c.id === "cli_medica")!
    expect(medica).toMatchObject({ name: "Medica Health", phone: "+212 522 11 22 33", ice: "002196385000041" })
  })

  it("adds contacts and deals, then updates them when imported again", async () => {
    expect(await importCrmApi("ws_atlas", "contacts", [{ line: 2, values: { client: "Helio Energy", name: "Leila", email: "leila@helio.example", isPrimary: "oui" } }])).toMatchObject({ created: 1 })
    const helio = (await listClientsApi("ws_atlas")).find((c) => c.id === "cli_helio")!
    expect(helio.contacts.map((c) => [c.name, c.isPrimary])).toEqual([["Rachid Amrani", false], ["Leila", true]])

    const deal = { client: "Helio Energy", title: "Solar monitoring", amount: "150000", expectedClose: "2026-12-15", stage: "proposal", contact: "leila@helio.example" }
    expect(await importCrmApi("ws_atlas", "deals", [{ line: 2, values: deal }])).toMatchObject({ created: 1, updated: 0 })
    expect(await importCrmApi("ws_atlas", "deals", [{ line: 2, values: { ...deal, amount: "175000", stage: "" } }])).toMatchObject({ created: 0, updated: 1 })
    const saved = (await listDealsApi("ws_atlas")).filter((d) => d.title === "Solar monitoring")
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({ amount: 175000, stage: DealStage.PROPOSAL, contactId: helio.contacts[1]!.id })
  })

  it("reads the first sheet of an .xlsx file", async () => {
    const bytes = await makeXlsx([
      ["Name", "Email", "Amount"],
      ["Atlas Print", "a@b.c", 1250],
    ])
    expect(await readXlsx(bytes)).toEqual([
      ["Name", "Email", "Amount"],
      ["Atlas Print", "a@b.c", "1250"],
    ])
    expect(hasErrors({ line: 1, values: {}, errors: {}, action: "create" })).toBe(false)
  })
})

/** A minimal .xlsx (zip with shared strings and one sheet), built the way Excel stores it. */
async function makeXlsx(rows: (string | number)[][]): Promise<ArrayBuffer> {
  const strings: string[] = []
  const sid = (s: string) => (strings.includes(s) ? strings.indexOf(s) : strings.push(s) - 1)
  const col = (i: number) => String.fromCharCode(65 + i)
  const sheet = `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows
    .map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => (typeof v === "number" ? `<c r="${col(ci)}${ri + 1}"><v>${v}</v></c>` : `<c r="${col(ci)}${ri + 1}" t="s"><v>${sid(v)}</v></c>`)).join("")}</row>`)
    .join("")}</sheetData></worksheet>`
  const shared = `<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${strings.map((s) => `<si><t>${s}</t></si>`).join("")}</sst>`
  const files: [string, string][] = [["xl/worksheets/sheet1.xml", sheet], ["xl/sharedStrings.xml", shared]]
  const enc = new TextEncoder()
  const parts: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0
  for (const [name, content] of files) {
    const raw = enc.encode(content)
    const data = new Uint8Array(await new Response(new Response(raw).body!.pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer())
    const nameBytes = enc.encode(name)
    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(8, 8, true)
    local.setUint32(18, data.length, true)
    local.setUint32(22, raw.length, true)
    local.setUint16(26, nameBytes.length, true)
    parts.push(new Uint8Array(local.buffer), nameBytes, data)
    const cd = new DataView(new ArrayBuffer(46))
    cd.setUint32(0, 0x02014b50, true)
    cd.setUint16(10, 8, true)
    cd.setUint32(20, data.length, true)
    cd.setUint32(24, raw.length, true)
    cd.setUint16(28, nameBytes.length, true)
    cd.setUint32(42, offset, true)
    central.push(new Uint8Array(cd.buffer), nameBytes)
    offset += 30 + nameBytes.length + data.length
  }
  const cdSize = central.reduce((s, p) => s + p.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(8, files.length, true)
  end.setUint16(10, files.length, true)
  end.setUint32(12, cdSize, true)
  end.setUint32(16, offset, true)
  const all = [...parts, ...central, new Uint8Array(end.buffer)]
  const out = new Uint8Array(all.reduce((s, p) => s + p.length, 0))
  let p = 0
  for (const a of all) {
    out.set(a, p)
    p += a.length
  }
  return out.buffer
}
