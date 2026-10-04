"use client"

import React, { useState } from "react"
import { useTranslations } from "next-intl"
import { Sparkles, Send, Bot, CheckCircle2, ArrowRight } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [activeAnswer, setActiveAnswer] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

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

  const executeQuery = (q: string, topic: Topic = topicOf(q)) => {
    setQuery(q)
    setIsAnalyzing(true)
    setActiveAnswer(null)
    setTimeout(() => {
      setIsAnalyzing(false)
      setActiveAnswer(answer(topic))
    }, 400)
  }

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    executeQuery(query.trim())
  }

  return (
    <>
      {/* Floating Bottom Pill */}
      <div className="fixed bottom-6 end-6 z-40 sm:end-auto sm:left-1/2 sm:-translate-x-1/2">
        <button
          type="button"
          onClick={() => {
            setIsOpen(true)
            setActiveAnswer(null)
          }}
          aria-label={t("victorName")}
          className="group flex h-12 items-center gap-2 rounded-full bg-gray-900 p-1.5 text-[13px] font-semibold text-white shadow-lg transition-all duration-200 hover:bg-gray-800 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:pe-5 dark:bg-card dark:border dark:border-border dark:hover:bg-muted cursor-pointer"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 to-indigo-400 text-white">
            <Sparkles className="size-4" />
          </span>
          <span className="max-sm:sr-only">{t("victorName")}</span>
        </button>
      </div>

      {/* Victor AI Quick Prompt Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 to-indigo-400 text-white">
                <Sparkles className="size-3.5" />
              </span>
              <DialogTitle className="text-base font-bold">
                {t("victorName")}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              {t("victorDescription")}
            </DialogDescription>
          </DialogHeader>

          {/* Quick Prompt Suggestions */}
          <div className="space-y-1.5 pt-1">
            <span className="text-xs font-medium text-muted-foreground">
              {t("victorSuggested")}
            </span>
            <div className="flex flex-col gap-1.5">
              {prompts.map(({ text: prompt, topic }) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => executeQuery(prompt, topic)}
                  className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5 text-start text-xs text-foreground/90 transition-colors hover:bg-muted/70 hover:border-border cursor-pointer"
                >
                  <span className="truncate">{prompt}</span>
                  <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>

          {/* Response Box if Available */}
          {isAnalyzing && (
            <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 text-xs text-muted-foreground flex items-center gap-2 animate-pulse">
              <Bot className="size-4 text-purple-600 dark:text-purple-400 animate-spin" />
              <span>{t("victorAnalyzing")}</span>
            </div>
          )}

          {activeAnswer && !isAnalyzing && (
            <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-3.5 text-xs text-foreground space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-purple-700 dark:text-purple-300">
                <CheckCircle2 className="size-3.5" />
                <span>{t("victorSummaryTitle")}</span>
              </div>
              <p className="leading-relaxed text-muted-foreground dark:text-neutral-200">
                {activeAnswer}
              </p>
            </div>
          )}

          {/* Custom Input Field */}
          <form onSubmit={handleAsk} className="mt-2 space-y-3">
            <Input
              autoFocus
              placeholder={t("victorPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="text-xs"
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-xs"
              >
                {t("close")}
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isAnalyzing || !query.trim()}
                className="text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Send className="size-3" />
                <span>{t("victorAsk")}</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
