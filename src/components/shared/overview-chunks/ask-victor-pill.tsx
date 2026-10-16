"use client"

import { useTranslations } from "next-intl"
import { VictorAssistant } from "@/components/shared/victor-assistant"
import { useAnalyticsFilter } from "./analytics-filter-context"

type Topic = "revenue" | "clients" | "cash" | "capacity" | "forecast" | "summary"

/** Picks what a question is about from a few words in any of the app's languages' common terms. */
function topicOf(q: string): Topic {
  const s = q.toLowerCase()
  if (/forecast|predict|next|prévi|prognos|pronóst|توقع|पूर्वानुमान|прогноз|预测/.test(s)) return "forecast"
  if (/overdue|late|cash|paid|retard|impay|überfällig|vencid|متأخر|बकाया|просроч|逾期/.test(s)) return "cash"
  if (/utili|capacity|hours|heures|stunden|horas|ساعات|घंटे|часы|工时/.test(s)) return "capacity"
  if (/client|customer|kunde|cliente|عميل|ग्राहक|клиент|客户/.test(s)) return "clients"
  if (/revenue|margin|profit|chiffre|marge|umsatz|ingres|إيراد|राजस्व|выручк|收入/.test(s)) return "revenue"
  return "summary"
}

export function AskVictorPill() {
  const t = useTranslations()
  const { analytics, formatCurrency } = useAnalyticsFilter()
  const prompts: { text: string; topic: Topic }[] = [
    { text: t("victorPromptRevenue"), topic: "revenue" },
    { text: t("victorPromptCash"), topic: "cash" },
    { text: t("victorPromptForecast"), topic: "forecast" },
  ]

  const answer = (topic: Topic) => {
    const { current, previous, clients, risks, receivables, windows } = analytics
    const pctOf = (n: number | null) => (n === null ? "—" : `${Math.round(n)}%`)
    const diff = previous.revenue > 0 ? Math.round(((current.revenue - previous.revenue) / previous.revenue) * 100) : null
    const top = clients[0]
    const grower = [...clients].filter((c) => c.previous > 0 && c.change !== null).sort((a, b) => (b.change ?? 0) - (a.change ?? 0))[0]
    const days = Math.max(1, (new Date(`${windows.current.to}T00:00:00`).getTime() - new Date(`${windows.current.from}T00:00:00`).getTime()) / 86400000 + 1)
    switch (topic) {
      case "revenue":
        return t("victorRevenue", {
          revenue: formatCurrency(current.revenue),
          change: diff === null ? "—" : `${diff > 0 ? "+" : ""}${diff}%`,
          client: grower?.name ?? top?.name ?? "—",
          margin: pctOf(current.margin),
          labor: formatCurrency(current.laborCost),
        })
      case "clients":
        return top ? t("victorClients", { client: top.name, share: pctOf(top.share), count: clients.filter((c) => c.revenue > 0).length }) : t("anNoRevenueYet")
      case "cash": {
        const worst = risks.find((r) => r.reason === "overdue")
        return t("victorCash", {
          overdue: formatCurrency(receivables.overdue),
          open: formatCurrency(receivables.open),
          client: worst?.name ?? "—",
          days: worst?.overdueDays ?? 0,
        })
      }
      case "capacity":
        return t("victorCapacity", {
          utilization: pctOf(current.utilization),
          billable: Math.round(current.billableHours).toLocaleString(),
          available: Math.round(current.availableHours).toLocaleString(),
        })
      case "forecast":
        return t("victorForecast", {
          month: formatCurrency((current.revenue / days) * 30),
          quarter: formatCurrency((current.revenue / days) * 91),
          utilization: pctOf(current.utilization),
        })
      default:
        return t("victorSummary", {
          revenue: formatCurrency(current.revenue),
          margin: pctOf(current.margin),
          utilization: pctOf(current.utilization),
          overdue: formatCurrency(receivables.overdue),
        })
    }
  }

  return <VictorAssistant description={t("victorDescription")} placeholder={t("victorPlaceholder")} prompts={prompts} topicOf={topicOf} answer={answer} />
}
