"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, ArrowLeft, CheckCircle, Download, FileSpreadsheet, Funnel, Handshake, RotateCcw, Upload, Users } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { Link } from "@/i18n/navigation"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { importContextApi, importCrmApi, type ImportResult } from "@/lib/api/crm-import-api"
import { parseCsv } from "@/lib/workforce/bank-import"
import { checkRows, guessColumns, hasErrors, IMPORT_FIELDS, IMPORT_KINDS, MAX_IMPORT_ROWS, readRows, templateRows, type ColumnMapping, type ImportKind, type ImportRow } from "@/lib/workforce/crm-import"
import { readXlsx } from "@/lib/utils/xlsx-read"
import { translateError } from "@/lib/errors/translate-error"
import { toast } from "@/lib/utils/toast"
import { cn } from "@/lib/utils"

type Step = 1 | 2 | 3 | 4
type Filter = "all" | "errors" | "create" | "update"
const PAGE = 50
const NONE = "none"
const KIND_ICON = { clients: Handshake, contacts: Users, deals: Funnel }
const DONE_HREF = { clients: "/dashboard/clients", contacts: "/dashboard/contacts", deals: "/dashboard/deals" }

/** Excel-friendly CSV (UTF-8 with BOM, ; between cells as in French and Moroccan Excel). */
function downloadCsv(rows: string[][], name: string) {
  const esc = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  const blob = new Blob(["﻿" + rows.map((r) => r.map(esc).join(";")).join("\r\n")], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Import clients, contacts or deals from a CSV or Excel file (CRM step 7):
 * pick what to import and the file, match the columns, fix the rows shown
 * in yellow, then import. Known records are updated instead of duplicated.
 */
export default function CrmImportPage() {
  const t = useTranslations()
  const workspace = useCurrentWorkspace()
  const queryClient = useQueryClient()
  const params = useSearchParams()
  const initial = IMPORT_KINDS.find((k) => k === params.get("kind")) ?? "clients"
  const { data: ctx } = useQuery({ queryKey: ["import-context", workspace.id], queryFn: () => importContextApi(workspace.id) })

  const [kind, setKind] = React.useState<ImportKind>(initial)
  const [step, setStep] = React.useState<Step>(1)
  const [file, setFile] = React.useState<{ name: string; headers: string[]; rows: string[][]; cut: boolean } | null>(null)
  const [mapping, setMapping] = React.useState<ColumnMapping>({})
  const [rows, setRows] = React.useState<ImportRow[]>([])
  const [filter, setFilter] = React.useState<Filter>("all")
  const [page, setPage] = React.useState(0)
  const [result, setResult] = React.useState<ImportResult | null>(null)
  const [reading, setReading] = React.useState(false)
  const [dragging, setDragging] = React.useState(false)

  const fields = IMPORT_FIELDS[kind]
  const fieldLabel = (key: string) => t(`imF_${key}`)

  const readFile = async (f: File) => {
    setReading(true)
    try {
      let table: string[][]
      if (/\.xlsx$/i.test(f.name)) table = await readXlsx(await f.arrayBuffer())
      else if (/\.(csv|txt)$/i.test(f.name)) {
        const parsed = parseCsv(await f.text())
        table = [parsed.headers, ...parsed.rows]
      } else {
        toast.error(t("imBadFile"))
        return
      }
      const [headers = [], ...body] = table
      if (!headers.length || !body.length) {
        toast.error(t("imEmptyFile"))
        return
      }
      setFile({ name: f.name, headers, rows: body.slice(0, MAX_IMPORT_ROWS), cut: body.length > MAX_IMPORT_ROWS })
      setMapping(guessColumns(headers, kind))
      setStep(2)
    } catch (err) {
      toast.error(translateError(err, t))
    } finally {
      setReading(false)
    }
  }

  const toReview = () => {
    if (!file || !ctx) return
    setRows(readRows(file.rows, mapping, kind, ctx))
    setFilter("all")
    setPage(0)
    setStep(3)
  }

  const edit = (line: number, key: string, value: string) => {
    if (!ctx) return
    setRows((list) => checkRows(list.map((r) => (r.line === line ? { line, values: { ...r.values, [key]: value } } : { line: r.line, values: r.values })), kind, ctx))
  }

  const run = useMutation({
    mutationFn: () => importCrmApi(workspace.id, kind, rows.filter((r) => !hasErrors(r)).map((r) => ({ line: r.line, values: r.values }))),
    onSuccess: (res) => {
      setResult(res)
      setStep(4)
      for (const key of ["clients", "deals", "import-context"]) queryClient.invalidateQueries({ queryKey: [key, workspace.id] })
    },
    onError: (err) => toast.error(translateError(err, t)),
  })

  const restart = () => {
    setFile(null)
    setRows([])
    setResult(null)
    setStep(1)
  }

  const counts = { all: rows.length, errors: rows.filter(hasErrors).length, create: rows.filter((r) => !hasErrors(r) && r.action === "create").length, update: rows.filter((r) => !hasErrors(r) && r.action === "update").length }
  const shown = rows.filter((r) => (filter === "all" ? true : filter === "errors" ? hasErrors(r) : !hasErrors(r) && r.action === filter))
  const pageRows = shown.slice(page * PAGE, page * PAGE + PAGE)
  const mapped = fields.filter((f) => mapping[f.key] !== undefined)
  const missingRequired = fields.filter((f) => f.required && mapping[f.key] === undefined)
  const steps = [t("imStep1"), t("imStep2"), t("imStep3"), t("imStep4")]

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader title={t("imTitle")} description={t("imDescription")} actions={<Button variant="outline" asChild><Link href={DONE_HREF[kind]}><ArrowLeft className="size-4 rtl:rotate-180" />{t(`imBack_${kind}`)}</Link></Button>}>
        <ol className="flex flex-wrap gap-2" aria-label={t("imSteps")}>
          {steps.map((label, i) => (
            <li key={label} aria-current={step === i + 1 ? "step" : undefined} className={cn("flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium", step === i + 1 ? "border-primary bg-primary/10 text-primary" : step > i + 1 ? "border-transparent bg-success-soft text-success-foreground" : "border-border text-muted-foreground")}>
              <span className="grid size-5 place-items-center rounded-full bg-card text-[11px] tabular-nums">{step > i + 1 ? "✓" : i + 1}</span>
              {label}
            </li>
          ))}
        </ol>
      </PageHeader>

      {step === 1 && (
        <section className="space-y-5 rounded-3xl border border-border bg-card p-5 shadow-panel">
          <div>
            <h2 className="text-base font-semibold">{t("imWhat")}</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-3" role="radiogroup" aria-label={t("imWhat")}>
              {IMPORT_KINDS.map((k) => {
                const Icon = KIND_ICON[k]
                return (
                  <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={cn("flex items-start gap-3 rounded-2xl border p-4 text-start transition-colors", kind === k ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50")}>
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-4" /></span>
                    <span>
                      <span className="block text-sm font-semibold">{t(`imKind_${k}`)}</span>
                      <span className="block text-xs text-muted-foreground">{t(`imKindHint_${k}`)}</span>
                    </span>
                  </button>
                )
              })}
            </div>
            {kind !== "clients" && <p className="mt-3 text-xs text-muted-foreground">{t("imOrderHint")}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-muted/40 p-4">
            <FileSpreadsheet className="size-5 text-primary" />
            <p className="flex-1 text-sm">{t("imTemplateHint")}</p>
            <Button variant="outline" onClick={() => downloadCsv(templateRows(kind), `nexora-${kind}-template.csv`)}><Download className="size-4" />{t("imTemplate")}</Button>
          </div>

          <label
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              const f = e.dataTransfer.files[0]
              if (f) void readFile(f)
            }}
            className={cn("flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-10 text-center transition-colors focus-within:ring-2 focus-within:ring-ring", dragging ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40")}
          >
            <Upload className="size-6 text-primary" />
            <span className="font-medium">{reading ? t("imReading") : t("imDrop")}</span>
            <span className="text-xs text-muted-foreground">{t("imFormats", { max: MAX_IMPORT_ROWS })}</span>
            <input type="file" accept=".csv,.txt,.xlsx" className="sr-only" aria-label={t("imChooseFile")} onChange={(e) => { const f = e.target.files?.[0]; if (f) void readFile(f); e.target.value = "" }} />
          </label>
        </section>
      )}

      {step === 2 && file && (
        <section className="space-y-4 rounded-3xl border border-border bg-card p-5 shadow-panel">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold">{t("imMatchTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("imMatchHint", { file: file.name, rows: file.rows.length })}</p>
            </div>
            {file.cut && <Badge variant="outline" className="border-transparent bg-warning-soft text-warning-foreground">{t("imCut", { max: MAX_IMPORT_ROWS })}</Badge>}
          </div>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2 text-start font-medium">{t("imField")}</th>
                  <th scope="col" className="px-4 py-2 text-start font-medium">{t("imColumn")}</th>
                  <th scope="col" className="px-4 py-2 text-start font-medium">{t("imFirstValue")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {fields.map((f) => {
                  const col = mapping[f.key]
                  return (
                    <tr key={f.key}>
                      <td className="px-4 py-2 font-medium">{fieldLabel(f.key)}{f.required && <span className="text-destructive" aria-label={t("imRequired")}> *</span>}</td>
                      <td className="px-4 py-2">
                        <Select value={col === undefined ? NONE : String(col)} onValueChange={(v) => setMapping((m) => ({ ...m, [f.key]: v === NONE ? undefined : Number(v) }))}>
                          <SelectTrigger className="w-56 bg-card" aria-label={t("imColumnFor", { field: fieldLabel(f.key) })}><SelectValue>{col === undefined ? t("imNotImported") : file.headers[col] || t("imColumnN", { n: col + 1 })}</SelectValue></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>{t("imNotImported")}</SelectItem>
                            {file.headers.map((h, i) => <SelectItem key={i} value={String(i)}>{h || t("imColumnN", { n: i + 1 })}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="max-w-64 truncate px-4 py-2 text-muted-foreground">{col === undefined ? "—" : file.rows.find((r) => r[col])?.[col] ?? "—"}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {missingRequired.length > 0 && <p className="flex items-center gap-2 text-sm text-destructive"><AlertTriangle className="size-4" />{t("imMissing", { fields: missingRequired.map((f) => fieldLabel(f.key)).join(", ") })}</p>}
          <div className="flex justify-between gap-2">
            <Button variant="outline" onClick={restart}>{t("imOtherFile")}</Button>
            <Button onClick={toReview} disabled={missingRequired.length > 0 || !ctx}>{t("imCheck")}</Button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4 rounded-3xl border border-border bg-card p-5 shadow-panel">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">{t("imReviewTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("imReviewHint")}</p>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t("show")}>
              {(["all", "errors", "create", "update"] as const).map((f) => (
                <button key={f} type="button" aria-pressed={filter === f} onClick={() => { setFilter(f); setPage(0) }} className={cn("flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium", filter === f ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}>
                  {t(`imFilter_${f}`)}
                  <span className="tabular-nums opacity-70">{counts[f]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-2 text-start font-medium">{t("imLine")}</th>
                  <th scope="col" className="px-3 py-2 text-start font-medium">{t("imResult")}</th>
                  {mapped.map((f) => <th key={f.key} scope="col" className="whitespace-nowrap px-3 py-2 text-start font-medium">{fieldLabel(f.key)}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pageRows.length === 0 && (
                  <tr><td colSpan={mapped.length + 2} className="px-3 py-6 text-center text-muted-foreground">{t("imNothing")}</td></tr>
                )}
                {pageRows.map((r) => (
                  <tr key={r.line}>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">{r.line}</td>
                    <td className="px-3 py-2">
                      {hasErrors(r) ? (
                        <Badge variant="outline" className="border-transparent bg-warning-soft text-warning-foreground">{t("imHasErrors", { n: Object.keys(r.errors).length })}</Badge>
                      ) : (
                        <Badge variant="outline" className={cn("border-transparent", r.action === "update" ? "bg-info-soft text-info-foreground" : "bg-success-soft text-success-foreground")}>{t(r.action === "update" ? "imUpdate" : "imNew")}</Badge>
                      )}
                    </td>
                    {mapped.map((f) => {
                      const error = r.errors[f.key]
                      return (
                        <td key={f.key} className={cn("px-2 py-1.5 align-top", error && "bg-warning-soft/60")}>
                          <Input
                            defaultValue={r.values[f.key]}
                            onBlur={(e) => e.target.value !== r.values[f.key] && edit(r.line, f.key, e.target.value)}
                            aria-label={t("imCell", { field: fieldLabel(f.key), line: r.line })}
                            aria-invalid={!!error}
                            aria-describedby={error ? `err-${r.line}-${f.key}` : undefined}
                            className={cn("h-8 min-w-36 text-xs", error && "border-warning")}
                          />
                          {error && <span id={`err-${r.line}-${f.key}`} className="mt-0.5 block text-[11px] text-warning-foreground">{t(`imErr_${error}`)}</span>}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {shown.length > PAGE && (
            <div className="flex items-center justify-end gap-2 text-sm">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>{t("imPrevPage")}</Button>
              <span className="tabular-nums text-muted-foreground">{page + 1} / {Math.ceil(shown.length / PAGE)}</span>
              <Button variant="outline" size="sm" disabled={(page + 1) * PAGE >= shown.length} onClick={() => setPage((p) => p + 1)}>{t("next")}</Button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <Button variant="outline" onClick={() => setStep(2)}>{t("imBackToMatch")}</Button>
            <div className="flex items-center gap-3">
              {counts.errors > 0 && <span className="text-xs text-muted-foreground">{t("imSkipped", { n: counts.errors })}</span>}
              <Button onClick={() => run.mutate()} disabled={counts.create + counts.update === 0 || run.isPending}>
                <Upload className="size-4" />
                {t("imRun", { n: counts.create + counts.update })}
              </Button>
            </div>
          </div>
        </section>
      )}

      {step === 4 && result && (
        <section className="space-y-4 rounded-3xl border border-border bg-card p-5 shadow-panel">
          <div className="flex items-center gap-3">
            <CheckCircle className="size-6 text-success-foreground" />
            <h2 className="text-base font-semibold">{t("imDone")}</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: t("imCreated"), value: result.created, cls: "text-success-foreground" },
              { label: t("imUpdated"), value: result.updated, cls: "text-primary" },
              { label: t("imNotSaved"), value: result.failed.length + counts.errors, cls: result.failed.length + counts.errors ? "text-warning-foreground" : "" },
            ].map((c) => (
              <div key={c.label} className="rounded-2xl border border-border p-4">
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className={cn("text-2xl font-semibold tabular-nums", c.cls)}>{c.value}</p>
              </div>
            ))}
          </div>
          {result.failed.length > 0 && (
            <ul className="space-y-1 rounded-2xl bg-warning-soft/50 p-4 text-sm">
              {result.failed.map((f) => <li key={f.line}>{t("imFailedLine", { line: f.line, message: translateError(new Error(f.message), t) })}</li>)}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            <Button asChild><Link href={DONE_HREF[kind]}>{t(`imSee_${kind}`)}</Link></Button>
            <Button variant="outline" onClick={restart}><RotateCcw className="size-4" />{t("imAnother")}</Button>
          </div>
        </section>
      )}
    </div>
  )
}
