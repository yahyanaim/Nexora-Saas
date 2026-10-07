"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useCurrentEmployee } from "@/hooks/workforce/use-current-employee"
import { useEmployees } from "@/hooks/workforce/use-workforce"
import { useProjects, useTasks } from "@/hooks/workforce/use-work-projects"
import { useSatisfaction } from "@/hooks/workforce/use-satisfaction"
import { useClientInvoices, useTimeEntries } from "@/hooks/workforce/use-work-billing"
import { useLeave } from "@/hooks/workforce/use-leave"
import { useExpenses } from "@/hooks/workforce/use-expenses"
import { useDocuments } from "@/hooks/workforce/use-documents"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { can, isPlatformOperator } from "@/lib/permissions/can"
import { buildInbox } from "@/lib/workforce/inbox"
import { todayIso } from "@/lib/workforce/project-metrics"
import { AdminPermissionsPlatform as P } from "@/types/roles"
import { useReviews } from "../work-reviews-chunks/use-reviews"
import { NotificationCenter, type NotificationItem, type NotificationLabels } from "./notification-center"

/**
 * The bell for workspace users: what is waiting for them across the ERP
 * (reviews, approvals, overdue invoices, expiring documents, late tasks).
 * Platform operators keep the platform feed.
 */
export function WorkNotificationCenter() {
  const { authedUser } = useAuthGuard()
  if (isPlatformOperator(authedUser)) return <NotificationCenter />
  return <WorkInbox />
}

function WorkInbox() {
  const t = useTranslations()
  const router = useRouter()
  const { authedUser } = useAuthGuard()
  const workspace = useCurrentWorkspace()
  const me = useCurrentEmployee()
  const { data: employees = [] } = useEmployees()
  const { data: reviews = [] } = useReviews()
  const { data: entries = [] } = useTimeEntries()
  const { data: leave = [] } = useLeave()
  const { data: expenses = [] } = useExpenses()
  const { data: invoices = [] } = useClientInvoices()
  const { data: documents = [] } = useDocuments()
  const { data: tasks = [] } = useTasks()
  const { data: feedback = [] } = useSatisfaction()
  const { data: projects = [] } = useProjects()

  const isAdmin = can(authedUser, P.ROLES_UPDATE)
  const rights = { approveTime: can(authedUser, P.TIME_APPROVE), invoices: can(authedUser, P.INVOICES_READ), hr: can(authedUser, P.EMPLOYEES_UPDATE) }
  const rightsKey = `${rights.approveTime}${rights.invoices}${rights.hr}`
  // The bell is on every page: rebuild the inbox only when its data changes (M3)
  const items = useMemo<NotificationItem[]>(
    () =>
      buildInbox({
        viewer: { employeeId: me?.id, isAdmin },
        rights,
        employees,
        reviews,
        entries,
        leave,
        expenses,
        invoices,
        documents,
        tasks,
        feedback,
        projects,
        today: todayIso(),
      }).map((i) => ({
        id: i.id,
        title: t(i.title, i.values),
        message: t(i.message, i.values),
        category: i.category,
        timestamp: t(`inboxCategory_${i.category}`),
        isRead: false,
        href: i.href,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rights is rebuilt each render; rightsKey carries its value
    [me?.id, isAdmin, rightsKey, employees, reviews, entries, leave, expenses, invoices, documents, tasks, feedback, projects, t]
  )
  const labels: NotificationLabels = {
    title: t("notifications"),
    newCount: (n) => t("inboxNew", { count: n }),
    markAllRead: t("inboxMarkAllRead"),
    all: t("inboxAll"),
    unread: t("inboxUnread"),
    empty: t("inboxEmpty"),
    open: t("inboxOpen"),
    unreadSr: (n) => t("inboxUnreadSr", { count: n }),
    markRead: t("inboxMarkRead"),
    markUnread: t("inboxMarkUnread"),
    dismiss: t("inboxDismiss"),
  }
  // Read state is per person and workspace
  return <NotificationCenter key={`${workspace.id}:${authedUser?.id}`} items={items} labels={labels} storageKey={`nexora:inbox:${workspace.id}:${authedUser?.id ?? "me"}`} onNavigate={(href) => router.push(href)} />
}
