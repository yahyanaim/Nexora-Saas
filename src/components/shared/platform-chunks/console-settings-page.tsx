"use client"

import { useEffect, useState } from "react"
import { createTranslator, useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ListSkeleton } from "@/components/ui/empty-state"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, RotateCcw, X } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { DataTableEntityFormSheet } from "@/components/shared/data-table-chunks/data-table-entity-form-sheet"
import { routing } from "@/i18n/routing"
import { useConsoleActor, useConsoleCustomers } from "@/hooks/platform/use-platform-console"
import { useAnnouncements, useConfigMutations, useFeatureFlags, useNexoraIdentity } from "@/hooks/platform/use-platform-config"
import { EMAIL_TEMPLATES, FEATURE_FLAGS, announcementFor, flagOn, type EmailTemplateId, type FeatureFlagKey } from "@/lib/platform/config-rules"
import { NEXORA_PLANS, type NexoraPlanId } from "@/lib/platform/nexora-catalog"
import { ConsoleRole } from "@/types/platform-console"
import type { FeatureFlag, NexoraIdentity } from "@/types/platform-config"
import { Panel } from "./billing-shared"
import { StepUpDialog } from "./console-shared"

const LANGUAGE_NAMES: Record<string, string> = { en: "English", fr: "Français", de: "Deutsch", es: "Español", ar: "العربية", ur: "اردو", hi: "हिन्दी", ru: "Русский", zh: "中文" }
const IDENTITY_FIELDS = ["legalName", "address", "city", "country", "ice", "taxId", "rc", "email", "phone", "bankName", "rib", "swift"] as const
type IdentityField = (typeof IDENTITY_FIELDS)[number]

function Checks<T extends string>({ legend, options, value, onChange, disabled }: { legend: string; options: { id: T; label: string }[]; value: T[]; onChange: (v: T[]) => void; disabled?: boolean }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {options.map((o) => <Checkbox key={o.id} disabled={disabled} checked={value.includes(o.id)} onCheckedChange={(on) => onChange(on ? [...value, o.id] : value.filter((x) => x !== o.id))} labelText={o.label} />)}
      </div>
    </fieldset>
  )
}

/* ---------- CFG-04 ---------- */
function IdentityTab({ identity, canEdit }: { identity: NexoraIdentity; canEdit: boolean }) {
  const t = useTranslations()
  const m = useConfigMutations()
  const [form, setForm] = useState<Record<IdentityField, string>>(() => Object.fromEntries(IDENTITY_FIELDS.map((f) => [f, identity[f]])) as Record<IdentityField, string>)
  const [stepUp, setStepUp] = useState(false)
  const dirty = IDENTITY_FIELDS.some((f) => form[f] !== identity[f])
  return (
    <Panel title={t("cfgIdentity")} hint={t("cfgIdentityHint")}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setStepUp(true) }}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {IDENTITY_FIELDS.map((f) => (
            <div key={f} className={f === "address" ? "space-y-1.5 md:col-span-2" : "space-y-1.5"}>
              <Label htmlFor={`id-${f}`}>{t(`cfgF_${f}`)}</Label>
              <Input id={`id-${f}`} value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })} disabled={!canEdit} inputMode={f === "ice" || f === "rib" ? "numeric" : undefined} />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{t("cfgIdentityNote", { name: identity.updatedBy })}</p>
        {canEdit ? <Button type="submit" disabled={!dirty || m.identity.isPending}>{t("cfgSaveIdentity")}</Button> : <p className="text-sm text-muted-foreground">{t("cfgOwnerOnly")}</p>}
      </form>
      <StepUpDialog open={stepUp} onOpenChange={setStepUp} action={t("cfgIdentityStepUp")} onConfirmed={() => m.identity.mutate(form)} />
    </Panel>
  )
}

/* ---------- CFG-01 ---------- */
function AnnouncementsTab({ canEdit }: { canEdit: boolean }) {
  const t = useTranslations()
  const { data: list = [] } = useAnnouncements()
  const { data: customers = [] } = useConsoleCustomers()
  const m = useConfigMutations()
  const [today] = useState(() => new Date().toISOString().slice(0, 10))
  const [form, setForm] = useState<{ title: string; message: string; plans: NexoraPlanId[]; countries: string[]; from: string; to: string } | null>(null)
  const countries = [...new Set(customers.map((c) => c.country))].sort()
  const live = customers.filter((c) => c.status !== "cancelled" && c.status !== "deleted")
  const segment = (plans: string[], cs: string[]) => [plans.length ? plans.map((p) => NEXORA_PLANS.find((x) => x.id === p)?.name).join(", ") : t("annAllPlans"), cs.length ? cs.join(", ") : t("annAllCountries")].join(" · ")
  const state = (a: (typeof list)[number]) => (a.endedAt || a.to < today ? "ended" : a.from > today ? "scheduled" : "live")
  const reach = (a: Parameters<typeof announcementFor>[0]) => live.filter((c) => announcementFor({ ...a, from: "0000-01-01", to: "9999-12-31", endedAt: undefined }, c, today)).length
  return (
    <Panel title={t("annTitle")} hint={t("annHint")} actions={canEdit ? <Button size="sm" onClick={() => setForm({ title: "", message: "", plans: [], countries: [], from: today, to: today })}><Plus className="size-4" />{t("annNew")}</Button> : undefined}>
      <TableContainer>
        <Table className="min-w-[52rem]">
          <TableHeader><TableRow><TableHead>{t("annMessage")}</TableHead><TableHead>{t("annSegment")}</TableHead><TableHead>{t("annDates")}</TableHead><TableHead>{t("status")}</TableHead><TableHead>{t("actions")}</TableHead></TableRow></TableHeader>
          <TableBody>
            {list.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="max-w-80"><span className="font-medium">{a.title}</span><span className="block text-xs text-muted-foreground">{a.message}</span></TableCell>
                <TableCell className="text-sm">{segment(a.plans, a.countries)}<span className="block text-xs text-muted-foreground">{t("annReach", { n: reach(a) })}</span></TableCell>
                <TableCell className="text-sm tabular-nums">{a.from} → {a.to}</TableCell>
                <TableCell><Badge variant="outline" className={state(a) === "live" ? "border-transparent bg-success-soft text-success-foreground" : state(a) === "scheduled" ? "border-transparent bg-info-soft text-info-foreground" : "border-transparent bg-muted text-muted-foreground"}>{t(`annSt_${state(a)}`)}</Badge></TableCell>
                <TableCell>{canEdit && state(a) !== "ended" && <Button size="sm" variant="outline" onClick={() => m.endAnnouncement.mutate(a.id)}><X className="size-4" />{t("annEnd")}</Button>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <DataTableEntityFormSheet
        open={!!form}
        onOpenChange={(v) => !v && setForm(null)}
        mode="create"
        createTitle={t("annNew")}
        editTitle=""
        description={t("annNewDesc")}
        isSubmitting={m.announce.isPending}
        submitLabel={{ create: t("annPublish") }}
        onSubmit={() => form && m.announce.mutate(form, { onSuccess: () => setForm(null) })}
      >
        {form && (
          <div className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="ann-title">{t("incTitle")}</Label><Input id="ann-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="ann-msg">{t("annMessage")}</Label><Textarea id="ann-msg" rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
            <Checks legend={t("annPlans")} options={NEXORA_PLANS.map((p) => ({ id: p.id, label: p.name }))} value={form.plans} onChange={(plans) => setForm({ ...form, plans })} />
            <Checks legend={t("annCountries")} options={countries.map((c) => ({ id: c, label: c }))} value={form.countries} onChange={(cs) => setForm({ ...form, countries: cs })} />
            <p className="text-xs text-muted-foreground">{t("annEmptyMeansAll", { n: reach(form) })}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label htmlFor="ann-from">{t("plFrom")}</Label><Input id="ann-from" type="date" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="ann-to">{t("annTo")}</Label><Input id="ann-to" type="date" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} /></div>
            </div>
          </div>
        )}
      </DataTableEntityFormSheet>
    </Panel>
  )
}

/* ---------- CFG-02 ---------- */
function FlagCard({ flag, canEdit }: { flag: FeatureFlag; canEdit: boolean }) {
  const t = useTranslations()
  const { data: customers = [] } = useConsoleCustomers()
  const m = useConfigMutations()
  const def = FEATURE_FLAGS.find((f) => f.key === flag.key)!
  const [draft, setDraft] = useState({ enabled: flag.enabled, plans: flag.plans, customerIds: flag.customerIds })
  const live = customers.filter((c) => c.status !== "cancelled" && c.status !== "deleted")
  const on = live.filter((c) => flagOn(draft, c))
  const dirty = JSON.stringify(draft) !== JSON.stringify({ enabled: flag.enabled, plans: flag.plans, customerIds: flag.customerIds })
  return (
    <li className="space-y-4 rounded-2xl border border-border p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">{t(def.nameKey)} <code className="ms-1 rounded bg-muted px-1.5 py-0.5 text-xs font-normal">{flag.key}</code></h3>
          <p className="text-sm text-muted-foreground">{t(def.descriptionKey)}</p>
        </div>
        <Switch checked={draft.enabled} onCheckedChange={(enabled) => setDraft({ ...draft, enabled })} disabled={!canEdit} aria-label={t("ffEnabled")} labelText={t(draft.enabled ? "ffOn" : "ffOff")} />
      </div>
      <Checks legend={t("ffPlans")} disabled={!canEdit || !draft.enabled} options={NEXORA_PLANS.map((p) => ({ id: p.id, label: p.name }))} value={draft.plans} onChange={(plans) => setDraft({ ...draft, plans })} />
      <Checks legend={t("ffCustomers")} disabled={!canEdit || !draft.enabled} options={live.map((c) => ({ id: c.id, label: c.name }))} value={draft.customerIds} onChange={(customerIds) => setDraft({ ...draft, customerIds })} />
      <p className="text-xs text-muted-foreground">{draft.enabled ? t("ffReach", { n: on.length, names: on.map((c) => c.name).join(", ") || "—" }) : t("ffReachOff")}</p>
      {canEdit && <Button size="sm" disabled={!dirty || m.flag.isPending} onClick={() => m.flag.mutate({ key: flag.key as FeatureFlagKey, ...draft })}>{t("ffSave")}</Button>}
    </li>
  )
}

function FlagsTab({ canEdit }: { canEdit: boolean }) {
  const t = useTranslations()
  const { data: list = [] } = useFeatureFlags()
  return (
    <Panel title={t("ffTitle")} hint={t("ffHint")}>
      <ul className="space-y-3">{list.map((f) => <FlagCard key={`${f.key}-${f.updatedAt}`} flag={f} canEdit={canEdit} />)}</ul>
    </Panel>
  )
}

/* ---------- CFG-03 ---------- */
function TemplatesTab() {
  const t = useTranslations()
  const locale = useLocale()
  const [id, setId] = useState<EmailTemplateId>("invoice_issued")
  const [lang, setLang] = useState(locale)
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null)
  useEffect(() => {
    let alive = true
    import(`@/messages/${lang}.json`).then((mod) => {
      const tr = createTranslator({ locale: lang, messages: mod.default as Record<string, string> }) as unknown as (k: string, v?: Record<string, string | number>) => string
      const sample = EMAIL_TEMPLATES.find((x) => x.id === id)!.sample as Record<string, string | number>
      if (alive) setPreview({ subject: tr(`etpl_${id}_subject`, sample), body: tr(`etpl_${id}_body`, sample) })
    })
    return () => { alive = false }
  }, [id, lang])
  return (
    <Panel title={t("etTitle")} hint={t("etHint")}>
      <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
        <ul className="space-y-1" aria-label={t("etTitle")}>
          {EMAIL_TEMPLATES.map((x) => (
            <li key={x.id}>
              <button type="button" aria-pressed={id === x.id} onClick={() => setId(x.id)} className={id === x.id ? "w-full rounded-xl bg-primary/10 px-3 py-2 text-start text-sm font-medium text-primary" : "w-full rounded-xl px-3 py-2 text-start text-sm hover:bg-muted"}>
                {t(`etName_${x.id}`)}<span className="block text-xs text-muted-foreground">{t(`etGroup_${x.group}`)}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor="et-lang">{t("etLanguage")}</Label>
            <Select value={lang} onValueChange={setLang}>
              <SelectTrigger id="et-lang" className="w-44"><SelectValue>{LANGUAGE_NAMES[lang]}</SelectValue></SelectTrigger>
              <SelectContent>{routing.locales.map((l) => <SelectItem key={l} value={l}>{LANGUAGE_NAMES[l]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {preview && (
            <article dir={lang === "ar" || lang === "ur" ? "rtl" : "ltr"} lang={lang} className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs text-muted-foreground">{t("etSubject")}</p>
              <h3 className="mb-3 font-semibold">{preview.subject}</h3>
              <p className="whitespace-pre-wrap text-sm">{preview.body}</p>
            </article>
          )}
          <p className="text-xs text-muted-foreground">{t("etNote")}</p>
        </div>
      </div>
    </Panel>
  )
}

/* ---------- CFG-05 ---------- */
function DemoTab({ canEdit }: { canEdit: boolean }) {
  const t = useTranslations()
  const { data: customers = [] } = useConsoleCustomers()
  const m = useConfigMutations()
  const [confirm, setConfirm] = useState<{ id: string; name: string } | null>(null)
  const demos = customers.filter((c) => c.demoWorkspaceId)
  return (
    <Panel title={t("demoTitle")} hint={t("demoHint")}>
      <ul className="divide-y divide-border">
        {demos.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
            <span className="min-w-0 flex-1 text-sm"><span className="font-medium">{c.name}</span><span className="block font-mono text-xs text-muted-foreground">{c.demoWorkspaceId}</span></span>
            {canEdit && <Button size="sm" variant="outline" onClick={() => setConfirm({ id: c.id, name: c.name })}><RotateCcw className="size-4" />{t("demoReset")}</Button>}
          </li>
        ))}
      </ul>
      <ConfirmAlertDialog
        open={!!confirm}
        onOpenChange={(v) => !v && setConfirm(null)}
        title={t("demoResetTitle", { name: confirm?.name ?? "" })}
        description={t("demoResetDesc")}
        confirmLabel={t("demoReset")}
        destructive
        isLoading={m.resetDemo.isPending}
        onConfirm={() => confirm && m.resetDemo.mutate(confirm.id, { onSuccess: () => setConfirm(null) })}
      />
    </Panel>
  )
}

/** Console configuration (CFG-01 to CFG-06): identity, announcements, feature flags, e-mails and demo workspaces. */
export default function ConsoleSettingsPage() {
  const t = useTranslations()
  const actor = useConsoleActor()
  const { data: identity, isLoading } = useNexoraIdentity()
  const isOwner = actor?.role === ConsoleRole.OWNER
  const canEdit = isOwner || actor?.role === ConsoleRole.ADMIN
  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader />
      {isLoading || !identity ? <ListSkeleton /> : (
        <Tabs
          defaultTabId="identity"
          tabs={[
            { id: "identity", label: t("cfgTabIdentity"), content: <IdentityTab key={identity.updatedAt} identity={identity} canEdit={isOwner} /> },
            { id: "announcements", label: t("cfgTabAnnouncements"), content: <AnnouncementsTab canEdit={canEdit} /> },
            { id: "flags", label: t("cfgTabFlags"), content: <FlagsTab canEdit={canEdit} /> },
            { id: "emails", label: t("cfgTabEmails"), content: <TemplatesTab /> },
            { id: "demo", label: t("cfgTabDemo"), content: <DemoTab canEdit={canEdit} /> },
          ]}
        />
      )}
      <p className="text-xs text-muted-foreground">{t("cfgAudited")}</p>
    </div>
  )
}
