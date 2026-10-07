"use client"

import { useMemo, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { EmptyState } from "@/components/ui/empty-state"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle, FileUp, Landmark, Plus, Upload, Warning, X } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { formatMoney } from "../workforce-chunks/workforce-labels"
import { useClientInvoices } from "@/hooks/workforce/use-work-billing"
import { useClients } from "@/hooks/workforce/use-workforce"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { translateError } from "@/lib/errors/translate-error"
import { confirmBankImportApi, getBankMappingApi, listBankLinesApi, sampleStatementApi, saveBankMappingApi, type BankDecision } from "@/lib/api/bank-import-api"
import { allocate, confidenceOf, guessMapping, matchCandidates, openInvoices, parseCsv, toBankLines, type BankLine, type BankMapping, type Confidence, type CsvTable } from "@/lib/workforce/bank-import"
import { invoiceBalance } from "@/lib/workforce/billing"
import { cn } from "@/lib/utils"

const IGNORE = "__ignore__"
const NONE = "__none__"

const CONF_CLASS: Record<Confidence, string> = {
  high: "bg-success-soft text-success-foreground border-transparent",
  medium: "bg-warning-soft text-warning-foreground border-transparent",
  none: "bg-muted text-muted-foreground border-transparent",
}

/** Import a bank statement and turn incoming transfers into invoice payments (Phase 6h.1). */
export default function BankImportPage() {
  const t = useTranslations()
  const locale = useLocale()
  const { id: workspaceId, currency } = useCurrentWorkspace()
  const queryClient = useQueryClient()
  const { data: invoices = [] } = useClientInvoices()
  const { data: clients = [] } = useClients()
  const { data: history = [] } = useQuery({ queryKey: ["bank-lines", workspaceId], queryFn: () => listBankLinesApi(workspaceId) })
  const fileRef = useRef<HTMLInputElement>(null)

  const [fileName, setFileName] = useState("")
  const [table, setTable] = useState<CsvTable | null>(null)
  const [mapping, setMapping] = useState<BankMapping | null>(null)
  const [choices, setChoices] = useState<Record<string, string[] | null>>({})
  const [showOut, setShowOut] = useState(false)

  const money = (n: number) => formatMoney(n, currency, locale)
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(`${iso}T00:00:00`))
  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? ""

  const open = useMemo(() => openInvoices(invoices, currency), [invoices, currency])
  const imported = useMemo(() => new Set(history.map((h) => h.key)), [history])
  const parsed = useMemo(() => (table && mapping ? toBankLines(table, mapping) : { lines: [], skipped: 0 }), [table, mapping])
  const candidates = useMemo(
    () => Object.fromEntries(parsed.lines.map((l) => [l.key, matchCandidates(l, open, invoices, clients)])),
    [parsed.lines, open, invoices, clients]
  )

  // Default choice: the best match when there is one, otherwise ignore
  const chosen = (line: BankLine): string[] | null => {
    if (line.key in choices) return choices[line.key]!
    if (line.amount <= 0) return null
    const best = candidates[line.key]?.[0]
    return best && confidenceOf(best.score) !== "none" ? [best.invoice.id] : null
  }

  const load = async (name: string, text: string) => {
    const tbl = parseCsv(text)
    if (tbl.headers.length < 2 || tbl.rows.length === 0) {
      toast.error(t("bankUnreadable"))
      return
    }
    setFileName(name)
    setTable(tbl)
    setChoices({})
    setMapping((await getBankMappingApi(workspaceId, tbl.headers)) ?? guessMapping(tbl.headers))
  }

  const reset = () => {
    setTable(null)
    setMapping(null)
    setChoices({})
    setFileName("")
    if (fileRef.current) fileRef.current.value = ""
  }

  const visible = parsed.lines.filter((l) => showOut || l.amount > 0)
  const fresh = parsed.lines.filter((l) => !imported.has(l.key))
  const toRecord = fresh.filter((l) => chosen(l)?.length)
  const amountToRecord = toRecord.reduce((s, l) => s + l.amount, 0)
  const autoMatched = fresh.filter((l) => l.amount > 0 && confidenceOf(candidates[l.key]?.[0]?.score) === "high").length

  const confirm = useMutation({
    mutationFn: async () => {
      if (table && mapping) await saveBankMappingApi(workspaceId, table.headers, mapping)
      const decisions: BankDecision[] = parsed.lines.map((line) => ({ line, invoiceIds: chosen(line) }))
      return confirmBankImportApi(workspaceId, fileName, decisions)
    },
    onSuccess: (s) => {
      toast.success(t("bankDone", { payments: s.payments, amount: money(s.amount), ignored: s.ignored }))
      if (s.duplicates) toast.info(t("bankDuplicates", { count: s.duplicates }))
      queryClient.invalidateQueries({ queryKey: ["bank-lines", workspaceId] })
      queryClient.invalidateQueries({ queryKey: ["client-invoices", workspaceId] })
      reset()
    },
    onError: (err) => toast.error(translateError(err, t)),
  })

  const cards: MetricCardItem[] = [
    { key: "lines", title: t("bankLines"), value: parsed.lines.length, footer: { icon: FileUp, text: t("bankLinesHint", { in: parsed.lines.filter((l) => l.amount > 0).length, skipped: parsed.skipped }) } },
    { key: "auto", title: t("bankAuto"), value: autoMatched, valueClassName: autoMatched ? "text-success" : undefined, footer: { icon: CheckCircle, text: t("bankAutoHint") } },
    { key: "amount", title: t("bankToRecord"), value: money(amountToRecord), valueClassName: "text-primary", footer: { icon: Landmark, text: t("bankToRecordHint", { count: toRecord.length }) } },
    { key: "dupes", title: t("bankAlready"), value: parsed.lines.length - fresh.length, footer: { icon: Warning, text: t("bankAlreadyHint") } },
  ]

  const columnSelect = (label: string, value: number | undefined, onChange: (v: number | undefined) => void, optional = false) => (
    <div className="flex min-w-40 flex-1 flex-col gap-1.5">
      <Label className="text-xs">{label}</Label>
      <Select value={value === undefined ? NONE : String(value)} onValueChange={(v) => onChange(v === NONE ? undefined : Number(v))}>
        <SelectTrigger className="w-full bg-card" aria-label={label}><SelectValue>{value === undefined ? t("bankNoColumn") : table?.headers[value]}</SelectValue></SelectTrigger>
        <SelectContent>
          {optional && <SelectItem value={NONE}>{t("bankNoColumn")}</SelectItem>}
          {table?.headers.map((h, i) => <SelectItem key={i} value={String(i)}>{h || `#${i + 1}`}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )

  const splitMode = mapping?.amount === undefined
  const invoiceLabel = (id: string) => {
    const i = invoices.find((x) => x.id === id)
    return i ? `${i.number} · ${clientName(i.clientId)} · ${money(invoiceBalance(i, invoices))}` : ""
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader />

      {!table ? (
        <section className="rounded-3xl border border-dashed border-border bg-card p-8 text-center shadow-panel">
          <Landmark className="mx-auto mb-3 size-8 text-muted-foreground" />
          <h2 className="text-base font-semibold">{t("bankUploadTitle")}</h2>
          <p className="mx-auto mb-5 max-w-lg text-sm text-muted-foreground">{t("bankUploadHint")}</p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt,text/csv"
            className="hidden"
            aria-label={t("bankChooseFile")}
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (file) await load(file.name, await file.text())
            }}
          />
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => fileRef.current?.click()}><Upload className="size-4" /> {t("bankChooseFile")}</Button>
            <Button variant="outline" onClick={async () => load("sample-statement.csv", await sampleStatementApi(workspaceId, currency))}>{t("bankTrySample")}</Button>
          </div>
        </section>
      ) : (
        <>
          <MetricCardGrid cards={cards} />

          <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">{t("bankColumns")}</h2>
                <p className="text-sm text-muted-foreground">{t("bankColumnsHint", { file: fileName })}</p>
              </div>
              <Button variant="outline" size="sm" onClick={reset}><X className="size-4" /> {t("bankOtherFile")}</Button>
            </div>
            {mapping && (
              <div className="flex flex-wrap gap-3">
                {columnSelect(t("date"), mapping.date, (v) => setMapping({ ...mapping, date: v ?? 0 }))}
                {columnSelect(t("bankLabel"), mapping.label, (v) => setMapping({ ...mapping, label: v ?? 0 }))}
                <div className="flex min-w-40 flex-col gap-1.5">
                  <Label className="text-xs">{t("bankAmountLayout")}</Label>
                  <Select value={splitMode ? "split" : "one"} onValueChange={(v) => setMapping(v === "split" ? { date: mapping.date, label: mapping.label, reference: mapping.reference, credit: mapping.amount ?? 0 } : { date: mapping.date, label: mapping.label, reference: mapping.reference, amount: mapping.credit ?? 0 })}>
                    <SelectTrigger className="w-full bg-card" aria-label={t("bankAmountLayout")}><SelectValue>{t(splitMode ? "bankLayoutSplit" : "bankLayoutOne")}</SelectValue></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one">{t("bankLayoutOne")}</SelectItem>
                      <SelectItem value="split">{t("bankLayoutSplit")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {splitMode ? (
                  <>
                    {columnSelect(t("bankCredit"), mapping.credit, (v) => setMapping({ ...mapping, credit: v ?? 0 }))}
                    {columnSelect(t("bankDebit"), mapping.debit, (v) => setMapping({ ...mapping, debit: v }), true)}
                  </>
                ) : (
                  columnSelect(t("amount"), mapping.amount, (v) => setMapping({ ...mapping, amount: v ?? 0 }))
                )}
                {columnSelect(t("bankReference"), mapping.reference, (v) => setMapping({ ...mapping, reference: v }), true)}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">{t("bankReview")}</h2>
                <p className="text-sm text-muted-foreground">{t("bankReviewHint")}</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="bank-out" checked={showOut} onCheckedChange={setShowOut} />
                <Label htmlFor="bank-out" className="text-sm">{t("bankShowOut")}</Label>
              </div>
            </div>
            {visible.length === 0 ? (
              <EmptyState icon={Landmark} title={t("bankNoLines")} hint={t("bankNoLinesHint")} />
            ) : (
              <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
                {visible.map((line) => {
                  const done = imported.has(line.key)
                  const list = candidates[line.key] ?? []
                  const pick = chosen(line) ?? []
                  const conf = pick.length ? confidenceOf(list.find((c) => c.invoice.id === pick[0])?.score) : "none"
                  const balances = pick.map((id) => ({ id, balance: invoiceBalance(invoices.find((i) => i.id === id)!, invoices) }))
                  const { unallocated } = allocate(line.amount, balances)
                  const others = open.filter((i) => !pick.includes(i.id))
                  const setPick = (ids: string[] | null) => setChoices((c) => ({ ...c, [line.key]: ids }))
                  return (
                    <li key={line.key} className={cn("flex flex-col gap-2 px-4 py-3 lg:flex-row lg:items-center", (done || line.amount <= 0) && "opacity-60")}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{line.label || "—"}</p>
                        <p className="text-xs text-muted-foreground">{date(line.date)}{line.reference ? ` · ${line.reference}` : ""}</p>
                      </div>
                      <span className={cn("w-32 text-sm font-semibold tabular-nums lg:text-end", line.amount < 0 && "text-muted-foreground")}>{money(line.amount)}</span>
                      <div className="flex w-full flex-col gap-1.5 lg:w-[26rem]">
                        {done ? (
                          <Badge variant="outline" className="w-fit border-transparent bg-muted text-muted-foreground">{t("bankAlreadyBadge")}</Badge>
                        ) : line.amount <= 0 ? (
                          <span className="text-xs text-muted-foreground">{t("bankMoneyOut")}</span>
                        ) : (
                          <>
                            {(pick.length ? pick : [IGNORE]).map((id, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <Select
                                  value={id}
                                  onValueChange={(v) => {
                                    if (v === IGNORE) setPick(idx === 0 ? null : pick.filter((_, i) => i !== idx))
                                    else setPick(pick.length ? pick.map((x, i) => (i === idx ? v : x)) : [v])
                                  }}
                                >
                                  <SelectTrigger className="h-9 w-full bg-card text-xs" aria-label={t("bankMatch")}><SelectValue>{id === IGNORE ? t(idx === 0 ? "bankIgnore" : "bankRemove") : invoiceLabel(id)}</SelectValue></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={IGNORE}>{t(idx === 0 ? "bankIgnore" : "bankRemove")}</SelectItem>
                                    {[...list.map((c) => c.invoice), ...open.filter((i) => !list.some((c) => c.invoice.id === i.id))]
                                      .filter((i) => i.id === id || !pick.includes(i.id))
                                      .map((i) => <SelectItem key={i.id} value={i.id}>{invoiceLabel(i.id)}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                                {idx === 0 && <Badge variant="outline" className={cn("shrink-0", CONF_CLASS[conf])}>{t(`bankConf_${conf}`)}</Badge>}
                              </div>
                            ))}
                            <div className="flex flex-wrap items-center gap-2">
                              {pick.length > 0 && unallocated > 0 && others.length > 0 && (
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setPick([...pick, others[0]!.id])}><Plus className="size-3.5" /> {t("bankSplit")}</Button>
                              )}
                              {pick.length > 0 && unallocated > 0 && <span className="text-xs text-warning-foreground">{t("bankUnallocated", { amount: money(unallocated) })}</span>}
                              {pick.length > 0 && list[0] && pick[0] === list[0].invoice.id && <span className="text-xs text-muted-foreground">{list[0].reasons.map((r) => t(`bankWhy_${r}`)).join(" · ")}</span>}
                            </div>
                          </>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
              <p className="text-sm text-muted-foreground">{t("bankConfirmHint", { count: toRecord.length, amount: money(amountToRecord) })}</p>
              <Button disabled={confirm.isPending || fresh.length === 0} onClick={() => confirm.mutate()}><CheckCircle className="size-4" /> {t("bankConfirm")}</Button>
            </div>
          </section>
        </>
      )}

      <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
        <h2 className="text-base font-semibold">{t("bankHistory")}</h2>
        <p className="mb-4 text-sm text-muted-foreground">{t("bankHistoryHint")}</p>
        {history.length === 0 ? (
          <EmptyState icon={Landmark} title={t("bankNoHistory")} hint={t("bankNoHistoryHint")} />
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
            {history.slice(0, 50).map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{h.label || "—"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {date(h.date)} · {h.fileName}
                    {h.payments.length ? ` · ${h.payments.map((p) => `${p.invoiceNumber} (${money(p.amount)})`).join(", ")}` : ""}
                  </p>
                </div>
                <span className="text-sm tabular-nums">{money(h.amount)}</span>
                <Badge variant="outline" className={h.status === "matched" ? CONF_CLASS.high : CONF_CLASS.none}>{t(h.status === "matched" ? "bankStatusMatched" : "bankStatusIgnored")}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
