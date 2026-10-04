"use client"

import React, { createContext, useCallback, useContext, useMemo, useState } from "react"
import { useLocale } from "next-intl"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { useClients, useDepartments, useEmployees } from "@/hooks/workforce/use-workforce"
import { useProjects } from "@/hooks/workforce/use-work-projects"
import { useClientInvoices, useTimeEntries } from "@/hooks/workforce/use-work-billing"
import { useExpenses } from "@/hooks/workforce/use-expenses"
import { useLeave } from "@/hooks/workforce/use-leave"
import { useWorkspaceSettings } from "@/hooks/workforce/use-settings"
import {
  computeAnalytics,
  type Analytics,
  type AnalyticsCompare,
  type AnalyticsRange,
  type Bucket,
} from "@/lib/workforce/analytics"

export type DateRangeOption = AnalyticsRange
export type CompareModeOption = AnalyticsCompare

export const DATE_RANGES: AnalyticsRange[] = ["7d", "30d", "90d", "1y", "ytd"]
export const COMPARE_MODES: AnalyticsCompare[] = ["previous", "lastYear", "none"]

/** Translation keys for the filter labels. */
export const RANGE_LABEL: Record<AnalyticsRange, string> = {
  "7d": "rangeLast7",
  "30d": "rangeLast30",
  "90d": "rangeLast90",
  "1y": "rangeLast365",
  ytd: "rangeYtd",
}
export const RANGE_SHORT: Record<AnalyticsRange, string> = { "7d": "7d", "30d": "30d", "90d": "90d", "1y": "1Y", ytd: "YTD" }
export const COMPARE_LABEL: Record<AnalyticsCompare, string> = {
  previous: "comparePrevious",
  lastYear: "compareLastYear",
  none: "compareNone",
}

export interface AnalyticsFilterContextValue {
  dateRange: AnalyticsRange
  setDateRange: (range: AnalyticsRange) => void
  compareMode: AnalyticsCompare
  setCompareMode: (mode: AnalyticsCompare) => void
  clientId: string | null
  setClientId: (id: string | null) => void
  departmentId: string | null
  setDepartmentId: (id: string | null) => void
  clients: { id: string; name: string }[]
  departments: { id: string; name: string }[]
  currency: string
  currencySymbol: string
  formatCurrency: (amount: number, options?: { compact?: boolean; hideSign?: boolean; signed?: boolean }) => string
  formatBucket: (date: string, bucket?: Bucket) => string
  analytics: Analytics
  isLoading: boolean
  refresh: () => void
}

const AnalyticsFilterContext = createContext<AnalyticsFilterContextValue | null>(null)

export function AnalyticsFilterProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale()
  const workspace = useCurrentWorkspace()
  const [dateRange, setDateRange] = useState<AnalyticsRange>("90d")
  const [compareMode, setCompareMode] = useState<AnalyticsCompare>("previous")
  const [clientId, setClientId] = useState<string | null>(null)
  const [departmentId, setDepartmentId] = useState<string | null>(null)

  const entriesQ = useTimeEntries()
  const invoicesQ = useClientInvoices()
  const projectsQ = useProjects()
  const clientsQ = useClients()
  const employeesQ = useEmployees()
  const departmentsQ = useDepartments()
  const expensesQ = useExpenses()
  const leaveQ = useLeave()
  const settingsQ = useWorkspaceSettings()
  const queries = [entriesQ, invoicesQ, projectsQ, clientsQ, employeesQ, expensesQ, leaveQ]
  const isLoading = queries.some((q) => q.isLoading)

  const analytics = useMemo(
    () =>
      computeAnalytics(
        {
          entries: entriesQ.data ?? [],
          invoices: invoicesQ.data ?? [],
          projects: projectsQ.data ?? [],
          clients: clientsQ.data ?? [],
          employees: employeesQ.data ?? [],
          expenses: expensesQ.data ?? [],
          leave: leaveQ.data ?? [],
          holidays: (settingsQ.data?.holidays ?? []).map((h) => h.date),
        },
        dateRange,
        compareMode,
        { clientId: clientId ?? undefined, departmentId: departmentId ?? undefined }
      ),
    [entriesQ.data, invoicesQ.data, projectsQ.data, clientsQ.data, employeesQ.data, expensesQ.data, leaveQ.data, settingsQ.data, dateRange, compareMode, clientId, departmentId]
  )

  const currency = workspace.currency
  const currencySymbol = useMemo(
    () =>
      new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay: "narrowSymbol" })
        .formatToParts(0)
        .find((p) => p.type === "currency")?.value ?? currency,
    [locale, currency]
  )

  const formatCurrency = useCallback(
    (amount: number, options?: { compact?: boolean; hideSign?: boolean; signed?: boolean }) => {
      const value = options?.hideSign ? Math.abs(amount) : amount
      const text = new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        currencyDisplay: "narrowSymbol",
        notation: options?.compact ? "compact" : "standard",
        minimumFractionDigits: 0,
        maximumFractionDigits: options?.compact && Math.abs(value) >= 1000 ? 1 : 0,
      }).format(value)
      return options?.signed && value > 0 ? `+${text}` : text
    },
    [locale, currency]
  )

  const bucket = analytics.bucket
  const formatBucket = useCallback(
    (date: string, b: Bucket = bucket) =>
      new Intl.DateTimeFormat(locale, b === "month" ? { month: "short" } : { day: "numeric", month: "short" }).format(
        new Date(`${date}T00:00:00`)
      ),
    [locale, bucket]
  )

  const refresh = useCallback(() => {
    for (const q of [...queries, departmentsQ, settingsQ]) void q.refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entriesQ, invoicesQ, projectsQ, clientsQ, employeesQ, expensesQ, leaveQ, departmentsQ, settingsQ])

  const value = useMemo<AnalyticsFilterContextValue>(
    () => ({
      dateRange,
      setDateRange,
      compareMode,
      setCompareMode,
      clientId,
      setClientId,
      departmentId,
      setDepartmentId,
      clients: (clientsQ.data ?? []).map((c) => ({ id: c.id, name: c.name })),
      departments: (departmentsQ.data ?? []).map((d) => ({ id: d.id, name: d.name })),
      currency,
      currencySymbol,
      formatCurrency,
      formatBucket,
      analytics,
      isLoading,
      refresh,
    }),
    [dateRange, compareMode, clientId, departmentId, clientsQ.data, departmentsQ.data, currency, currencySymbol, formatCurrency, formatBucket, analytics, isLoading, refresh]
  )

  return <AnalyticsFilterContext.Provider value={value}>{children}</AnalyticsFilterContext.Provider>
}

export function useAnalyticsFilter() {
  const ctx = useContext(AnalyticsFilterContext)
  if (!ctx) {
    throw new Error("useAnalyticsFilter must be used within an AnalyticsFilterProvider")
  }
  return ctx
}

/** Signed percentage like +12.4% or −3%, or "—" when there is nothing to compare. */
export function formatChange(value: number | null, unit: "%" | "pts" = "%") {
  if (value === null) return "—"
  const sign = value > 0 ? "+" : value < 0 ? "−" : ""
  return `${sign}${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 1 })}${unit === "%" ? "%" : " pts"}`
}
