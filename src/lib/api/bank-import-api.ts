import { createCollection } from "@/lib/workforce/demo-store"
import { addDays } from "@/lib/workforce/billing"
import { todayIso } from "@/lib/workforce/project-metrics"
import { allocate, openInvoices, type BankLine, type BankMapping } from "@/lib/workforce/bank-import"
import { invoiceBalance } from "@/lib/workforce/billing"
import { recordAudit } from "@/lib/workforce/audit"
import { listClientInvoicesApi, recordPaymentApi } from "./work-billing-api"
import { listClientsApi } from "./clients-api"
import { PaymentMethod } from "@/types/work-billing"

/**
 * Bank statement import (Phase 6h.1). Every line confirmed or ignored is kept,
 * so importing the same file again records nothing twice. Backed by the
 * browser demo store for now; the server will keep the same records.
 */
export interface ImportedBankLine {
  id: string
  workspaceId: string
  key: string
  date: string
  amount: number
  label: string
  status: "matched" | "ignored"
  payments: { invoiceId: string; invoiceNumber: string; amount: number }[]
  /** Part of the amount no invoice could take */
  unallocated: number
  fileName: string
  importedAt: string
  createdAt: string
  updatedAt: string
}

const lines = createCollection<ImportedBankLine>("bank-lines", "bkl", () => [])
/** Column choices remembered per file layout (the header row). */
const mappings = createCollection<{ id: string; workspaceId: string; signature: string; mapping: BankMapping; createdAt: string; updatedAt: string }>("bank-mappings", "bkm", () => [])

const signatureOf = (headers: string[]) => headers.map((h) => h.trim().toLowerCase()).join("|")

export async function listBankLinesApi(workspaceId: string): Promise<ImportedBankLine[]> {
  return lines.list(workspaceId).sort((a, b) => b.importedAt.localeCompare(a.importedAt) || b.date.localeCompare(a.date))
}

export async function getBankMappingApi(workspaceId: string, headers: string[]): Promise<BankMapping | null> {
  return mappings.list(workspaceId).find((m) => m.signature === signatureOf(headers))?.mapping ?? null
}

export async function saveBankMappingApi(workspaceId: string, headers: string[], mapping: BankMapping): Promise<void> {
  const signature = signatureOf(headers)
  const existing = mappings.list(workspaceId).find((m) => m.signature === signature)
  if (existing) mappings.update(workspaceId, existing.id, { mapping })
  else mappings.create(workspaceId, { signature, mapping })
}

export interface BankDecision {
  line: BankLine
  /** Invoices to pay, in order; null to ignore the line */
  invoiceIds: string[] | null
}

/** Records the accepted matches as bank-transfer payments; lines already imported are skipped. */
export async function confirmBankImportApi(workspaceId: string, fileName: string, decisions: BankDecision[]) {
  const done = new Set(lines.list(workspaceId).map((l) => l.key))
  const summary = { payments: 0, amount: 0, ignored: 0, duplicates: 0, unallocated: 0 }
  const now = new Date().toISOString()
  for (const { line, invoiceIds } of decisions) {
    if (done.has(line.key)) { summary.duplicates++; continue }
    done.add(line.key)
    if (!invoiceIds || invoiceIds.length === 0) {
      lines.create(workspaceId, { key: line.key, date: line.date, amount: line.amount, label: line.label, status: "ignored", payments: [], unallocated: line.amount, fileName, importedAt: now })
      summary.ignored++
      continue
    }
    // Balances are read again for each line, so two lines paying one invoice never overpay it
    const all = await listClientInvoicesApi(workspaceId)
    const chosen = invoiceIds.map((id) => all.find((i) => i.id === id)).filter((i) => !!i).map((i) => ({ id: i.id, balance: invoiceBalance(i, all), number: i.number }))
    const { parts, unallocated } = allocate(line.amount, chosen)
    const payments: ImportedBankLine["payments"] = []
    for (const part of parts) {
      await recordPaymentApi(workspaceId, part.invoiceId, { date: line.date, amount: part.amount, method: PaymentMethod.BANK_TRANSFER, reference: line.label.slice(0, 120) })
      payments.push({ ...part, invoiceNumber: chosen.find((c) => c.id === part.invoiceId)?.number ?? "" })
      summary.payments++
      summary.amount += part.amount
    }
    summary.unallocated += unallocated
    lines.create(workspaceId, { key: line.key, date: line.date, amount: line.amount, label: line.label, status: payments.length ? "matched" : "ignored", payments, unallocated, fileName, importedAt: now })
  }
  recordAudit(workspaceId, { action: "Bank statement imported", actionKey: "bank.imported", category: "Billing", target: fileName, after: `${summary.payments} payments, ${summary.ignored} ignored, ${summary.duplicates} already imported` })
  return summary
}

/** A statement in the style of a Moroccan bank export, built from the demo's open invoices, to try the import. */
export async function sampleStatementApi(workspaceId: string, currency: string): Promise<string> {
  const all = await listClientInvoicesApi(workspaceId)
  const clients = await listClientsApi(workspaceId)
  const open = openInvoices(all, currency).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const fr = (n: number) => n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, " ")
  const day = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
  const today = todayIso()
  const rows: string[][] = [["Date opération", "Libellé", "Débit", "Crédit", "Référence"]]
  const [a, b, c] = open
  if (a) rows.push([day(addDays(today, -6)), `VIR RECU ${clients.find((x) => x.id === a.clientId)?.name.toUpperCase() ?? ""} FACT ${a.number}`, "", fr(invoiceBalance(a, all)), "VR0001"])
  if (b) rows.push([day(addDays(today, -4)), `VIREMENT DE ${clients.find((x) => x.id === b.clientId)?.name.toUpperCase() ?? ""}`, "", fr(invoiceBalance(b, all)), "VR0002"])
  if (c) rows.push([day(addDays(today, -3)), `VIR ${c.number.replace(/\D/g, "")} ACOMPTE`, "", fr(Math.round(invoiceBalance(c, all) / 2)), "VR0003"])
  rows.push([day(addDays(today, -5)), "PRLV CNSS COTISATIONS", "18 450,00", "", "PR0001"])
  rows.push([day(addDays(today, -2)), "FRAIS TENUE DE COMPTE", "45,00", "", ""])
  rows.push([day(addDays(today, -1)), "VIR RECU CLIENT INCONNU", "", "2 500,00", "VR0004"])
  return rows.map((r) => r.map((x) => (x.includes(";") ? `"${x}"` : x)).join(";")).join("\n")
}
