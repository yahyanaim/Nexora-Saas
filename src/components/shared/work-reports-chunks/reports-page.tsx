"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { SavedReportsBar } from "./saved-reports-bar"
import { DownloadIcon, FileSpreadsheet, FileText, Lock } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { can } from "@/lib/permissions/can"
import { AdminPermissionsPlatform } from "@/types/roles"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { useClients, useDepartments, useEmployees } from "@/hooks/workforce/use-workforce"
import { useProjects, useTasks } from "@/hooks/workforce/use-work-projects"
import { useClientInvoices, useTimeEntries } from "@/hooks/workforce/use-work-billing"
import { useExpenses } from "@/hooks/workforce/use-expenses"
import { useLeave } from "@/hooks/workforce/use-leave"
import { overheadRate } from "@/lib/workforce/overhead"
import { useWorkspaceSettings } from "@/hooks/workforce/use-settings"
import { vatPeriodOf, vatRegimeOf } from "@/lib/workforce/vat"
import { REPORT_IDS, buildReport, type ReportColumn, type ReportId, type ReportRow } from "@/lib/workforce/reports"
import { todayIso } from "@/lib/workforce/project-metrics"
import { exportToCsv } from "@/lib/utils/export-data"
import { downloadXlsx } from "@/lib/utils/xlsx"
import { getPdfTranslator } from "@/lib/pdf/pdf-i18n"
import { renderTableReport } from "@/lib/pdf/report-template"
import { companyLines, documentBrand, legalLine, loadLogo } from "@/lib/pdf/pdf-kit"
import { cn } from "@/lib/utils"

type Preset = "thisMonth" | "lastMonth" | "thisQuarter" | "thisYear" | "last12" | "custom"
const PRESETS: Preset[] = ["thisMonth", "lastMonth", "thisQuarter", "thisYear", "last12", "custom"]

function presetRange(p: Preset, today: string): { from: string; to: string } {
  const [y, m] = today.split("-").map(Number) as [number, number]
  const pad = (n: number) => String(n).padStart(2, "0")
  const lastDay = (yy: number, mm: number) => new Date(yy, mm, 0).getDate()
  switch (p) {
    case "lastMonth": {
      const ly = m === 1 ? y - 1 : y
      const lm = m === 1 ? 12 : m - 1
      return { from: `${ly}-${pad(lm)}-01`, to: `${ly}-${pad(lm)}-${lastDay(ly, lm)}` }
    }
    case "thisQuarter": {
      const q = Math.floor((m - 1) / 3) * 3 + 1
      return { from: `${y}-${pad(q)}-01`, to: today }
    }
    case "thisYear":
      return { from: `${y}-01-01`, to: today }
    case "last12": {
      const d = new Date(`${today}T00:00:00`)
      d.setFullYear(d.getFullYear() - 1)
      d.setDate(d.getDate() + 1)
      return { from: d.toISOString().slice(0, 10), to: today }
    }
    default:
      return { from: `${y}-${pad(m)}-01`, to: today }
  }
}

const SELECT = "h-9 rounded-full border border-border bg-card px-3 text-sm max-w-full"

/** Standard reports with shared filters and Excel / CSV / PDF export (RPT-4, RPT-6, RPT-8). */
export default function ReportsPage() {
  const t = useTranslations()
  const locale = useLocale()
  const workspace = useCurrentWorkspace()
  const { authedUser } = useAuthGuard()
  const canSeeCosts = can(authedUser, AdminPermissionsPlatform.COSTS_READ)
  const today = todayIso()

  const { data: entries = [], isLoading: l1 } = useTimeEntries()
  const { data: invoices = [], isLoading: l2 } = useClientInvoices()
  const { data: projects = [] } = useProjects()
  const { data: clients = [] } = useClients()
  const { data: employees = [] } = useEmployees()
  const { data: departments = [] } = useDepartments()
  const { data: expenses = [] } = useExpenses()
  const { data: tasks = [] } = useTasks()
  const { data: leave = [] } = useLeave()
  const { data: settings } = useWorkspaceSettings()

  const [reportId, setReportId] = useState<ReportId>("timesheet")
  const [preset, setPreset] = useState<Preset>("thisMonth")
  const [custom, setCustom] = useState(() => presetRange("thisMonth", today))
  const [clientId, setClientId] = useState("")
  const [projectId, setProjectId] = useState("")
  const [employeeId, setEmployeeId] = useState("")
  const [departmentId, setDepartmentId] = useState("")

  const range = preset === "custom" ? custom : presetRange(preset, today)
  const report = useMemo(
    () =>
      buildReport(
        reportId,
        { entries, invoices, projects, clients, employees, departments, expenses, tasks, leave, holidays: (settings?.holidays ?? []).map((h) => h.date), overheadRate: overheadRate(settings?.overheads, employees), ...(settings ? { vatRegime: vatRegimeOf(settings.company), vatPeriod: vatPeriodOf(settings.company) } : {}) },
        { ...range, clientId: clientId || undefined, projectId: projectId || undefined, employeeId: employeeId || undefined, departmentId: departmentId || undefined },
        { canSeeCosts, today }
      ),
    [reportId, entries, invoices, projects, clients, employees, departments, expenses, tasks, leave, settings, range.from, range.to, clientId, projectId, employeeId, departmentId, canSeeCosts, today] // eslint-disable-line react-hooks/exhaustive-deps
  )
  // The VAT return covers the whole company, so only the period filter applies
  const isVatReport = reportId === "vat" || reportId === "vatDetail"
  const hiddenCosts = !canSeeCosts && ["timesheet", "billable", "profitability"].includes(reportId)
  const visibleProjects = projects.filter((p) => !clientId || p.clientId === clientId)

  const money = (n: number) => new Intl.NumberFormat(locale, { style: "currency", currency: workspace.currency, maximumFractionDigits: 2 }).format(n)
  const display = (c: ReportColumn, v: ReportRow[string]) => {
    if (v === null || v === undefined || v === "") return "—"
    switch (c.type) {
      case "money":
        return money(Number(v))
      case "hours":
        return `${Number(v).toLocaleString(locale, { maximumFractionDigits: 2 })} h`
      case "percent":
        return `${Number(v).toLocaleString(locale, { maximumFractionDigits: 1 })}%`
      case "date":
        return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${v}T00:00:00`))
      case "number":
        return Number(v).toLocaleString(locale)
      default:
        return translateValue(String(v))
    }
  }
  // Statuses and yes/no come from the data as codes; show them in the user's language
  const translateValue = (v: string) => (t.has(`repVal_${v}`) ? t(`repVal_${v}`) : v)
  const exportValue = (c: ReportColumn, v: ReportRow[string]) => (c.type === "text" && typeof v === "string" ? translateValue(v) : v)

  const title = t(`rep_${reportId}`)
  const fileBase = `${reportId}-${range.from}-${range.to}`
  const filterSummary = [
    `${range.from} → ${range.to}`,
    clientId && clients.find((c) => c.id === clientId)?.name,
    projectId && projects.find((p) => p.id === projectId)?.name,
    employeeId && employees.find((e) => e.id === employeeId)?.name,
    departmentId && departments.find((d) => d.id === departmentId)?.name,
  ].filter(Boolean).join(" · ")

  const exportXlsx = () =>
    downloadXlsx(
      {
        name: title,
        columns: report.columns.map((c) => ({ label: t(c.label, c.labelValues), width: c.type === "text" ? 28 : 14 })),
        rows: [...report.rows.map((r) => report.columns.map((c) => exportValue(c, r[c.key] ?? null))), report.columns.map((c, i) => (i === 0 ? t("total") : (report.totals[c.key] ?? null)))],
      },
      fileBase
    )
  const exportCsv = () =>
    exportToCsv(
      report.rows.map((r) => Object.fromEntries(report.columns.map((c) => [c.key, exportValue(c, r[c.key] ?? null)]))),
      fileBase,
      report.columns.map((c) => ({ key: c.key, label: t(c.label, c.labelValues) }))
    )
  const exportPdf = async () => {
    // PDFs use the user's language when the PDF fonts can draw it (see pdf-i18n)
    const { t: pt, has, locale: pl } = await getPdfTranslator(locale)
    const company = settings?.company
    const pMoney = (n: number) => new Intl.NumberFormat(pl, { style: "currency", currency: workspace.currency, maximumFractionDigits: 2 }).format(n)
    const pDate = (iso: string) => new Intl.DateTimeFormat(pl, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${iso}T00:00:00`))
    const pDisplay = (c: ReportColumn, v: ReportRow[string]) => {
      if (v === null || v === undefined || v === "") return "—"
      switch (c.type) {
        case "money":
          return pMoney(Number(v))
        case "hours":
          return `${Number(v).toLocaleString(pl, { maximumFractionDigits: 2 })} h`
        case "percent":
          return `${Number(v).toLocaleString(pl, { maximumFractionDigits: 1 })}%`
        case "date":
          return pDate(String(v))
        case "number":
          return Number(v).toLocaleString(pl)
        default:
          return has(`repVal_${v}`) ? pt(`repVal_${v}`) : String(v)
      }
    }
    const numeric = report.columns.filter((c) => (c.type === "money" || c.type === "hours" || c.type === "percent") && report.totals[c.key] !== undefined)
    await renderTableReport({
      brand: documentBrand(company?.brandColor),
      logo: await loadLogo(company?.logoDataUrl),
      title: pt(`rep_${reportId}`),
      description: pt(`repDesc_${reportId}`),
      company: company?.tradeName || company?.legalName || workspace.name,
      companyLine: companyLines(company)[0],
      generatedOn: `${pt("pdfGeneratedOn")} ${new Intl.DateTimeFormat(pl, { dateStyle: "long", timeStyle: "short" }).format(new Date())}`,
      chips: [
        [pt("repPeriod"), `${pDate(range.from)} - ${pDate(range.to)}`],
        ...(clientId ? ([[pt("client"), clients.find((c) => c.id === clientId)?.name ?? ""]] as [string, string][]) : []),
        ...(projectId ? ([[pt("project"), projects.find((p) => p.id === projectId)?.name ?? ""]] as [string, string][]) : []),
        ...(employeeId ? ([[pt("repEmployee"), employees.find((e) => e.id === employeeId)?.name ?? ""]] as [string, string][]) : []),
        ...(departmentId ? ([[pt("repDepartment"), departments.find((d) => d.id === departmentId)?.name ?? ""]] as [string, string][]) : []),
        ...(hiddenCosts ? ([[pt("pdfNote"), pt("repCostsHidden")]] as [string, string][]) : []),
        ...(reportId === "vat" || reportId === "vatDetail" ? ([[pt("vatRegime"), pt(vatRegimeOf(company ?? { country: "" }) === "payment" ? "vatRegimePayment" : "vatRegimeInvoice")]] as [string, string][]) : []),
      ],
      tiles: [
        { label: pt("pdfRows"), value: report.rows.length.toLocaleString(pl) },
        // The VAT return's tiles are its key figures, not the first columns
        ...(reportId === "vat" ? numeric.filter((c) => ["collected", "deductible", "due", "creditOut"].includes(c.key)) : numeric.slice(0, 4)).map((c) => ({ label: pt(c.label, c.labelValues), value: pDisplay(c, report.totals[c.key] ?? null) })),
      ],
      columns: report.columns.map((c) => ({ label: pt(c.label, c.labelValues), align: c.type === "text" || c.type === "date" ? "left" : "right" })),
      rows: report.rows.map((r) => report.columns.map((c) => pDisplay(c, r[c.key] ?? null))),
      totals: report.columns.map((c, i) => (i === 0 ? pt("total") : report.totals[c.key] !== undefined ? pDisplay(c, report.totals[c.key] ?? null) : "")),
      emptyText: pt("repEmpty"),
      footer: {
        left: pt("pdfConfidential"),
        legal: legalLine(company, workspace.name),
        pageLabel: (page, total) => pt("pdfPageOf", { page, total }),
      },
      filename: `${fileBase}.pdf`,
    })
  }

  const isLoading = l1 || l2

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportXlsx} disabled={!report.rows.length}>
              <FileSpreadsheet className="size-4" />
              Excel
            </Button>
            <Button variant="outline" onClick={exportCsv} disabled={!report.rows.length}>
              <DownloadIcon className="size-4" />
              CSV
            </Button>
            <Button variant="outline" onClick={() => void exportPdf()} disabled={!report.rows.length}>
              <FileText className="size-4" />
              PDF
            </Button>
          </div>
        }
      >
        <SavedReportsBar
          reportId={reportId}
          reportName={t(`rep_${reportId}`)}
          filters={{ preset, from: preset === "custom" ? custom.from : undefined, to: preset === "custom" ? custom.to : undefined, clientId, projectId, employeeId, departmentId }}
          onApply={(id, f) => {
            setReportId(id as ReportId)
            setPreset(f.preset as Preset)
            if (f.preset === "custom" && f.from && f.to) setCustom({ from: f.from, to: f.to })
            setClientId(f.clientId ?? "")
            setProjectId(f.projectId ?? "")
            setEmployeeId(f.employeeId ?? "")
            setDepartmentId(f.departmentId ?? "")
          }}
        />
        <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label={t("repChooseReport")}>
          {REPORT_IDS.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={reportId === id}
              onClick={() => setReportId(id)}
              className={cn(
                "h-9 rounded-full border px-3.5 text-[13px] font-medium transition-colors",
                reportId === id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"
              )}
            >
              {t(`rep_${id}`)}
            </button>
          ))}
        </div>
      </PageHeader>

      <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
        <p className="mb-3 text-sm text-muted-foreground">{t(`repDesc_${reportId}`)}</p>
        <div className="flex flex-wrap items-center gap-2">
          <select className={SELECT} value={preset} onChange={(e) => setPreset(e.target.value as Preset)} aria-label={t("repPeriod")}>
            {PRESETS.map((p) => (
              <option key={p} value={p}>{t(`repPreset_${p}`)}</option>
            ))}
          </select>
          {preset === "custom" && (
            <>
              <input type="date" className={SELECT} value={custom.from} max={custom.to} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} aria-label={t("repFrom")} />
              <input type="date" className={SELECT} value={custom.to} min={custom.from} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} aria-label={t("repTo")} />
            </>
          )}
          {!isVatReport && (<>
          <select className={SELECT} value={clientId} onChange={(e) => { setClientId(e.target.value); setProjectId("") }} aria-label={t("client")}>
            <option value="">{t("allClients")}</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className={SELECT} value={projectId} onChange={(e) => setProjectId(e.target.value)} aria-label={t("project")}>
            <option value="">{t("repAllProjects")}</option>
            {visibleProjects.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
          </select>
          <select className={SELECT} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} aria-label={t("repEmployee")}>
            <option value="">{t("repAllEmployees")}</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select className={SELECT} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} aria-label={t("repDepartment")}>
            <option value="">{t("allTeams")}</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          </>)}
        </div>
        {hiddenCosts && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3.5" />
            {t("repCostsHidden")}
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-panel">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
          <h2 className="font-semibold">{title}</h2>
          <span className="text-xs text-muted-foreground">{t("repRowCount", { count: report.rows.length })} · {filterSummary}</span>
        </header>
        {isLoading ? (
          <div className="space-y-2 p-5" aria-busy>
            {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-8 animate-pulse rounded-lg bg-muted" />)}
          </div>
        ) : report.rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <p className="font-medium">{t("repEmpty")}</p>
            <p className="text-sm text-muted-foreground">{t("repEmptyHint")}</p>
          </div>
        ) : (
          <>
            {/* Cards on phones (UX-2) */}
            <ul className="divide-y divide-border md:hidden">
              {report.rows.slice(0, 200).map((r, i) => (
                <li key={i} className="space-y-1 px-4 py-3 text-sm">
                  <p className="font-medium">{display(report.columns[0]!, r[report.columns[0]!.key] ?? null)}</p>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                    {report.columns.slice(1).map((c) => (
                      <div key={c.key} className="contents">
                        <dt className="text-muted-foreground">{t(c.label, c.labelValues)}</dt>
                        <dd className="text-end tabular-nums">{display(c, r[c.key] ?? null)}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    {report.columns.map((c) => (
                      <th key={c.key} className={cn("whitespace-nowrap px-4 py-2.5 font-medium", c.type === "text" || c.type === "date" ? "text-start" : "text-end")}>{t(c.label, c.labelValues)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.rows.slice(0, 500).map((r, i) => (
                    <tr key={i} className="border-t border-border hover:bg-muted/30">
                      {report.columns.map((c) => (
                        <td key={c.key} className={cn("px-4 py-2", c.type === "text" ? "max-w-[260px] truncate" : "whitespace-nowrap", c.type === "text" || c.type === "date" ? "text-start" : "text-end tabular-nums")}>
                          {display(c, r[c.key] ?? null)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                    {report.columns.map((c, i) => (
                      <td key={c.key} className={cn("whitespace-nowrap px-4 py-2.5", i === 0 || c.type === "text" || c.type === "date" ? "text-start" : "text-end tabular-nums")}>
                        {i === 0 ? t("total") : report.totals[c.key] !== undefined ? display(c, report.totals[c.key] ?? null) : ""}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
            {report.rows.length > 500 && <p className="border-t border-border px-5 py-2 text-xs text-muted-foreground">{t("repTruncated", { count: report.rows.length })}</p>}
          </>
        )}
      </section>
    </div>
  )
}
