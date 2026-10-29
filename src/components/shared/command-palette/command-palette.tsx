"use client"

import { taskKey } from "@/lib/workforce/task-extras"
import * as React from "react"
import { useTranslations } from "next-intl"
import { useTheme } from "next-themes"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { BookUser, Bookmark, Briefcase, Calendar, FileSignature, FileText, FolderKanban, Handshake, ClipboardCheck, InboxIcon, LockKeyhole, LogOut, Moon, ReceiptText, Sun, Truck, UserPlus, Users, Wallet } from "@/components/ui/carbon/icons"
import { useRouter } from "@/i18n/navigation"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useLockScreenStore } from "@/store/auth/lock-screen-store"
import { useLogout } from "@/hooks/auth/use-logout"
import { useDashboardNav } from "@/components/shared/navigation/use-dashboard-nav"
import { useClients, useEmployees } from "@/hooks/workforce/use-workforce"
import { useProjects, useTasks } from "@/hooks/workforce/use-work-projects"
import { useClientInvoices } from "@/hooks/workforce/use-work-billing"
import { useQuotes } from "@/hooks/workforce/use-quotes"
import { useDeals } from "@/hooks/workforce/use-deals"
import { useSuppliers } from "@/hooks/workforce/use-workforce"
import { useSupplierBills } from "@/hooks/workforce/use-supplier-bills"
import { useExpenses } from "@/hooks/workforce/use-expenses"
import { useFollowUps } from "@/hooks/workforce/use-crm"
import { useClientRequests } from "@/hooks/workforce/use-client-requests"
import { useAllProjectPages } from "@/hooks/workforce/use-project-pages"
import { useSelfScope } from "@/hooks/workforce/use-current-employee"
import { ClientStatus } from "@/types/workforce"
import { can } from "@/lib/permissions/can"
import { AdminPermissionsPlatform as P } from "@/types/roles"

export interface CommandPaletteProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const MIN_QUERY = 2
const PER_GROUP = 6

type Hit = { id: string; label: string; detail?: string; keywords: string; href: string }

/**
 * Search across the whole ERP (PLT-11), opened with Ctrl+K / Cmd+K or the top
 * bar: pages, employees, clients, leads, contacts, deals, follow-ups, projects,
 * tasks, project pages, client requests, invoices, quotes, suppliers, supplier
 * bills and expenses (A4.1). Each kind of record only appears for roles allowed
 * to see it, and expenses only to their owner unless the person approves them.
 * The palette itself loads on first use, so none of this costs a page load.
 */
export function CommandPalette({ open: controlledOpen, onOpenChange: setControlledOpen }: CommandPaletteProps) {
  const t = useTranslations()
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled && setControlledOpen ? setControlledOpen : setInternalOpen
  const [query, setQuery] = React.useState("")

  const router = useRouter()
  const { setTheme } = useTheme()
  const { lock } = useLockScreenStore()
  const { mutation: logoutMutation } = useLogout()
  const { authedUser } = useAuthGuard()
  const { groups } = useDashboardNav()

  const allowed = {
    employees: can(authedUser, P.EMPLOYEES_READ),
    clients: can(authedUser, P.CLIENTS_READ),
    projects: can(authedUser, P.PROJECTS_READ),
    invoices: can(authedUser, P.INVOICES_READ),
    deals: can(authedUser, P.CLIENTS_UPDATE),
    purchases: can(authedUser, P.INVOICES_CREATE),
    expenses: can(authedUser, P.TIME_TRACK),
  }
  const self = useSelfScope()
  const { data: employees = [] } = useEmployees()
  const { data: clients = [] } = useClients()
  const { data: projects = [] } = useProjects()
  const { data: tasks = [] } = useTasks()
  const { data: invoices = [] } = useClientInvoices()
  const { data: quotes = [] } = useQuotes()
  const { data: deals = [] } = useDeals()
  const { data: suppliers = [] } = useSuppliers()
  const { data: bills = [] } = useSupplierBills()
  const { data: expenses = [] } = useExpenses()
  const { data: followUps = [] } = useFollowUps()
  const { data: requests = [] } = useClientRequests()
  const { data: projectPages = [] } = useAllProjectPages()

  // when the top bar controls it, the top bar owns Ctrl+K / Cmd+K (it loads the palette on first use)
  React.useEffect(() => {
    if (isControlled) return
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(!open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [isControlled, open, setOpen])

  const run = React.useCallback(
    (command: () => void) => {
      setOpen(false)
      setQuery("")
      command()
    },
    [setOpen]
  )

  // Custom field values (PLT-12) are searchable too, e.g. a PO number
  const extra = (values?: Record<string, string>) => Object.values(values ?? {}).join(" ")
  const clientName = (id?: string) => clients.find((c) => c.id === id)?.name
  const employeeName = (id?: string) => employees.find((e) => e.id === id)?.name
  const projectLabel = (id?: string) => {
    const p = projects.find((x) => x.id === id)
    return p ? `${p.code} · ${p.name}` : undefined
  }
  const live = clients.filter((c) => !c.deletedAt)
  const clientHit = (c: (typeof clients)[number]) => ({ id: c.id, label: c.name, detail: c.industry, keywords: `${c.name} ${c.legalName ?? ""} ${c.email} ${c.ice ?? ""} ${c.contacts.map((x) => x.name).join(" ")} ${extra(c.customFields)}`, href: `/dashboard/clients/${c.id}` })
  const q = query.trim().toLowerCase()
  const match = (hits: Hit[]) => (q.length < MIN_QUERY ? [] : hits.filter((h) => h.keywords.toLowerCase().includes(q)).slice(0, PER_GROUP))

  const records: { key: string; heading: string; icon: typeof Users; hits: Hit[] }[] = [
    {
      key: "employees",
      heading: t("employees"),
      icon: Users,
      hits: allowed.employees ? match(employees.map((e) => ({ id: e.id, label: e.name, detail: e.jobTitle, keywords: `${e.name} ${e.email} ${e.jobTitle} ${extra(e.customFields)}`, href: "/dashboard/employees" }))) : [],
    },
    {
      key: "clients",
      heading: t("clients"),
      icon: Handshake,
      hits: allowed.clients ? match(live.filter((c) => c.status !== ClientStatus.LEAD).map(clientHit)) : [],
    },
    {
      key: "leads",
      heading: t("leads"),
      icon: UserPlus,
      hits: allowed.clients ? match(live.filter((c) => c.status === ClientStatus.LEAD).map(clientHit)) : [],
    },
    {
      key: "contacts",
      heading: t("contacts"),
      icon: BookUser,
      hits: allowed.clients
        ? match(live.flatMap((c) => c.contacts.map((x) => ({ id: `${c.id}:${x.id}`, label: x.name, detail: [x.position, c.name].filter(Boolean).join(" · "), keywords: `${x.name} ${x.email} ${x.phone ?? ""} ${x.position ?? ""} ${c.name}`, href: "/dashboard/contacts" }))))
        : [],
    },
    {
      key: "deals",
      heading: t("deals"),
      icon: Briefcase,
      hits: allowed.deals ? match(deals.map((d) => ({ id: d.id, label: d.title, detail: clientName(d.clientId), keywords: `${d.title} ${clientName(d.clientId) ?? ""}`, href: "/dashboard/deals" }))) : [],
    },
    {
      key: "followUps",
      heading: t("followUps"),
      icon: Calendar,
      hits: allowed.clients
        ? match(followUps.map((f) => ({ id: f.id, label: f.title, detail: [clientName(f.clientId), f.dueDate].filter(Boolean).join(" · "), keywords: `${f.title} ${clientName(f.clientId) ?? ""} ${f.note ?? ""}`, href: "/dashboard/follow-ups" })))
        : [],
    },
    {
      key: "projects",
      heading: t("projects"),
      icon: FolderKanban,
      hits: allowed.projects ? match(projects.map((p) => ({ id: p.id, label: `${p.code} · ${p.name}`, detail: clientName(p.clientId), keywords: `${p.code} ${p.name} ${clientName(p.clientId) ?? ""} ${extra(p.customFields)}`, href: `/dashboard/projects/${p.id}` }))) : [],
    },
    {
      key: "tasks",
      heading: t("tasks"),
      icon: ClipboardCheck,
      hits: allowed.projects
        ? match(tasks.map((x) => {
            const p = projects.find((pr) => pr.id === x.projectId)
            const key = taskKey(x, p)
            return { id: x.id, label: key ? `${key} · ${x.title}` : x.title, detail: p ? `${p.code} · ${p.name}` : undefined, keywords: `${key} ${x.title} ${p?.code ?? ""} ${p?.name ?? ""}`, href: `/dashboard/projects/${x.projectId}?task=${x.id}` }
          }))
        : [],
    },
    {
      key: "projectPages",
      heading: t("srProjectPages"),
      icon: Bookmark,
      hits: allowed.projects
        ? match(projectPages.map((pg) => ({ id: pg.id, label: pg.title, detail: projectLabel(pg.projectId), keywords: `${pg.title} ${pg.body} ${projectLabel(pg.projectId) ?? ""}`, href: `/dashboard/projects/${pg.projectId}?tab=pages` })))
        : [],
    },
    {
      key: "requests",
      heading: t("srRequests"),
      icon: InboxIcon,
      hits: allowed.projects
        ? match(requests.map((r) => ({ id: r.id, label: `${r.number} · ${r.title}`, detail: clientName(r.clientId), keywords: `${r.number} ${r.title} ${r.description ?? ""} ${clientName(r.clientId) ?? ""}`, href: "/dashboard/requests" })))
        : [],
    },
    {
      key: "invoices",
      heading: t("invoices"),
      icon: FileText,
      hits: allowed.invoices
        ? match(invoices.filter((i) => i.number).map((i) => ({ id: i.id, label: i.number, detail: clientName(i.clientId), keywords: `${i.number} ${clientName(i.clientId) ?? ""} ${i.subject ?? ""}`, href: "/dashboard/client-invoices" })))
        : [],
    },
    {
      key: "quotes",
      heading: t("quotes"),
      icon: FileSignature,
      hits: allowed.invoices
        ? match(quotes.map((x) => ({ id: x.id, label: x.number || x.subject, detail: clientName(x.clientId), keywords: `${x.number} ${x.subject} ${clientName(x.clientId) ?? ""}`, href: "/dashboard/quotes" })))
        : [],
    },
    {
      key: "suppliers",
      heading: t("suppliers"),
      icon: Truck,
      hits: allowed.purchases ? match(suppliers.map((x) => ({ id: x.id, label: x.name, detail: x.legalName, keywords: `${x.name} ${x.legalName ?? ""}`, href: "/dashboard/suppliers" }))) : [],
    },
    {
      key: "supplierBills",
      heading: t("supplierBills"),
      icon: ReceiptText,
      hits: allowed.purchases
        ? match(bills.map((b) => {
            const supplier = suppliers.find((x) => x.id === b.supplierId)?.name
            return { id: b.id, label: b.number, detail: supplier, keywords: `${b.number} ${supplier ?? ""}`, href: "/dashboard/supplier-bills" }
          }))
        : [],
    },
    {
      key: "expenses",
      heading: t("expenses"),
      icon: Wallet,
      // without the approve right a person only finds their own expenses, as on the Expenses page
      hits: allowed.expenses
        ? match(expenses.filter((x) => self.isMine(x.employeeId)).map((x) => ({ id: x.id, label: x.description, detail: [employeeName(x.employeeId), x.date].filter(Boolean).join(" · "), keywords: `${x.description} ${employeeName(x.employeeId) ?? ""} ${projectLabel(x.projectId) ?? ""}`, href: "/dashboard/expenses" })))
        : [],
    },
  ]

  return (
    <CommandDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setQuery("")
      }}
      title={t("searchTitle")}
      description={t("searchDescription")}
    >
      {/* Records are filtered here (with permissions); cmdk's own filter would hide them otherwise */}
      <CommandInput placeholder={t("searchPlaceholder")} value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>{q.length < MIN_QUERY ? t("searchTypeMore") : t("searchNoResults")}</CommandEmpty>

        {records
          .filter((g) => g.hits.length > 0)
          .map((g) => (
            <CommandGroup key={g.key} heading={g.heading}>
              {g.hits.map((h) => (
                <CommandItem key={h.id} value={`${g.key}:${h.id} ${h.keywords}`} onSelect={() => run(() => router.push(h.href))}>
                  <g.icon className="me-2 size-4 text-muted-foreground" />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{h.label}</span>
                    {h.detail && <span className="truncate text-xs text-muted-foreground">{h.detail}</span>}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}

        <CommandGroup heading={t("searchPages")}>
          {groups.flatMap((group) =>
            group.items.map((item) => (
              <CommandItem key={item.url} value={`page ${group.title} ${item.title}`} onSelect={() => run(() => router.push(item.url))}>
                <item.icon className="me-2 size-4 text-primary" />
                <span>{item.title}</span>
                <span className="ms-auto text-xs text-muted-foreground">{group.title}</span>
              </CommandItem>
            ))
          )}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading={t("searchActions")}>
          <CommandItem value="action light theme" onSelect={() => run(() => setTheme("light"))}>
            <Sun className="me-2 size-4" />
            <span>{t("searchLightTheme")}</span>
          </CommandItem>
          <CommandItem value="action dark theme" onSelect={() => run(() => setTheme("dark"))}>
            <Moon className="me-2 size-4" />
            <span>{t("searchDarkTheme")}</span>
          </CommandItem>
          <CommandItem value="action lock screen" onSelect={() => run(() => lock())}>
            <LockKeyhole className="me-2 size-4" />
            <span>{t("searchLock")}</span>
          </CommandItem>
          <CommandItem value="action sign out logout" onSelect={() => run(() => logoutMutation.mutate())}>
            <LogOut className="me-2 size-4 text-destructive" />
            <span className="text-destructive">{t("searchSignOut")}</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
