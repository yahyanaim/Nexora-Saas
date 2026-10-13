"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { useConsoleActor, useConsoleCustomers, useConsoleSessions, useConsoleStaff } from "@/hooks/platform/use-platform-console"
import { useNxInvoices, useNxPayments, useNxRefunds, useReconciliations } from "@/hooks/platform/use-platform-billing"
import { useSupportRequests } from "@/hooks/platform/use-platform-support"
import { useIncidents, useServiceHealth } from "@/hooks/platform/use-platform-ops"
import { useDataRequests } from "@/hooks/platform/use-platform-data"
import { buildConsoleInbox } from "@/lib/platform/console-inbox"
import { NotificationCenter, type NotificationItem, type NotificationLabels } from "./notification-center"

/**
 * The bell for the Nexora team (§11.2, SEC-13), like the companies' work
 * inbox: urgent support, approvals waiting, failed renewals, transfers to
 * match, reconciliation differences, failing services, trials ending, full
 * seats and sign-ins from a new device, each for the roles that act on it.
 */
export function ConsoleNotificationCenter() {
  const t = useTranslations()
  const router = useRouter()
  const actor = useConsoleActor()
  const { data: staff = [] } = useConsoleStaff()
  const { data: sessions = [] } = useConsoleSessions()
  const { data: support = [] } = useSupportRequests()
  const { data: refunds = [] } = useNxRefunds()
  const { data: requests = [] } = useDataRequests()
  const { data: invoices = [] } = useNxInvoices()
  const { data: payments = [] } = useNxPayments()
  const { data: reconciliations = [] } = useReconciliations()
  const { data: health = [] } = useServiceHealth()
  const { data: incidents = [] } = useIncidents()
  const { data: customers = [] } = useConsoleCustomers()
  const [today] = useState(() => new Date().toISOString().slice(0, 10))

  const items = useMemo<NotificationItem[]>(
    () =>
      actor
        ? buildConsoleInbox({ me: actor, staff, sessions, support, refunds, requests, invoices, payments, reconciliations, health, incidents, customers, today }).map((i) => ({
            id: i.id,
            title: t(i.title, i.values),
            message: t(i.message, i.values),
            category: i.category,
            timestamp: t(`cinCategory_${i.category}`),
            isRead: false,
            href: i.href,
          }))
        : [],
    [actor, staff, sessions, support, refunds, requests, invoices, payments, reconciliations, health, incidents, customers, today, t]
  )
  const labels: NotificationLabels = {
    title: t("notifications"),
    newCount: (n) => t("inboxNew", { count: n }),
    markAllRead: t("inboxMarkAllRead"),
    all: t("inboxAll"),
    unread: t("inboxUnread"),
    empty: t("cinEmpty"),
    open: t("inboxOpen"),
    unreadSr: (n) => t("inboxUnreadSr", { count: n }),
    markRead: t("inboxMarkRead"),
    markUnread: t("inboxMarkUnread"),
    dismiss: t("inboxDismiss"),
  }
  // read state is per team member
  return <NotificationCenter key={actor?.id ?? "none"} items={items} labels={labels} storageKey={`nexora:inbox:console:${actor?.id ?? "me"}`} onNavigate={(href) => router.push(href)} />
}
