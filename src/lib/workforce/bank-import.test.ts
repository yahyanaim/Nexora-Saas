import { describe, it, expect, beforeEach } from "vitest"
import { allocate, confidenceOf, guessMapping, matchCandidates, openInvoices, parseAmount, parseCsv, parseDate, toBankLines } from "./bank-import"
import { confirmBankImportApi, getBankMappingApi, listBankLinesApi, sampleStatementApi, saveBankMappingApi } from "@/lib/api/bank-import-api"
import { listClientInvoicesApi } from "@/lib/api/work-billing-api"
import { listClientsApi } from "@/lib/api/clients-api"
import { invoiceBalance } from "./billing"
import { ClientInvoiceStatus, type ClientInvoice } from "@/types/work-billing"

const WS = "ws_atlas"
const inv = (over: Partial<ClientInvoice>): ClientInvoice => ({
  id: "i1", workspaceId: "ws", number: "FAC-2026-0012", clientId: "c1", currency: "MAD", issueDate: "2026-09-01", dueDate: "2026-10-01", status: ClientInvoiceStatus.SENT,
  lines: [{ id: "l", description: "Work", quantity: 1, unitPrice: 10000, timeEntryIds: [] }], taxRate: 20, createdAt: "", updatedAt: "", ...over,
})

describe("bank statement import (Phase 6h.1)", () => {
  beforeEach(() => localStorage.clear())

  it("reads Moroccan-style CSV, amounts and dates", () => {
    const t = parseCsv('﻿Date opération;Libellé;Débit;Crédit\r\n05/10/2026;"VIR RECU; ORBIT";;12 000,00\r\n06/10/2026;FRAIS;45,00;\r\n\r\n')
    expect(t.headers).toEqual(["Date opération", "Libellé", "Débit", "Crédit"])
    expect(t.rows[0]).toEqual(["05/10/2026", "VIR RECU; ORBIT", "", "12 000,00"])
    expect(parseCsv("date,amount\n2026-10-05,1,234.50").headers).toEqual(["date", "amount"])
    expect([parseAmount("1 234,56"), parseAmount("1.234,56"), parseAmount("1,234.56"), parseAmount("-45,00"), parseAmount("(12.5)"), parseAmount("1234 MAD"), parseAmount("abc")]).toEqual([1234.56, 1234.56, 1234.56, -45, -12.5, 1234, NaN])
    expect([parseDate("15/10/2026"), parseDate("15.10.26"), parseDate("2026-10-15"), parseDate("31/13/2026"), parseDate("x")]).toEqual(["2026-10-15", "2026-10-15", "2026-10-15", "", ""])
    const map = guessMapping(t.headers)
    expect(map).toEqual({ date: 0, label: 1, credit: 3, debit: 2 })
    const { lines, skipped } = toBankLines(t, map)
    expect(lines.map((l) => [l.date, l.amount])).toEqual([["2026-10-05", 12000], ["2026-10-06", -45]])
    expect(skipped).toBe(0)
  })

  it("ranks invoices by number, amount, client and date", () => {
    const a = inv({})
    const b = inv({ id: "i2", number: "FAC-2026-0013", clientId: "c2", lines: [{ id: "l", description: "W", quantity: 1, unitPrice: 5000, timeEntryIds: [] }] })
    const clients = [{ id: "c1", name: "Orbit Logistics" }, { id: "c2", name: "Helio Energy" }] as never
    const line = (label: string, amount: number) => ({ key: label, date: "2026-10-03", amount, label })
    const byNumber = matchCandidates(line("VIR 20260012 ORBIT", 12000), [a, b], [a, b], clients)
    expect(byNumber[0]).toMatchObject({ invoice: { id: "i1" }, reasons: ["number", "amount", "client", "date"] })
    expect(confidenceOf(byNumber[0]!.score)).toBe("high")
    const byAmount = matchCandidates(line("VIREMENT HELIO", 6000), [a, b], [a, b], clients)
    expect(byAmount[0]!.invoice.id).toBe("i2")
    expect(confidenceOf(byAmount[0]!.score)).toBe("medium")
    expect(matchCandidates(line("PRLV CNSS", -18450), [a, b], [a, b], clients)).toEqual([])
    expect(openInvoices([a, inv({ id: "x", status: ClientInvoiceStatus.PAID }), inv({ id: "e", currency: "EUR" })], "MAD").map((i) => i.id)).toEqual(["i1"])
    expect(allocate(15000, [{ id: "a", balance: 12000 }, { id: "b", balance: 6000 }])).toEqual({ parts: [{ invoiceId: "a", amount: 12000 }, { invoiceId: "b", amount: 3000 }], unallocated: 0 })
    expect(allocate(5000, [{ id: "a", balance: 2000 }]).unallocated).toBe(3000)
  })

  it("records payments once, even when the file is imported twice", async () => {
    const csv = await sampleStatementApi(WS, "MAD")
    const table = parseCsv(csv)
    const { lines } = toBankLines(table, guessMapping(table.headers))
    const all = await listClientInvoicesApi(WS)
    const clients = await listClientsApi(WS)
    const open = openInvoices(all, "MAD")
    const decisions = lines.map((line) => ({ line, invoiceIds: line.amount > 0 ? (matchCandidates(line, open, all, clients)[0] ? [matchCandidates(line, open, all, clients)[0]!.invoice.id] : null) : null }))
    const first = decisions.find((d) => d.invoiceIds)!
    const before = invoiceBalance(all.find((i) => i.id === first.invoiceIds![0])!, all)
    const s1 = await confirmBankImportApi(WS, "releve.csv", decisions)
    expect(s1.payments).toBeGreaterThanOrEqual(2)
    expect(s1.duplicates).toBe(0)
    const after = await listClientInvoicesApi(WS)
    expect(invoiceBalance(after.find((i) => i.id === first.invoiceIds![0])!, after)).toBe(Math.max(0, before - first.line.amount))
    const s2 = await confirmBankImportApi(WS, "releve.csv", decisions)
    expect(s2).toMatchObject({ payments: 0, duplicates: decisions.length })
    expect((await listBankLinesApi(WS)).length).toBe(decisions.length)
    await saveBankMappingApi(WS, table.headers, { date: 0, label: 1, amount: 3 })
    expect(await getBankMappingApi(WS, table.headers)).toEqual({ date: 0, label: 1, amount: 3 })
  })
})
