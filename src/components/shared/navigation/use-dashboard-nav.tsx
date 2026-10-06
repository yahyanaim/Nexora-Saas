"use client"

import { useCallback, useMemo } from "react"
import { useTranslations } from "next-intl"
import {
  Users,
  Flag,
  UserX,
  KeyRound,
  MonitorSmartphone,
  Bug,
  ShieldUser,
  FolderKanban,
  Files,
  Receipt,
  ArrowLeftRight,
  CreditCard,
  BadgeCheck,
  ChartNoAxesCombined,
  Terminal,
  History,
  LayoutDashboard,
  Settings,
  Percent,
  Building,
  Briefcase,
  Globe,
  Handshake,
  Clock,
  ClipboardCheck,
  Star,
  FileText,
  ChartGantt,
  CalendarDays,
  Gauge,
  TreePalm,
  Network,
  FileBadge,
  FileSignature,
  Renew,
  DollarSign,
  TrendingUp,
  type LucideIcon,
} from "@/components/ui/carbon/icons"
import { usePathname } from "@/i18n/navigation"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { AdminPermissionsPlatform } from "@/types/roles"
import { can, isPlatformOperator } from "@/lib/permissions/can"
import { isPlatformPath } from "@/lib/permissions/platform"
import { isUnderPath } from "@/lib/auth/safe-redirect"

export interface NavItem {
  title: string
  url: string
  icon: LucideIcon
  /** Translation key of the one-line page description shown in the page header */
  descriptionKey: string
  permission?: AdminPermissionsPlatform
}

export interface NavGroup {
  id: string
  title: string
  icon: LucideIcon
  items: NavItem[]
}

/**
 * Single source of truth for dashboard navigation: groups (top tabs),
 * their pages (icon rail / drawer), permissions and the active route.
 */
export function useDashboardNav() {
  const t = useTranslations()
  const pathname = usePathname()
  const { authedUser } = useAuthGuard()

  const hasPermission = useCallback(
    (permission?: AdminPermissionsPlatform) => !permission || can(authedUser, permission),
    [authedUser]
  )

  const allGroups = useMemo<NavGroup[]>(
    () => [
      {
        id: "dashboard",
        title: t("dashboard"),
        icon: LayoutDashboard,
        items: [
          {
            title: t("myWork"),
            url: "/dashboard/my-work",
            icon: Briefcase,
            descriptionKey: "pageDescMyWork",
            permission: AdminPermissionsPlatform.TIME_TRACK,
          },
          {
            title: t("teamDashboard"),
            url: "/dashboard/team",
            icon: Users,
            descriptionKey: "pageDescTeam",
            permission: AdminPermissionsPlatform.TIME_APPROVE,
          },
          {
            title: t("kpis"),
            url: "/dashboard/kpis",
            icon: Gauge,
            descriptionKey: "pageDescKpis",
            permission: AdminPermissionsPlatform.VIEW_ANALYTICS,
          },
          {
            title: t("analytics"),
            url: "/dashboard/overview",
            icon: ChartNoAxesCombined,
            descriptionKey: "pageDescOverview",
            permission: AdminPermissionsPlatform.VIEW_ANALYTICS,
          },
          {
            title: t("erpReports"),
            url: "/dashboard/reports",
            icon: FileText,
            descriptionKey: "pageDescErpReports",
            permission: AdminPermissionsPlatform.VIEW_ANALYTICS,
          },
        ],
      },
      {
        id: "organization",
        title: t("organization"),
        icon: Building,
        items: [
          {
            title: t("employees"),
            url: "/dashboard/employees",
            icon: Briefcase,
            descriptionKey: "pageDescEmployees",
            permission: AdminPermissionsPlatform.EMPLOYEES_READ,
          },
          {
            title: t("orgChart"),
            url: "/dashboard/org-chart",
            icon: Network,
            descriptionKey: "pageDescOrgChart",
            permission: AdminPermissionsPlatform.EMPLOYEES_READ,
          },
          {
            title: t("reviews"),
            url: "/dashboard/reviews",
            icon: Star,
            descriptionKey: "pageDescReviews",
            permission: AdminPermissionsPlatform.TIME_TRACK,
          },
          {
            title: t("documents"),
            url: "/dashboard/documents",
            icon: FileBadge,
            descriptionKey: "pageDescDocuments",
            permission: AdminPermissionsPlatform.EMPLOYEES_UPDATE,
          },
          {
            title: t("teamAccess"),
            url: "/dashboard/access",
            icon: KeyRound,
            descriptionKey: "pageDescAccess",
            permission: AdminPermissionsPlatform.EMPLOYEES_UPDATE,
          },
          {
            title: t("clients"),
            url: "/dashboard/clients",
            icon: Handshake,
            descriptionKey: "pageDescClients",
            permission: AdminPermissionsPlatform.CLIENTS_READ,
          },
          {
            title: t("clientPortal"),
            url: "/dashboard/portal",
            icon: Globe,
            descriptionKey: "pageDescPortalStaff",
            permission: AdminPermissionsPlatform.CLIENTS_UPDATE,
          },
          {
            title: t("projects"),
            url: "/dashboard/projects",
            icon: FolderKanban,
            descriptionKey: "pageDescProjects",
            permission: AdminPermissionsPlatform.PROJECTS_READ,
          },
          {
            title: t("timesheets"),
            url: "/dashboard/timesheets",
            icon: Clock,
            descriptionKey: "pageDescTimesheets",
            permission: AdminPermissionsPlatform.TIME_TRACK,
          },
          {
            title: t("timeApprovals"),
            url: "/dashboard/time-approvals",
            icon: ClipboardCheck,
            descriptionKey: "pageDescTimeApprovals",
            permission: AdminPermissionsPlatform.TIME_APPROVE,
          },
        ],
      },
      {
        id: "finance",
        title: t("finance"),
        icon: DollarSign,
        items: [
          {
            title: t("quotes"),
            url: "/dashboard/quotes",
            icon: FileSignature,
            descriptionKey: "pageDescQuotes",
            permission: AdminPermissionsPlatform.INVOICES_READ,
          },
          {
            title: t("clientInvoices"),
            url: "/dashboard/client-invoices",
            icon: FileText,
            descriptionKey: "pageDescClientInvoices",
            permission: AdminPermissionsPlatform.INVOICES_READ,
          },
          {
            title: t("recurringInvoices"),
            url: "/dashboard/recurring-invoices",
            icon: Renew,
            descriptionKey: "pageDescRecurring",
            permission: AdminPermissionsPlatform.INVOICES_CREATE,
          },
          {
            title: t("receivables"),
            url: "/dashboard/receivables",
            icon: Receipt,
            descriptionKey: "pageDescReceivables",
            permission: AdminPermissionsPlatform.INVOICES_READ,
          },
          {
            title: t("expenses"),
            url: "/dashboard/expenses",
            icon: Receipt,
            descriptionKey: "pageDescExpenses",
            permission: AdminPermissionsPlatform.TIME_TRACK,
          },
          {
            title: t("profitability"),
            url: "/dashboard/profitability",
            icon: TrendingUp,
            descriptionKey: "pageDescProfitability",
            permission: AdminPermissionsPlatform.COSTS_READ,
          },
        ],
      },
      {
        id: "planning",
        title: t("planningSection"),
        icon: ChartGantt,
        items: [
          {
            title: t("timeline"),
            url: "/dashboard/timeline",
            icon: ChartGantt,
            descriptionKey: "pageDescTimeline",
            permission: AdminPermissionsPlatform.PROJECTS_READ,
          },
          {
            title: t("calendar"),
            url: "/dashboard/calendar",
            icon: CalendarDays,
            descriptionKey: "pageDescCalendar",
            permission: AdminPermissionsPlatform.PROJECTS_READ,
          },
          {
            title: t("workload"),
            url: "/dashboard/workload",
            icon: Gauge,
            descriptionKey: "pageDescWorkload",
            permission: AdminPermissionsPlatform.EMPLOYEES_READ,
          },
          {
            title: t("leave"),
            url: "/dashboard/leave",
            icon: TreePalm,
            descriptionKey: "pageDescLeave",
            permission: AdminPermissionsPlatform.EMPLOYEES_READ,
          },
        ],
      },
      {
        id: "users",
        title: t("users"),
        icon: Users,
        items: [
          {
            title: t("users"),
            url: "/dashboard/users",
            icon: Users,
            descriptionKey: "pageDescUsers",
            permission: AdminPermissionsPlatform.USERS_READ,
          },
          {
            title: t("staffs"),
            url: "/dashboard/staffs",
            icon: ShieldUser,
            descriptionKey: "pageDescStaffs",
            permission: AdminPermissionsPlatform.STAFFS_READ,
          },
          {
            title: t("bannedUsers"),
            url: "/dashboard/banned-users",
            icon: UserX,
            descriptionKey: "pageDescBannedUsers",
            permission: AdminPermissionsPlatform.BANNED_USERS_READ,
          },
        ],
      },
      {
        id: "billing",
        title: t("billing"),
        icon: CreditCard,
        items: [
          {
            title: t("plans"),
            url: "/dashboard/plans",
            icon: CreditCard,
            descriptionKey: "pageDescPlans",
            permission: AdminPermissionsPlatform.PLANS_READ,
          },
          {
            title: t("subscriptions"),
            url: "/dashboard/subscriptions",
            icon: BadgeCheck,
            descriptionKey: "pageDescSubscriptions",
            permission: AdminPermissionsPlatform.SUBSCRIPTIONS_READ,
          },
          {
            title: t("transactions"),
            url: "/dashboard/transactions",
            icon: ArrowLeftRight,
            descriptionKey: "pageDescTransactions",
            permission: AdminPermissionsPlatform.TRANSACTIONS_READ,
          },
          {
            title: t("invoices"),
            url: "/dashboard/invoices",
            icon: Receipt,
            descriptionKey: "pageDescInvoices",
            permission: AdminPermissionsPlatform.INVOICES_READ,
          },
          {
            title: t("taxes"),
            url: "/dashboard/taxes",
            icon: Percent,
            descriptionKey: "pageDescTaxes",
            permission: AdminPermissionsPlatform.INVOICES_READ,
          },
        ],
      },
      {
        id: "management",
        title: t("management"),
        icon: FolderKanban,
        items: [
          {
            title: t("files"),
            url: "/dashboard/files",
            icon: Files,
            descriptionKey: "pageDescFiles",
            permission: AdminPermissionsPlatform.FILES_READ,
          },
          {
            title: t("developer"),
            url: "/dashboard/developer",
            icon: Terminal,
            descriptionKey: "pageDescDeveloper",
            permission: AdminPermissionsPlatform.PROJECTS_READ,
          },
        ],
      },
      {
        id: "support",
        title: t("support"),
        icon: Flag,
        items: [
          {
            title: t("reports"),
            url: "/dashboard/content-reports",
            icon: Flag,
            descriptionKey: "pageDescReports",
            permission: AdminPermissionsPlatform.REPORTS_READ,
          },
          {
            title: t("systemIssues"),
            url: "/dashboard/system-issues",
            icon: Bug,
            descriptionKey: "pageDescSystemIssues",
            permission: AdminPermissionsPlatform.SYSTEM_ISSUES_READ,
          },
        ],
      },
      {
        id: "system",
        title: t("system"),
        icon: Settings,
        items: [
          {
            title: t("workspaceSettings"),
            url: "/dashboard/settings",
            icon: Settings,
            descriptionKey: "pageDescSettings",
            permission: AdminPermissionsPlatform.ROLES_READ,
          },
          {
            title: t("mySubscription"),
            url: "/dashboard/subscription",
            icon: CreditCard,
            descriptionKey: "pageDescMySubscription",
            permission: AdminPermissionsPlatform.ROLES_READ,
          },
          {
            title: t("rolesPermissions"),
            url: "/dashboard/roles",
            icon: KeyRound,
            descriptionKey: "pageDescRoles",
            permission: AdminPermissionsPlatform.ROLES_READ,
          },
          {
            title: t("sessions"),
            url: "/dashboard/sessions",
            icon: MonitorSmartphone,
            descriptionKey: "pageDescSessions",
            permission: AdminPermissionsPlatform.SESSIONS_READ,
          },
          {
            title: t("auditLogs"),
            url: "/dashboard/audit-logs",
            icon: History,
            descriptionKey: "pageDescAuditLogs",
            permission: AdminPermissionsPlatform.SESSIONS_READ,
          },
        ],
      },
    ],
    [t]
  )

  const isClient = !!(authedUser as { clientId?: string } | undefined)?.clientId
  const groups = useMemo(
    () =>
      // Client contacts only ever see their portal (CRM-9)
      isClient
        ? [{ id: "portal", title: t("clientPortal"), icon: Globe, items: [{ title: t("clientPortal"), url: "/dashboard/portal", icon: Globe, descriptionKey: "pageDescPortal" }] }]
        : allGroups
        .map((group) => ({
          ...group,
          // Platform console pages are only for the Nexora team, never for ERP companies
          items: group.items.filter((item) => hasPermission(item.permission) && (!isPlatformPath(item.url) || isPlatformOperator(authedUser))),
        }))
        .filter((group) => group.items.length > 0),
    [allGroups, hasPermission, authedUser, isClient, t]
  )

  const { activeGroup, activeItem } = useMemo(() => {
    for (const group of groups) {
      const item = group.items.find((i) => isUnderPath(pathname, i.url))
      if (item) return { activeGroup: group, activeItem: item }
    }
    return { activeGroup: groups[0], activeItem: undefined }
  }, [groups, pathname])

  const isActive = useCallback((url: string) => isUnderPath(pathname, url), [pathname])

  return { groups, activeGroup, activeItem, isActive }
}
