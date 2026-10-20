"use client"

import * as React from "react"
import { useLocale, useTranslations } from "next-intl"
import { AlertTriangle, CalendarDays, ChevronRight, Close, Eye, FolderKanban, Globe, ListChecks, Mail, MessagesSquare, MoreHorizontal, Pencil, Phone, Receipt, Star, Trash2, Wallet } from "@/components/ui/carbon/icons"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useCrmMutations, useFollowUpMutations } from "@/hooks/workforce/use-crm"
import { Checkbox } from "@/components/ui/checkbox"
import { addDays } from "@/lib/workforce/billing"
import { useCurrentEmployee } from "@/hooks/workforce/use-current-employee"
import type { ClientFigures } from "@/lib/workforce/client-figures"
import { todayIso } from "@/lib/workforce/project-metrics"
import { cn } from "@/lib/utils"
import { ClientNoteKind } from "@/types/work-crm"
import type { Client, Employee } from "@/types/workforce"
import { HEALTH_CLASS, relativeDay } from "./clients-columns"
import type { ClientPageTab } from "./client-page-tabs"
import { CLIENT_STATUS_CLASS, CLIENT_STATUS_LABEL, formatMoney } from "./workforce-labels"
import { FollowUpDialog } from "./follow-up-dialog"

export const HEALTH_BADGE = { good: "bg-success-soft text-success-foreground", watch: "bg-warning-soft text-warning-foreground", at_risk: "bg-danger-soft text-destructive" } as const

/** True at and above the given width; false while prerendering. */
function useMinWidth(px: number) {
  return React.useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== "function") return () => {}
      const mql = window.matchMedia(`(min-width: ${px}px)`)
      mql.addEventListener("change", onChange)
      return () => mql.removeEventListener("change", onChange)
    },
    () => window.innerWidth >= px,
    () => false
  )
}

interface Props {
  client: Client | null
  figures?: ClientFigures
  employees: Employee[]
  currency: string
  canSeeMoney: boolean
  canEdit: boolean
  canDelete: boolean
  onClose: () => void
  onEdit: (client: Client) => void
  onDelete: (client: Client) => void
  /** Opens the client's page, on a tab when given (contracts, invoices, activity…) */
  onOpenProfile: (client: Client, tab?: ClientPageTab) => void
}

/**
 * "Client details" beside the clients list (CRM step 3), after the reference
 * design: who the client is and how to reach them, the work and money open,
 * satisfaction, and the next step. Docked on wide screens, a side sheet below.
 */
export function ClientDetailsPanel(props: Props) {
  const t = useTranslations()
  const docked = useMinWidth(1280)
  const { client, onClose } = props

  // Escape closes the docked panel (the sheet handles its own)
  React.useEffect(() => {
    if (!client || !docked) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !document.querySelector('[role="dialog"]') && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [client, docked, onClose])

  if (!client) return null
  if (docked) {
    return (
      <aside aria-label={t("cdPanelTitle")} className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-3xl border border-border bg-card shadow-panel">
        <Details {...props} client={client} titleAs="h2" />
      </aside>
    )
  }
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto" showCloseButton={false}>
        <Details {...props} client={client} titleAs="sheet" />
      </SheetContent>
    </Sheet>
  )
}

function Details({ client: c, figures: f, employees, currency, canSeeMoney, canEdit, canDelete, onClose, onEdit, onDelete, onOpenProfile, titleAs }: Props & { client: Client; titleAs: "h2" | "sheet" }) {
  const t = useTranslations()
  const locale = useLocale()
  const today = todayIso()
  const [logging, setLogging] = React.useState(false)
  const [planning, setPlanning] = React.useState(false)
  const money = (n: number) => formatMoney(n, currency, locale)
  const contact = c.contacts.find((x) => x.isPrimary)
  const phone = contact?.phone || c.phone
  const email = contact?.email || c.email
  const manager = employees.find((e) => e.id === c.accountManagerId)
  const dateLabel = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(`${iso.slice(0, 10)}T00:00:00`))
  const Title = titleAs === "sheet" ? SheetTitle : "h2"

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex items-center justify-between">
        <Title className="font-sans text-base font-semibold tracking-normal">{t("cdPanelTitle")}</Title>
        <Button variant="ghost" size="icon" className="size-8" onClick={onClose} aria-label={t("close")}>
          <Close className="size-4" />
        </Button>
      </div>

      {/* identity and quick actions */}
      <div className="flex items-start gap-4">
        <SpaceAvatar name={c.name} size="xl" />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-lg font-semibold">{c.name}</p>
            <Badge variant="outline" className={CLIENT_STATUS_CLASS[c.status]}>{t(CLIENT_STATUS_LABEL[c.status])}</Badge>
          </div>
          <p className="truncate text-sm text-muted-foreground">{[contact?.name, c.industry].filter(Boolean).join(" · ") || c.email}</p>
          <div className="flex gap-2 pt-1.5">
            <QuickAction label={phone ? t("cdCall", { phone }) : t("cdNoPhone")} href={phone ? `tel:${phone.replace(/\s/g, "")}` : undefined} icon={Phone} />
            <QuickAction label={email ? t("cdEmail", { email }) : t("clNoEmail")} href={email ? `mailto:${email}` : undefined} icon={Mail} />
            <QuickAction label={c.website ? t("cdWebsite") : t("cdNoWebsite")} href={c.website} icon={Globe} external />
            {(canEdit || canDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="size-9 rounded-full" aria-label={t("cdMore")}>
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {canEdit && (
                    <DropdownMenuItem className="cursor-pointer gap-2 text-xs" onClick={() => onEdit(c)}>
                      <Pencil className="size-3.5" />
                      {t("edit")}
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="cursor-pointer gap-2 text-xs text-destructive" onClick={() => onDelete(c)}>
                        <Trash2 className="size-3.5" />
                        {t("delete")}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* health, tags and lead source */}
      {(f?.health || c.tags?.length || c.leadSource) && (
        <div className="space-y-2">
          {f?.health && (
            <div className={cn("flex items-start gap-2 rounded-2xl px-3 py-2 text-xs", HEALTH_BADGE[f.health.level])}>
              <span className={cn("mt-1 size-2 shrink-0 rounded-full", HEALTH_CLASS[f.health.level])} aria-hidden />
              <span>
                <span className="font-semibold">{t(`clHealth_${f.health.level}`)}</span>
                {f.health.reasons.length > 0 && <span> · {f.health.reasons.map((r) => t(`clReason_${r}`)).join(" · ")}</span>}
              </span>
            </div>
          )}
          {(c.tags?.length || c.leadSource) && (
            <div className="flex flex-wrap gap-1.5">
              {c.tags?.map((tag) => (
                <Badge key={tag} variant="outline" className="border-transparent bg-muted text-muted-foreground">{tag}</Badge>
              ))}
              {c.leadSource && <Badge variant="outline" className="border-transparent bg-info-soft text-info-foreground">{t(`clSource_${c.leadSource}`)}</Badge>}
            </div>
          )}
        </div>
      )}

      {/* four counters, as in the reference */}
      <div className="grid grid-cols-4 divide-x divide-border rounded-2xl border border-border py-3 text-center rtl:divide-x-reverse">
        <Counter icon={FolderKanban} tone="text-primary" value={f?.projects.total ?? 0} label={t("projects")} />
        <Counter icon={CalendarDays} tone="text-info-foreground" value={f?.projects.inProgress ?? 0} label={t("cdInProgress")} />
        <Counter icon={Star} tone="text-success-foreground" value={f?.projects.completed ?? 0} label={t("cdCompleted")} />
        <Counter icon={Wallet} tone="text-warning-foreground" value={f?.openDeals.count ?? 0} label={t("cdOpenDeals")} />
      </div>

      {/* satisfaction from the portal surveys */}
      <section aria-labelledby="cd-sat" className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 id="cd-sat" className="text-sm font-semibold">{t("cdSatisfaction")}</h3>
          {f && f.satisfaction.count > 0 && (
            <button type="button" onClick={() => onOpenProfile(c, "activity")} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              {t("cdViewAll")} <ChevronRight className="size-3 rtl:rotate-180" />
            </button>
          )}
        </div>
        {f && f.satisfaction.count > 0 ? (
          <>
            <p className="flex items-center gap-1.5 text-sm">
              <Stars value={f.satisfaction.average ?? 0} />
              <span className="font-semibold tabular-nums">{f.satisfaction.average}</span>
              <span className="text-muted-foreground">({t("cdAnswers", { n: f.satisfaction.count })})</span>
              {f.satisfaction.nps !== null && <span className="ms-auto text-xs text-muted-foreground">NPS {f.satisfaction.nps}</span>}
            </p>
            {f.satisfaction.latest?.comment && (
              <figure className="rounded-2xl border border-border p-3">
                <blockquote className="text-sm">“{f.satisfaction.latest.comment}”</blockquote>
                <figcaption className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{f.satisfaction.latest.respondentName} · {dateLabel(f.satisfaction.latest.answeredAt)}</span>
                  <Stars value={f.satisfaction.latest.rating} />
                </figcaption>
              </figure>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t("cdNoAnswers")}</p>
        )}
      </section>

      {/* account overview */}
      <section aria-labelledby="cd-overview" className="space-y-2">
        <h3 id="cd-overview" className="text-sm font-semibold">{t("cdOverview")}</h3>
        <div className="grid grid-cols-2 gap-2">
          {canSeeMoney ? (
            <Tile icon={Receipt} label={t("clBilledYear")} value={money(f?.billedThisYear ?? 0)} />
          ) : (
            <Tile icon={MessagesSquare} label={t("contacts")} value={String(c.contacts.length)} />
          )}
          <Tile icon={MessagesSquare} label={t("clLastContact")} value={f?.lastContact ? dateLabel(f.lastContact) : t("clNever")} sub={f?.lastContact ? relativeDay(f.lastContact, today, locale) : undefined} />
          {canSeeMoney ? (
            <Tile
              icon={f && f.overdue > 0 ? AlertTriangle : Wallet}
              label={t("clOwed")}
              value={money(f?.outstanding ?? 0)}
              sub={f && f.overdue > 0 ? t("clLateBy", { days: f.oldestLateDays }) : undefined}
              danger={!!f && f.overdue > 0}
            />
          ) : (
            <Tile icon={Wallet} label={t("accountManager")} value={manager?.name ?? "—"} />
          )}
          <Tile
            icon={CalendarDays}
            label={t("cdNextFollowUp")}
            value={f?.nextFollowUp ? dateLabel(f.nextFollowUp.dueDate) : t("cdNoFollowUp")}
            sub={f?.nextFollowUp?.title}
            danger={!!f?.nextFollowUp && f.nextFollowUp.dueDate < today}
          />
        </div>
      </section>

      {/* everything else lives on the client's full record */}
      <nav aria-label={t("cdMoreAbout", { name: c.name })} className="divide-y divide-border rounded-2xl border border-border">
        {[
          ...(canSeeMoney ? [{ icon: Receipt, label: t("cdInvoicesPayments"), tab: "billing" as const }] : []),
          { icon: ListChecks, label: t("followUps"), tab: "followups" as const },
          { icon: FolderKanban, label: t("cdProjectsQuotes"), tab: "projects" as const },
          { icon: CalendarDays, label: t("cdContracts"), tab: "contracts" as const },
          { icon: MessagesSquare, label: t("cdNotesActivity"), tab: "activity" as const },
        ].map((row) => (
          <button key={row.label} type="button" onClick={() => onOpenProfile(c, row.tab)} className="flex w-full items-center gap-3 px-3 py-2.5 text-start text-sm transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
            <row.icon className="size-4 text-muted-foreground" />
            <span className="flex-1">{row.label}</span>
            <ChevronRight className="size-4 text-muted-foreground rtl:rotate-180" />
          </button>
        ))}
      </nav>

      {canEdit && (
        <Button variant="outline" className="w-full" onClick={() => setPlanning(true)}>
          <ListChecks className="size-4" />
          {t("fuPlan")}
        </Button>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="primary" onClick={() => setLogging(true)}>
          <MessagesSquare className="size-4" />
          {t("cdLog")}
        </Button>
        <Button variant="outline" onClick={() => onOpenProfile(c)}>
          <Eye className="size-4" />
          {t("cdViewProfile")}
        </Button>
      </div>

      <LogDialog open={logging} onOpenChange={setLogging} client={c} canPlan={canEdit} />
      <FollowUpDialog open={planning} onOpenChange={setPlanning} defaults={{ clientId: c.id, contactId: c.contacts.find((x) => x.isPrimary)?.id }} lockClient />
    </div>
  )
}

export function QuickAction({ label, href, icon: Icon, external }: { label: string; href?: string; icon: React.ComponentType<{ className?: string }>; external?: boolean }) {
  const cls = "grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors"
  if (!href) {
    return (
      <span className={cn(cls, "cursor-not-allowed opacity-40")} title={label} aria-label={label} role="img">
        <Icon className="size-4" />
      </span>
    )
  }
  return (
    <a href={href} title={label} aria-label={label} className={cn(cls, "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      <Icon className="size-4" />
    </a>
  )
}

export function Counter({ icon: Icon, tone, value, label }: { icon: React.ComponentType<{ className?: string }>; tone: string; value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-1">
      <Icon className={cn("size-4", tone)} aria-hidden />
      <span className="text-lg font-semibold tabular-nums">{value}</span>
      <span className="text-[11px] leading-tight text-muted-foreground">{label}</span>
    </div>
  )
}

export function Tile({ icon: Icon, label, value, sub, danger }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub?: string; danger?: boolean }) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-border p-3">
      <span className={cn("grid size-8 shrink-0 place-items-center rounded-xl", danger ? "bg-danger-soft text-destructive" : "bg-primary/10 text-primary")}>
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span className={cn("block truncate text-sm font-semibold tabular-nums", danger && "text-destructive")} title={value}>{value}</span>
        {sub && <span className={cn("block truncate text-xs", danger ? "text-destructive" : "text-muted-foreground")} title={sub}>{sub}</span>}
      </span>
    </div>
  )
}

export function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex" role="img" aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn("size-3.5", i <= Math.round(value) ? "fill-warning text-warning" : "text-border")} aria-hidden />
      ))}
    </span>
  )
}

/** Records a call, meeting or note on the client's timeline. */
export function LogDialog({ open, onOpenChange, client, canPlan = false }: { open: boolean; onOpenChange: (open: boolean) => void; client: Client; canPlan?: boolean }) {
  const t = useTranslations()
  const me = useCurrentEmployee()
  const { addNote } = useCrmMutations()
  const { save: saveFollowUp } = useFollowUpMutations()
  const [kind, setKind] = React.useState<ClientNoteKind>(ClientNoteKind.CALL)
  const [date, setDate] = React.useState(() => todayIso())
  const [text, setText] = React.useState("")
  // the next step, planned in the same go (CRM step 5)
  const [plan, setPlan] = React.useState(false)
  const [nextTitle, setNextTitle] = React.useState("")
  const [nextDate, setNextDate] = React.useState(() => addDays(todayIso(), 7))
  const planReady = !plan || (!!nextTitle.trim() && !!nextDate)
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!planReady) return
    addNote.mutate(
      { clientId: client.id, kind, date, text, authorId: me?.id },
      {
        onSuccess: () => {
          if (plan) saveFollowUp.mutate({ input: { clientId: client.id, title: nextTitle, dueDate: nextDate, ownerId: me?.id, contactId: client.contacts.find((x) => x.isPrimary)?.id } })
          setText("")
          setPlan(false)
          setNextTitle("")
          setNextDate(addDays(todayIso(), 7))
          onOpenChange(false)
        },
      }
    )
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t("cdLogTitle", { name: client.name })}</DialogTitle>
            <DialogDescription>{t("cdLogHint")}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2" role="radiogroup" aria-label={t("cdLogKind")}>
            {[ClientNoteKind.CALL, ClientNoteKind.MEETING, ClientNoteKind.NOTE].map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                onClick={() => setKind(k)}
                className={cn("h-9 flex-1 rounded-full border text-[13px] font-medium", kind === k ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted")}
              >
                {t(`cdKind_${k}`)}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cd-log-date">{t("date")}</Label>
            <Input id="cd-log-date" type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cd-log-text">{t("cdLogWhat")}</Label>
            <Textarea id="cd-log-text" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("cdLogPlaceholder")} />
          </div>
          {canPlan && (
            <div className="space-y-3 rounded-2xl border border-border p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox checked={plan} onCheckedChange={(v) => setPlan(!!v)} />
                {t("fuPlanNext")}
              </label>
              {plan && (
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
                  <div className="space-y-1.5">
                    <Label htmlFor="cd-next-title">{t("fuWhat")}</Label>
                    <Input id="cd-next-title" value={nextTitle} onChange={(e) => setNextTitle(e.target.value)} placeholder={t("fuWhatPlaceholder")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cd-next-date">{t("fuDue")}</Label>
                    <Input id="cd-next-date" type="date" min={todayIso()} value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
            <Button type="submit" disabled={!text.trim() || !planReady || addNote.isPending}>{t("save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
