"use client"

import { useCallback, useMemo } from "react"
import { useTranslations } from "next-intl"
import {
  Users,
  CircleHelp,
  LifeBuoy,
  Headset,
  DoorOpen,
  UserX,
  KeyRound,
  MonitorSmartphone,
  ScrollText,
  ShieldCheck,
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
  Funnel,
  Crown,
  Store,
  Sunrise,
  Landmark,
  ChartLineData,
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
  FileChartColumn,
  IdCard,
  HandCoins,
  Wallet,
  ReceiptText,
  Truck,
  BadgeDollarSign,
  LockKeyhole,
  ChartColumnStacked,
  UsersRound,
  CalendarRange,
} from "@/components/ui/carbon/icons"
import { usePathname } from "@/i18n/navigation"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { AdminPermissionsPlatform } from "@/types/roles"
import { can, isPlatformOperator } from "@/lib/permissions/can"
import { isPlatformPath } from "@/lib/permissions/platform"
import { ROUTE_PERMISSIONS } from "@/lib/permissions/routes"
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
          },
          {
            title: t("todayNav"),
            url: "/dashboard/today",
            icon: Sunrise,
            descriptionKey: "pageDescToday",
          },
          {
            title: t("teamDashboard"),
            url: "/dashboard/team",
            icon: UsersRound,
            descriptionKey: "pageDescTeam",
          },
          {
            title: t("kpis"),
            url: "/dashboard/kpis",
            icon: Gauge,
            descriptionKey: "pageDescKpis",
          },
          {
            title: t("analytics"),
            url: "/dashboard/overview",
            icon: ChartNoAxesCombined,
            descriptionKey: "pageDescOverview",
          },
          {
            title: t("erpReports"),
            url: "/dashboard/reports",
            icon: FileChartColumn,
            descriptionKey: "pageDescErpReports",
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
            icon: IdCard,
            descriptionKey: "pageDescEmployees",
          },
          {
            title: t("orgChart"),
            url: "/dashboard/org-chart",
            icon: Network,
            descriptionKey: "pageDescOrgChart",
          },
          {
            title: t("reviews"),
            url: "/dashboard/reviews",
            icon: Star,
            descriptionKey: "pageDescReviews",
          },
          {
            title: t("documents"),
            url: "/dashboard/documents",
            icon: FileBadge,
            descriptionKey: "pageDescDocuments",
          },
          {
            title: t("teamAccess"),
            url: "/dashboard/access",
            icon: KeyRound,
            descriptionKey: "pageDescAccess",
          },
          {
            title: t("clients"),
            url: "/dashboard/clients",
            icon: Handshake,
            descriptionKey: "pageDescClients",
          },
          {
            title: t("clientPortal"),
            url: "/dashboard/portal",
            icon: Globe,
            descriptionKey: "pageDescPortalStaff",
          },
          {
            title: t("projects"),
            url: "/dashboard/projects",
            icon: FolderKanban,
            descriptionKey: "pageDescProjects",
          },
          {
            title: t("timesheets"),
            url: "/dashboard/timesheets",
            icon: Clock,
            descriptionKey: "pageDescTimesheets",
          },
          {
            title: t("timeApprovals"),
            url: "/dashboard/time-approvals",
            icon: ClipboardCheck,
            descriptionKey: "pageDescTimeApprovals",
          },
        ],
      },
      {
        id: "finance",
        title: t("finance"),
        icon: DollarSign,
        items: [
          {
            title: t("deals"),
            url: "/dashboard/deals",
            icon: Funnel,
            descriptionKey: "pageDescDeals",
          },
          {
            title: t("revenueForecast"),
            url: "/dashboard/forecast",
            icon: ChartLineData,
            descriptionKey: "pageDescForecast",
          },
          {
            title: t("quotes"),
            url: "/dashboard/quotes",
            icon: FileSignature,
            descriptionKey: "pageDescQuotes",
          },
          {
            title: t("clientInvoices"),
            url: "/dashboard/client-invoices",
            icon: FileText,
            descriptionKey: "pageDescClientInvoices",
          },
          {
            title: t("recurringInvoices"),
            url: "/dashboard/recurring-invoices",
            icon: Renew,
            descriptionKey: "pageDescRecurring",
          },
          {
            title: t("suppliers"),
            url: "/dashboard/suppliers",
            icon: Truck,
            descriptionKey: "pageDescSuppliers",
          },
          {
            title: t("supplierBills"),
            url: "/dashboard/supplier-bills",
            icon: ReceiptText,
            descriptionKey: "pageDescSupplierBills",
          },
          {
            title: t("receivables"),
            url: "/dashboard/receivables",
            icon: HandCoins,
            descriptionKey: "pageDescReceivables",
          },
          {
            title: t("bankImport"),
            url: "/dashboard/bank-import",
            icon: Landmark,
            descriptionKey: "pageDescBankImport",
          },
          {
            title: t("expenses"),
            url: "/dashboard/expenses",
            icon: Wallet,
            descriptionKey: "pageDescExpenses",
          },
          {
            title: t("profitability"),
            url: "/dashboard/profitability",
            icon: TrendingUp,
            descriptionKey: "pageDescProfitability",
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
          },
          {
            title: t("calendar"),
            url: "/dashboard/calendar",
            icon: CalendarDays,
            descriptionKey: "pageDescCalendar",
          },
          {
            title: t("workload"),
            url: "/dashboard/workload",
            icon: ChartColumnStacked,
            descriptionKey: "pageDescWorkload",
          },
          {
            title: t("resourcing"),
            url: "/dashboard/resourcing",
            icon: CalendarRange,
            descriptionKey: "pageDescResourcing",
          },
          {
            title: t("leave"),
            url: "/dashboard/leave",
            icon: TreePalm,
            descriptionKey: "pageDescLeave",
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
          },
          {
            title: t("developer"),
            url: "/dashboard/developer",
            icon: Terminal,
            descriptionKey: "pageDescDeveloper",
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
          },
          {
            title: t("mySubscription"),
            url: "/dashboard/subscription",
            icon: BadgeDollarSign,
            descriptionKey: "pageDescMySubscription",
          },
          {
            title: t("auditLogs"),
            url: "/dashboard/audit-logs",
            icon: History,
            descriptionKey: "pageDescAuditLogs",
          },
          {
            title: t("helpNav"),
            url: "/dashboard/help",
            icon: CircleHelp,
            descriptionKey: "pageDescHelp",
          },
        ],
      },
      {
        // Nexora team console (only operators): the companies using Nexora and their people
        id: "console-customers",
        title: t("cgCustomers"),
        icon: Crown,
        items: [
          {
            title: t("platformCustomers"),
            url: "/dashboard/platform",
            icon: Store,
            descriptionKey: "pageDescPlatform",
          },
          {
            title: t("users"),
            url: "/dashboard/users",
            icon: Users,
            descriptionKey: "pageDescDirectory",
          },
          {
            title: t("suspensionsNav"),
            url: "/dashboard/banned-users",
            icon: UserX,
            descriptionKey: "pageDescSuspensions",
          },
        ],
      },
      {
        // What customers pay Nexora
        id: "console-billing",
        title: t("cgBilling"),
        icon: Wallet,
        items: [
          {
            title: t("plans"),
            url: "/dashboard/plans",
            icon: CreditCard,
            descriptionKey: "pageDescPlans",
          },
          {
            title: t("subscriptions"),
            url: "/dashboard/subscriptions",
            icon: BadgeCheck,
            descriptionKey: "pageDescSubscriptions",
          },
          {
            title: t("invoices"),
            url: "/dashboard/invoices",
            icon: Receipt,
            descriptionKey: "pageDescInvoices",
          },
          {
            title: t("transactions"),
            url: "/dashboard/transactions",
            icon: ArrowLeftRight,
            descriptionKey: "pageDescTransactions",
          },
          {
            title: t("taxes"),
            url: "/dashboard/taxes",
            icon: Percent,
            descriptionKey: "pageDescTaxes",
          },
        ],
      },
      {
        // Helping customer companies: their requests and access to their workspace
        id: "console-support",
        title: t("cgSupport"),
        icon: LifeBuoy,
        items: [
          {
            title: t("supportDesk"),
            url: "/dashboard/support-desk",
            icon: Headset,
            descriptionKey: "pageDescSupportDesk",
          },
          {
            title: t("supportAccess"),
            url: "/dashboard/support-access",
            icon: DoorOpen,
            descriptionKey: "pageDescSupportAccess",
          },
        ],
      },
      {
        // Running the platform
        id: "console-operations",
        title: t("cgOperations"),
        icon: Gauge,
        items: [
          {
            title: t("systemIssues"),
            url: "/dashboard/system-issues",
            icon: Bug,
            descriptionKey: "pageDescSystemIssues",
          },
        ],
      },
      {
        // The Nexora team, its access and the audit trail
        id: "console-team",
        title: t("cgTeam"),
        icon: ShieldCheck,
        items: [
          {
            title: t("staffs"),
            url: "/dashboard/staffs",
            icon: ShieldUser,
            descriptionKey: "pageDescStaffs",
          },
          {
            title: t("rolesPermissions"),
            url: "/dashboard/roles",
            icon: LockKeyhole,
            descriptionKey: "pageDescRoles",
          },
          {
            title: t("sessions"),
            url: "/dashboard/sessions",
            icon: MonitorSmartphone,
            descriptionKey: "pageDescSessions",
          },
          {
            title: t("consoleAudit"),
            url: "/dashboard/platform-audit",
            icon: ScrollText,
            descriptionKey: "pageDescPlatformAudit",
          },
        ],
      },
    ],
    [t]
  )

  const isClient = !!(authedUser as { clientId?: string } | undefined)?.clientId
  const operator = isPlatformOperator(authedUser)
  // The Nexora team works in its console; ERP menus appear only while it looks at a customer's workspace
  const mode: "console" | "workspace" | "erp" = operator ? (isPlatformPath(pathname) ? "console" : "workspace") : "erp"
  const groups = useMemo(
    () =>
      // Client contacts only ever see their portal (CRM-9)
      isClient
        ? [{ id: "portal", title: t("clientPortal"), icon: Globe, items: [{ title: t("clientPortal"), url: "/dashboard/portal", icon: Globe, descriptionKey: "pageDescPortal" }] }]
        : allGroups
            .filter((group) => (mode === "console") === group.id.startsWith("console-"))
            .map((group) => ({
              ...group,
              items: group.items.filter((item) => hasPermission(item.permission ?? ROUTE_PERMISSIONS[item.url]) && (!isPlatformPath(item.url) || operator)),
            }))
            .filter((group) => group.items.length > 0),
    [allGroups, hasPermission, operator, mode, isClient, t]
  )

  const { activeGroup, activeItem } = useMemo(() => {
    for (const group of groups) {
      const item = group.items.find((i) => isUnderPath(pathname, i.url))
      if (item) return { activeGroup: group, activeItem: item }
    }
    return { activeGroup: groups[0], activeItem: undefined }
  }, [groups, pathname])

  const isActive = useCallback((url: string) => isUnderPath(pathname, url), [pathname])

  return { groups, activeGroup, activeItem, isActive, mode }
}
