"use client"

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
import { FileSignature, FileText, FolderKanban, Handshake, ClipboardCheck, LockKeyhole, LogOut, Moon, Sun, Users } from "@/components/ui/carbon/icons"
import { useRouter } from "@/i18n/navigation"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useLockScreenStore } from "@/store/auth/lock-screen-store"
import { useLogout } from "@/hooks/auth/use-logout"
import { useDashboardNav } from "@/components/shared/navigation/use-dashboard-nav"
import { useClients, useEmployees } from "@/hooks/workforce/use-workforce"
import { useProjects, useTasks } from "@/hooks/workforce/use-work-projects"
import { useClientInvoices } from "@/hooks/workforce/use-work-billing"
import { useQuotes } from "@/hooks/workforce/use-quotes"
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
 * bar: pages, employees, clients, projects, tasks, invoices and quotes. Each
 * kind of record only appears for roles allowed to see it.
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
  }
  const { data: employees = [] } = useEmployees()
  const { data: clients = [] } = useClients()
  const { data: projects = [] } = useProjects()
  const { data: tasks = [] } = useTasks()
  const { data: invoices = [] } = useClientInvoices()
  const { data: quotes = [] } = useQuotes()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(!open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [open, setOpen])

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
      hits: allowed.clients ? match(clients.map((c) => ({ id: c.id, label: c.name, detail: c.industry, keywords: `${c.name} ${c.legalName ?? ""} ${c.email} ${c.ice ?? ""} ${c.contacts.map((x) => x.name).join(" ")} ${extra(c.customFields)}`, href: "/dashboard/clients" }))) : [],
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
            return { id: x.id, label: x.title, detail: p ? `${p.code} · ${p.name}` : undefined, keywords: `${x.title} ${p?.code ?? ""} ${p?.name ?? ""}`, href: `/dashboard/projects/${x.projectId}` }
          }))
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
