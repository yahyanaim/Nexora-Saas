"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Send } from "@/components/ui/carbon/icons"
import { cn } from "@/lib/utils"
import { responseBreached, responseDue, sessionLive, type LiveState } from "@/lib/platform/support-rules"
import type { SupportPriority, SupportRequest, SupportSession, SupportStatus } from "@/types/platform-support"

/** Dates with the time, in the reader's locale. */
export function useSupportFormat() {
  const locale = useLocale()
  return {
    dateTime: (iso?: string) => (iso ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)) : "—"),
    time: (iso?: string) => (iso ? new Intl.DateTimeFormat(locale, { timeStyle: "short" }).format(new Date(iso)) : "—"),
  }
}

const STATUS_CLASS: Record<SupportStatus, string> = {
  open: "bg-info-soft text-info-foreground",
  waiting_customer: "bg-warning-soft text-warning-foreground",
  resolved: "bg-success-soft text-success-foreground",
  closed: "bg-muted text-muted-foreground",
}

export function SupportStatusBadge({ status }: { status: SupportStatus }) {
  const t = useTranslations()
  return <Badge variant="outline" className={cn("border-transparent", STATUS_CLASS[status])}>{t(`supSt_${status}`)}</Badge>
}

const PRIORITY_CLASS: Record<SupportPriority, string> = {
  urgent: "border-destructive/40 text-destructive",
  high: "border-warning/50 text-warning-foreground",
  normal: "",
  low: "text-muted-foreground",
}

export function PriorityBadge({ priority }: { priority: SupportPriority }) {
  const t = useTranslations()
  return <Badge variant="outline" className={PRIORITY_CLASS[priority]}>{t(`supPr_${priority}`)}</Badge>
}

/** First-answer target (SUP-10): late in red, answered or still in time otherwise. */
export function ResponseTarget({ request, now }: { request: SupportRequest; now: Date }) {
  const t = useTranslations()
  const { dateTime } = useSupportFormat()
  if (responseBreached(request, now)) return <span className="text-xs font-medium text-destructive">{t("supLate")}</span>
  if (request.firstResponseAt) return <span className="text-xs text-muted-foreground">{t("supAnswered")}</span>
  return <span className="text-xs text-muted-foreground">{t("supDue", { time: dateTime(responseDue(request)) })}</span>
}

const SESSION_CLASS: Record<LiveState, string> = {
  waiting_approval: "bg-warning-soft text-warning-foreground",
  waiting_owner: "bg-warning-soft text-warning-foreground",
  active: "bg-success-soft text-success-foreground",
  expired: "bg-muted text-muted-foreground",
  refused: "bg-danger-soft text-destructive",
  ended: "bg-muted text-muted-foreground",
  revoked: "bg-danger-soft text-destructive",
}

export function SessionStateBadge({ session, now }: { session: SupportSession; now: Date }) {
  const t = useTranslations()
  const state = sessionLive(session, now)
  return <Badge variant="outline" className={cn("border-transparent", SESSION_CLASS[state])}>{t(`sesSt_${state}`)}</Badge>
}

/** "60 min" or "2 h", for durations. */
export function useDuration() {
  const t = useTranslations()
  return (minutes: number) => (minutes >= 60 && minutes % 60 === 0 ? t("sesHours", { n: minutes / 60 }) : t("sesMinutes", { n: minutes }))
}

/** Minutes left before an active session ends (SUP-06). */
export const minutesLeft = (s: SupportSession, now: Date) => (s.endsAt ? Math.max(0, Math.ceil((new Date(s.endsAt).getTime() - now.getTime()) / 60_000)) : 0)

/** The thread of a request, customer on one side and Nexora on the other, with a reply box. */
export function Conversation({
  request,
  me,
  onReply,
  sending,
  extra,
}: {
  request: SupportRequest
  /** Whose messages sit on the right */
  me: "customer" | "nexora"
  onReply?: (text: string, done: () => void) => void
  sending?: boolean
  /** Options under the reply box (e.g. "wait for the customer") */
  extra?: React.ReactNode
}) {
  const t = useTranslations()
  const { dateTime } = useSupportFormat()
  const [text, setText] = useState("")
  return (
    <div className="space-y-4">
      <ol className="space-y-3" aria-label={t("supThread")}>
        {request.messages.map((m) => (
          <li key={m.id} className={cn("flex", m.side === me ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm", m.side === me ? "bg-primary text-primary-foreground" : "bg-muted")}>
              <p className="whitespace-pre-wrap">{m.text}</p>
              <p className={cn("mt-1 text-xs", m.side === me ? "text-primary-foreground/80" : "text-muted-foreground")}>
                {m.side === "nexora" ? t("supFromNexora", { name: m.author }) : m.author} · {dateTime(m.at)}
              </p>
            </div>
          </li>
        ))}
      </ol>
      {onReply && request.status !== "closed" && (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (text.trim()) onReply(text, () => setText(""))
          }}
        >
          <Label htmlFor={`reply-${request.id}`}>{t("supYourReply")}</Label>
          <Textarea id={`reply-${request.id}`} rows={3} value={text} onChange={(e) => setText(e.target.value)} />
          {extra}
          <Button type="submit" size="sm" disabled={sending || !text.trim()}><Send className="size-4 rtl:rotate-180" />{t("supSend")}</Button>
        </form>
      )}
    </div>
  )
}
