"use client"

import { SectionCards } from "./cards/section-cards"
import { FooterGradient } from "@/components/ui/footer-gradient"
import ChartAreaInteractive from "./charts/area-chart"
import ChartBarInteractive from "./charts/bar-chart"
import ChartLineInteractive from "./charts/line-chart"
import ChartPieInteractive from "./charts/pie-chart"
import ChartRadarLinesOnly from "./charts/radar-chart"
import ChartRadialLabel from "./charts/radial-chart"
import ChartTooltipLabelFormatter from "./charts/tooltip-chart"

export default function OverviewPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="h-full w-full overflow-auto p-4 pb-20">
        <SectionCards />
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <ChartAreaInteractive />
          </div>
          <div className="lg:col-span-4">
            <ChartPieInteractive />
          </div>

          <div className="lg:col-span-6">
            <ChartBarInteractive />
          </div>
          <div className="lg:col-span-6">
            <ChartLineInteractive />
          </div>

          <div className="lg:col-span-4">
            <ChartRadarLinesOnly />
          </div>
          <div className="lg:col-span-4">
            <ChartRadialLabel />
          </div>
          <div className="lg:col-span-4">
            <ChartTooltipLabelFormatter />
          </div>
        </div>
      </div>
      <FooterGradient position="absolute" height="lg" blur={false} />
    </div>
  )
}
