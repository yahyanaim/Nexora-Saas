"use client"

import { AnalyticsFilterProvider } from "./analytics-filter-context"
import { AnalyticsToolbar } from "./analytics-toolbar"
import { AnalyticsKpiCards } from "./analytics-kpi-cards"
import dynamic from "next/dynamic"
import { SalesBreakdownCard } from "./sales-breakdown-card"
import { AiComputeMeteringCard } from "./ai-compute-metering-card"
import { TopProductsCard } from "./top-products-card"
import { AskVictorPill } from "./ask-victor-pill"
import { useFeatureFlag } from "@/hooks/platform/use-platform-config"

// The chart library (recharts) loads in its own bundle after the page shows,
// so the first load stays light (PERF-01); a same-size placeholder avoids layout jumps.
const ChartPlaceholder = () => <div className="h-80 animate-pulse rounded-3xl border border-border bg-card" aria-hidden />
const TotalSalesChart = dynamic(() => import("./total-sales-chart").then((m) => m.TotalSalesChart), { ssr: false, loading: ChartPlaceholder })
const ArrBridgeCard = dynamic(() => import("./arr-bridge-card").then((m) => m.ArrBridgeCard), { ssr: false, loading: ChartPlaceholder })
const SessionOverTimeCard = dynamic(() => import("./time-series-cards").then((m) => m.SessionOverTimeCard), { ssr: false, loading: ChartPlaceholder })
const AverageOrderValueCard = dynamic(() => import("./time-series-cards").then((m) => m.AverageOrderValueCard), { ssr: false, loading: ChartPlaceholder })

export default function OverviewPage() {
  const victor = useFeatureFlag("victor_assistant")
  return (
    <AnalyticsFilterProvider>
      <div className="relative w-full">
        <div className="w-full space-y-5 p-4 pb-24 md:p-6 md:pb-28">
          {/* Top Analytics Toolbar with Filters & Actions */}
          <AnalyticsToolbar />

          {/* 4 Top KPI Metric Cards with Bar Sparklines */}
          <AnalyticsKpiCards />

          {/* Middle Section: Total Sales Over Time & Breakdown */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <TotalSalesChart />
            </div>
            <div className="lg:col-span-4">
              <SalesBreakdownCard />
            </div>
          </div>

          {/* Enterprise SaaS Growth & Telemetry Section */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ArrBridgeCard />
            <AiComputeMeteringCard />
          </div>

          {/* Bottom Section: Top Products, Sessions & Average Order Value */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <TopProductsCard />
            <SessionOverTimeCard />
            <AverageOrderValueCard />
          </div>
        </div>

        {/* Floating Bottom AI Assistant Pill, released by plan (feature flag victor_assistant) */}
        {victor && <AskVictorPill />}
      </div>
    </AnalyticsFilterProvider>
  )
}
