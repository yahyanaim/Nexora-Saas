"use client"

import { AnalyticsFilterProvider } from "./analytics-filter-context"
import { AnalyticsToolbar } from "./analytics-toolbar"
import { AnalyticsKpiCards } from "./analytics-kpi-cards"
import { TotalSalesChart } from "./total-sales-chart"
import { SalesBreakdownCard } from "./sales-breakdown-card"
import { ArrBridgeCard } from "./arr-bridge-card"
import { AiComputeMeteringCard } from "./ai-compute-metering-card"
import { TopProductsCard } from "./top-products-card"
import {
  SessionOverTimeCard,
  AverageOrderValueCard,
} from "./time-series-cards"
import { AskVictorPill } from "./ask-victor-pill"

export default function OverviewPage() {
  return (
    <AnalyticsFilterProvider>
      <div className="relative h-full w-full overflow-hidden">
        <div className="h-full w-full space-y-5 overflow-auto p-4 pb-24 md:p-6 md:pb-28">
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

        {/* Floating Bottom AI Assistant Pill */}
        <AskVictorPill />
      </div>
    </AnalyticsFilterProvider>
  )
}
