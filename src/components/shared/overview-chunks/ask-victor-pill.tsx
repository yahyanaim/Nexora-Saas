"use client"

import React, { useState } from "react"
import { toast } from "sonner"
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

const SUGGESTED_PROMPTS = [
  "Why did MRR increase +24.8% this month?",
  "Which accounts had the highest AI compute overages?",
  "Forecast Q4 ARR based on current 1.2% churn",
]

export function AskVictorPill() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [activeAnswer, setActiveAnswer] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const executeQuery = (q: string) => {
    setQuery(q)
    setIsAnalyzing(true)
    setActiveAnswer(null)

    setTimeout(() => {
      setIsAnalyzing(false)
      if (q.toLowerCase().includes("mrr") || q.toLowerCase().includes("increase")) {
        setActiveAnswer(
          "MRR expansion (+24.8%) was primarily driven by 18 new Enterprise Annual commitments ($74,300), 42 Pro team seat upgrades ($8,150), and a 34% surge in Nexora AI compute token consumption."
        )
      } else if (q.toLowerCase().includes("overage") || q.toLowerCase().includes("compute")) {
        setActiveAnswer(
          "Top accounts by compute overages this cycle: 1. TechCorp Enterprise ($4,500 overage), 2. Acme Systems ($3,200 overage), 3. DataStream Global ($2,850 overage). Total overage revenue is $18,450."
        )
      } else if (q.toLowerCase().includes("forecast") || q.toLowerCase().includes("churn")) {
        setActiveAnswer(
          "With Net Revenue Retention sustained at 118.4% and logo churn dropping to 1.2% (-0.6% improvement), your projected Q4 ARR run-rate is estimated between $2.42M and $2.55M."
        )
      } else {
        setActiveAnswer(
          `Analysis complete for "${q}": Platform health is optimal. Active multi-tenant workspaces are at 1,428 with 99.99% SLA uptime and 2.4M req/hr throughput.`
        )
      }
      toast.success("AI telemetry insight generated")
    }, 500)
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
          aria-label="Ask Victor (Nexora AI)"
          className="group flex h-12 items-center gap-2 rounded-full bg-gray-900 p-1.5 text-[13px] font-semibold text-white shadow-lg transition-all duration-200 hover:bg-gray-800 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:pe-5 dark:bg-card dark:border dark:border-border dark:hover:bg-muted cursor-pointer"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 to-indigo-400 text-white">
            <Sparkles className="size-4" />
          </span>
          <span className="max-sm:sr-only">Ask Victor (Nexora AI)</span>
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
                Ask Victor (Nexora AI)
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Instant AI telemetry insights for your MRR, cloud quotas, enterprise tiers, and SLA metrics.
            </DialogDescription>
          </DialogHeader>

          {/* Quick Prompt Suggestions */}
          <div className="space-y-1.5 pt-1">
            <span className="text-xs font-medium text-muted-foreground">
              Suggested SaaS telemetry queries:
            </span>
            <div className="flex flex-col gap-1.5">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => executeQuery(prompt)}
                  className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5 text-left text-xs text-foreground/90 transition-colors hover:bg-muted/70 hover:border-border cursor-pointer"
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
              <span>Analyzing cloud telemetry and subscription ledger...</span>
            </div>
          )}

          {activeAnswer && !isAnalyzing && (
            <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-3.5 text-xs text-foreground space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-purple-700 dark:text-purple-300">
                <CheckCircle2 className="size-3.5" />
                <span>Executive AI Summary</span>
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
              placeholder="e.g. What is the forecast for next month's API traffic?"
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
                Close
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isAnalyzing || !query.trim()}
                className="text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Send className="size-3" />
                <span>Ask Victor</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
