"use client"

import React, { createContext, useContext, useState, useMemo, useCallback } from "react"

export type DateRangeOption = "Last 7 days" | "Last 30 days" | "Last 90 days" | "Last 1 year" | "Year to date"
export type CompareModeOption =
  | "vs Prior period"
  | "vs Prior 7d"
  | "vs Prior 30d"
  | "vs Prior 90d"
  | "vs Prior year"
  | "vs Same period 2025"
  | "No comparison"
export type CurrencyOption = "USD" | "EUR" | "GBP" | "JPY" | "CAD"

export interface AnalyticsFilterContextValue {
  dateRange: DateRangeOption
  setDateRange: (range: DateRangeOption) => void
  compareMode: CompareModeOption
  setCompareMode: (mode: CompareModeOption) => void
  currency: CurrencyOption
  setCurrency: (curr: CurrencyOption) => void
  workspace: string
  setWorkspace: (ws: string) => void
  currencySymbol: string
  formatCurrency: (amountInUSD: number, options?: { compact?: boolean; hideSign?: boolean }) => string
  currencyRate: number
  workspaceMultiplier: number
}

const CURRENCY_CONFIG: Record<CurrencyOption, { symbol: string; rate: number }> = {
  USD: { symbol: "$", rate: 1.0 },
  EUR: { symbol: "€", rate: 0.92 },
  GBP: { symbol: "£", rate: 0.78 },
  JPY: { symbol: "¥", rate: 155.0 },
  CAD: { symbol: "CA$", rate: 1.36 },
}

const WORKSPACE_MULTIPLIERS: Record<string, number> = {
  "All Workspaces": 1.0,
  "Acme Corp Prod": 0.285, // ~$48.2k MRR
  "Stark Industries": 0.192, // ~$32.4k MRR
  "Wayne Enterprises": 0.145, // ~$24.5k MRR
  "Cyberdyne Systems": 0.082, // ~$13.8k MRR
}

const AnalyticsFilterContext = createContext<AnalyticsFilterContextValue | null>(null)

export function AnalyticsFilterProvider({ children }: { children: React.ReactNode }) {
  const [dateRange, setDateRangeState] = useState<DateRangeOption>("Last 30 days")
  const [compareMode, setCompareMode] = useState<CompareModeOption>("vs Prior 30d")
  const [currency, setCurrency] = useState<CurrencyOption>("USD")
  const [workspace, setWorkspace] = useState<string>("All Workspaces")

  // When date range changes, automatically pick an intuitive default compare mode
  const setDateRange = (newRange: DateRangeOption) => {
    setDateRangeState(newRange)
    if (newRange === "Last 7 days") {
      setCompareMode("vs Prior 7d")
    } else if (newRange === "Last 30 days") {
      setCompareMode("vs Prior 30d")
    } else if (newRange === "Last 90 days") {
      setCompareMode("vs Prior 90d")
    } else if (newRange === "Last 1 year") {
      setCompareMode("vs Prior year")
    } else if (newRange === "Year to date") {
      setCompareMode("vs Same period 2025")
    }
  }

  const { symbol, rate } = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.USD
  const workspaceMultiplier = WORKSPACE_MULTIPLIERS[workspace] ?? 1.0

  const formatCurrency = useCallback(
    (
      amountInUSD: number,
      options?: { compact?: boolean; hideSign?: boolean }
    ): string => {
      const isNegative = amountInUSD < 0
      const absVal = Math.abs(amountInUSD) * rate * workspaceMultiplier

      let formattedValue: string
      if (options?.compact) {
        if (absVal >= 1_000_000) {
          formattedValue = `${(absVal / 1_000_000).toFixed(currency === "JPY" ? 1 : 2)}M`
        } else if (absVal >= 1_000) {
          formattedValue = `${(absVal / 1_000).toFixed(currency === "JPY" ? 0 : 1)}k`
        } else {
          formattedValue = Math.round(absVal).toLocaleString()
        }
      } else {
        formattedValue = Math.round(absVal).toLocaleString()
      }

      const sign = options?.hideSign ? "" : isNegative ? "-" : ""
      return `${sign}${symbol}${formattedValue}`
    },
    [currency, rate, symbol, workspaceMultiplier]
  )

  const contextValue = useMemo<AnalyticsFilterContextValue>(
    () => ({
      dateRange,
      setDateRange,
      compareMode,
      setCompareMode,
      currency,
      setCurrency,
      workspace,
      setWorkspace,
      currencySymbol: symbol,
      formatCurrency,
      currencyRate: rate,
      workspaceMultiplier,
    }),
    [dateRange, compareMode, currency, workspace, symbol, formatCurrency, rate, workspaceMultiplier]
  )

  return (
    <AnalyticsFilterContext.Provider value={contextValue}>
      {children}
    </AnalyticsFilterContext.Provider>
  )
}

export function useAnalyticsFilter() {
  const ctx = useContext(AnalyticsFilterContext)
  if (!ctx) {
    throw new Error("useAnalyticsFilter must be used within an AnalyticsFilterProvider")
  }
  return ctx
}
