"use client"

import { useMemo } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { Link, useRouter } from "@/i18n/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Check, Clock, FolderKanban, Moon, PanelLeft, Plus, Receipt, Sun, UserPlus } from "@/components/ui/carbon/icons"
import { useTheme } from "@/hooks/use-theme"
import { useHasMounted } from "@/hooks/use-has-mounted"
import { useGetDirection } from "@/hooks/use-get-direction"
import { useTimeEntries, useClientInvoices } from "@/hooks/workforce/use-work-billing"
import { useCurrentWorkspace, useWorkspaceStore } from "@/store/workspace-store"
import { useSidebarStore } from "@/store/sidebar-store"
import { displayStatus } from "@/lib/workforce/billing"
import { TimeEntryStatus } from "@/types/work-billing"
import { cn } from "@/lib/utils"
import { useDashboardNav } from "./use-dashboard-nav"
import { UserMenu } from "./user-menu"

/** Initials of a company name, e.g. "Atlas Consulting" → "AC". */
function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("")
}

/** Pages that need attention get a dot: hours to approve, hours sent back, overdue invoices. */
function useNavAlerts() {
  const { data: entries = [] } = useTimeEntries()
  const { data: invoices = [] } = useClientInvoices()
  return useMemo(() => {
    const alerts = new Set<string>()
    if (entries.some((e) => e.status === TimeEntryStatus.SUBMITTED)) alerts.add("/dashboard/time-approvals")
    if (entries.some((e) => e.status === TimeEntryStatus.REJECTED)) alerts.add("/dashboard/timesheets")
    if (invoices.some((i) => displayStatus(i) === "overdue")) alerts.add("/dashboard/client-invoices")
    return alerts
  }, [entries, invoices])
}

/** Square sidebar button shared by every rail control (44px target). */
const railButton =
  "relative flex h-11 shrink-0 items-center gap-3 rounded-xl text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

/**
 * Full-height sidebar: brand, workspace and quick create at the top, the
 * pages of the current section in the middle, theme, collapse and the
 * profile at the bottom. Collapsed it is an icon rail with tooltips;
 * expanded it shows labels.
 */
export function DashboardRail({ className }: { className?: string }) {
  const t = useTranslations()
  const router = useRouter()
  const { activeGroup, isActive } = useDashboardNav()
  const { isDark, setTheme } = useTheme()
  const hasMounted = useHasMounted()
  const { dir } = useGetDirection()
  const expanded = useSidebarStore((s) => s.expanded) && hasMounted
  const toggle = useSidebarStore((s) => s.toggle)
  const workspaces = useWorkspaceStore((s) => s.workspaces)
  const setWorkspace = useWorkspaceStore((s) => s.setCurrent)
  const workspace = useCurrentWorkspace()
  const alerts = useNavAlerts()
  const tooltipSide = dir === "rtl" ? "left" : "right"

  /** Icon-only buttons explain themselves in a tooltip; expanded ones show a label. */
  const withTooltip = (label: string, node: React.ReactNode) =>
    expanded ? (
      node
    ) : (
      <Tooltip>
        <TooltipTrigger asChild>{node}</TooltipTrigger>
        <TooltipContent side={tooltipSide} className="rounded-lg text-sm">
          {label}
        </TooltipContent>
      </Tooltip>
    )

  const quickCreate = [
    { label: t("newProject"), icon: FolderKanban, href: "/dashboard/projects" },
    { label: t("logTime"), icon: Clock, href: "/dashboard/timesheets" },
    { label: t("addEmployee"), icon: UserPlus, href: "/dashboard/employees" },
    { label: t("createInvoice"), icon: Receipt, href: "/dashboard/client-invoices" },
  ]

  return (
    <aside
      aria-label={t("mainNavigation")}
      className={cn(
        "flex h-full shrink-0 flex-col gap-2 py-4 transition-[width] duration-200",
        expanded ? "w-60 px-3" : "w-[76px] items-center px-2",
        className
      )}
    >
      {/* Brand */}
      <Link
        href="/dashboard/overview"
        aria-label={t("appName")}
        className={cn("flex h-11 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", expanded && "px-1")}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground shadow-sm">
          <Image src="/app-logo.png" alt="" width={24} height={24} className="size-6 object-contain" />
        </span>
        {expanded && <span className="truncate text-[15px] font-semibold tracking-tight">{t("appName")}</span>}
      </Link>

      <div className="my-2 flex flex-col gap-2">
        {/* Workspace */}
        <DropdownMenu>
          {withTooltip(
            workspace.name,
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`${t("switchWorkspace")}: ${hasMounted ? workspace.name : ""}`}
                className={cn(railButton, "border border-border bg-card text-foreground shadow-xs", expanded ? "w-full px-1.5" : "w-11 justify-center")}
              >
                <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold", expanded && "bg-muted")}>
                  {hasMounted ? initials(workspace.name) : ""}
                </span>
                {expanded && <span className="truncate text-sm font-medium">{workspace.name}</span>}
              </button>
            </DropdownMenuTrigger>
          )}
          <DropdownMenuContent side="right" align="start" className="w-64">
            <DropdownMenuLabel className="text-xs text-muted-foreground">{t("workspaces")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {workspaces.map((w) => (
              <DropdownMenuItem key={w.id} className="h-10 text-sm" onClick={() => setWorkspace(w.id)}>
                <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-xs font-semibold">{initials(w.name)}</span>
                <span className="flex-1 truncate">{w.name}</span>
                {w.id === workspace.id && <Check className="size-4 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Quick create */}
        <DropdownMenu>
          {withTooltip(
            t("create"),
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={t("create")}
                className={cn(railButton, "border border-border bg-card text-foreground shadow-xs", expanded ? "w-full px-3" : "w-11 justify-center")}
              >
                <Plus className="size-5" />
                {expanded && <span className="text-sm font-medium">{t("create")}</span>}
              </button>
            </DropdownMenuTrigger>
          )}
          <DropdownMenuContent side="right" align="start" className="w-56">
            {quickCreate.map((item) => (
              <DropdownMenuItem key={item.href} className="h-10 text-sm" onClick={() => router.push(item.href)}>
                <item.icon className="size-4 text-muted-foreground" />
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Pages of the current section */}
      <nav aria-label={activeGroup?.title} className={cn("flex flex-1 flex-col gap-1.5", !expanded && "items-center")}>
        {expanded && activeGroup && (
          <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{activeGroup.title}</p>
        )}
        {activeGroup?.items.map((item) => {
          const active = isActive(item.url)
          const alert = alerts.has(item.url)
          return (
            <span key={item.url} className={expanded ? "w-full" : undefined}>
              {withTooltip(
                item.title,
                <Link
                  href={item.url}
                  aria-label={expanded ? undefined : item.title}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    railButton,
                    expanded ? "w-full px-3" : "w-11 justify-center",
                    active && "border border-border bg-card text-primary shadow-xs hover:text-primary"
                  )}
                >
                  <item.icon className="size-5 shrink-0" />
                  {expanded && <span className="truncate text-sm font-medium">{item.title}</span>}
                  {alert && (
                    <span
                      className={cn(
                        "absolute size-2 rounded-full bg-primary ring-2 ring-background",
                        expanded ? "end-3 top-1/2 -translate-y-1/2" : "end-2 top-2"
                      )}
                    >
                      <span className="sr-only">{t("needsAttention")}</span>
                    </span>
                  )}
                </Link>
              )}
            </span>
          )
        })}
      </nav>

      {/* Bottom controls */}
      <div className={cn("flex flex-col gap-1.5", !expanded && "items-center")}>
        {withTooltip(
          isDark ? t("lightMode") : t("darkMode"),
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label={expanded ? undefined : isDark ? t("lightMode") : t("darkMode")}
            className={cn(railButton, expanded ? "w-full px-3" : "w-11 justify-center")}
          >
            {hasMounted && isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
            {expanded && <span className="text-sm font-medium">{isDark ? t("lightMode") : t("darkMode")}</span>}
          </button>
        )}
        {withTooltip(
          t("expandSidebar"),
          <button
            type="button"
            onClick={toggle}
            aria-label={expanded ? undefined : t("expandSidebar")}
            aria-expanded={expanded}
            className={cn(railButton, expanded ? "w-full px-3" : "w-11 justify-center")}
          >
            <PanelLeft className={cn("size-5", dir === "rtl" && "-scale-x-100")} />
            {expanded && <span className="text-sm font-medium">{t("collapseSidebar")}</span>}
          </button>
        )}
        <div className={cn("pt-1", expanded && "px-0.5")}>
          <UserMenu variant={expanded ? "expanded" : "avatar"} />
        </div>
      </div>
    </aside>
  )
}
