"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import type { BurndownPoint } from "@/lib/workforce/cycles"

const W = 640
const H = 220
const PAD = { l: 40, r: 14, t: 14, b: 28 }

/** A round top for the hours axis: 5, 10, 20, 25, 50, 100… */
function niceMax(n: number) {
  if (n <= 0) return 10
  const step = 10 ** Math.floor(Math.log10(n))
  return [1, 2, 2.5, 5, 10].map((m) => m * step).find((m) => m >= n) ?? n
}

/**
 * Burn-down of a cycle (P4): hours left each day against the ideal straight
 * line. One hours axis; hover a day for its figures; the same numbers are in
 * a table below for screen readers and printing.
 */
export function BurndownChart({ points, today }: { points: BurndownPoint[]; today: string }) {
  const t = useTranslations()
  const locale = useLocale()
  const [hover, setHover] = useState<number | null>(null)
  if (points.length === 0) return null
  const top = niceMax(Math.max(...points.map((p) => Math.max(p.ideal, p.remaining ?? 0))))
  const iw = W - PAD.l - PAD.r
  const ih = H - PAD.t - PAD.b
  const x = (i: number) => PAD.l + (points.length === 1 ? iw / 2 : (iw * i) / (points.length - 1))
  const y = (v: number) => PAD.t + ih - (ih * v) / top
  const short = (d: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(`${d}T00:00:00`))
  const ideal = points.map((p, i) => `${x(i)},${y(p.ideal)}`).join(" ")
  const actual = points.flatMap((p, i) => (p.remaining === null ? [] : [`${x(i)},${y(p.remaining)}`])).join(" ")
  const lastActual = points.reduce((last, p, i) => (p.remaining !== null ? i : last), -1)
  const todayIndex = points.findIndex((p) => p.date === today)
  const ticks = [0, top / 2, top]
  const xLabels = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])]
  const h = hover !== null ? points[hover] : undefined

  return (
    <figure className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground" aria-hidden>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 rounded-full bg-primary" />{t("cyRemaining")}</span>
        <span className="flex items-center gap-1.5"><span className="h-0 w-5 border-t-2 border-dashed border-muted-foreground/60" />{t("cyIdeal")}</span>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={t("cyBurndownLabel")} onMouseLeave={() => setHover(null)}>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="stroke-border" strokeWidth={1} />
              <text x={PAD.l - 6} y={y(v)} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground text-[10px] tabular-nums">{Math.round(v)} h</text>
            </g>
          ))}
          {xLabels.map((i) => (
            <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} className="fill-muted-foreground text-[10px]">{short(points[i]!.date)}</text>
          ))}
          {todayIndex >= 0 && <line x1={x(todayIndex)} x2={x(todayIndex)} y1={PAD.t} y2={PAD.t + ih} className="stroke-muted-foreground/40" strokeWidth={1} strokeDasharray="2 3" />}
          <polyline points={ideal} fill="none" className="stroke-muted-foreground/60" strokeWidth={2} strokeDasharray="5 4" strokeLinecap="round" />
          {actual && <polyline points={actual} fill="none" className="stroke-primary" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
          {lastActual >= 0 && <circle cx={x(lastActual)} cy={y(points[lastActual]!.remaining!)} r={4} className="fill-primary stroke-card" strokeWidth={2} />}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + ih} className="stroke-foreground/30" strokeWidth={1} />}
          {points.map((p, i) => (
            <rect key={p.date} x={x(i) - iw / Math.max(1, points.length - 1) / 2} y={PAD.t} width={iw / Math.max(1, points.length - 1)} height={ih} fill="transparent" onMouseEnter={() => setHover(i)} />
          ))}
        </svg>
        {h && hover !== null && (
          <div
            className="pointer-events-none absolute top-1 z-10 rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-md"
            style={{ left: `${(x(hover) / W) * 100}%`, transform: hover > points.length / 2 ? "translateX(calc(-100% - 8px))" : "translateX(8px)" }}
          >
            <p className="font-medium">{short(h.date)}</p>
            <p className="tabular-nums">{t("cyRemaining")}: {h.remaining === null ? "—" : `${h.remaining} h`}</p>
            <p className="tabular-nums text-muted-foreground">{t("cyIdeal")}: {h.ideal} h</p>
          </div>
        )}
      </div>
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">{t("cyShowTable")}</summary>
        <table className="mt-2 w-full max-w-md text-start">
          <caption className="sr-only">{t("cyBurndownLabel")}</caption>
          <thead><tr className="text-muted-foreground"><th scope="col" className="py-1 text-start font-medium">{t("date")}</th><th scope="col" className="py-1 text-end font-medium">{t("cyRemaining")}</th><th scope="col" className="py-1 text-end font-medium">{t("cyIdeal")}</th></tr></thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.date} className="border-t border-border"><td className="py-1">{short(p.date)}</td><td className="py-1 text-end tabular-nums">{p.remaining === null ? "—" : `${p.remaining} h`}</td><td className="py-1 text-end tabular-nums">{p.ideal} h</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}
