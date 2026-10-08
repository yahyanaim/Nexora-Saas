"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ListChecks, Pencil } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { DataTableEntityFormSheet } from "@/components/shared/data-table-chunks/data-table-entity-form-sheet"
import { useConsoleActor, useConsoleCustomers } from "@/hooks/platform/use-platform-console"
import { useBillingMutations, usePlanContent, usePlanVersions } from "@/hooks/platform/use-platform-billing"
import { consoleCan } from "@/lib/platform/console-roles"
import { accountMrr } from "@/lib/platform/customer-lifecycle"
import { isoOf, versionOn } from "@/lib/platform/billing"
import { NEXORA_PLANS, type NexoraPlanId } from "@/lib/platform/nexora-catalog"
import { ConsoleCapability as C } from "@/types/platform-console"
import { StepUpDialog } from "./console-shared"
import { Panel, useBillingFormat } from "./billing-shared"

/** The three plans, their price versions and who is on them (PLA-01 to PLA-07). */
export default function ConsolePlansPage() {
  const t = useTranslations()
  const { money, date } = useBillingFormat()
  const actor = useConsoleActor()
  const { data: versions = [] } = usePlanVersions()
  const { data: customers = [] } = useConsoleCustomers()
  const m = useBillingMutations()
  const [editing, setEditing] = useState<NexoraPlanId | null>(null)
  const [form, setForm] = useState({ monthly: "", effectiveFrom: "", existing: "keep" as "keep" | "move_at_renewal" })
  const [stepUp, setStepUp] = useState(false)
  // reading the content keeps the catalogue in line with the owner's edits (PLA-02)
  usePlanContent()
  const [content, setContent] = useState<{ plan: NexoraPlanId; description: string; seats: string; unlimited: boolean; features: string; retired: boolean } | null>(null)
  const [contentStepUp, setContentStepUp] = useState(false)
  const today = isoOf(new Date())
  const canEdit = consoleCan(actor?.role, C.CHANGE_PLANS)

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader />
      <section className="grid gap-4 lg:grid-cols-3">
        {NEXORA_PLANS.map((p) => {
          const current = versionOn(versions, p.id, today)
          const upcoming = versions.filter((v) => v.plan === p.id && v.effectiveFrom > today)
          const on = customers.filter((c) => c.plan === p.id && c.status !== "cancelled")
          return (
            <div key={p.id} className="flex flex-col rounded-3xl border border-border bg-card p-5 shadow-panel">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">{p.name}</h2>
                  <p className="text-sm text-muted-foreground">{p.seats > 0 ? t("plSeats", { count: p.seats }) : t("plUnlimited")}</p>
                </div>
                {p.retired && <Badge variant="outline" className="border-transparent bg-muted text-muted-foreground">{t("plRetired")}</Badge>}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
              {canEdit && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditing(p.id); setForm({ monthly: String(current?.monthly ?? p.monthly), effectiveFrom: "", existing: "keep" }) }}><Pencil className="size-4" />{t("plChangePrice")}</Button>
                  <Button size="sm" variant="outline" onClick={() => setContent({ plan: p.id, description: p.description, seats: p.seats > 0 ? String(p.seats) : "", unlimited: p.seats < 0, features: p.features.join("\n"), retired: !!p.retired })}><ListChecks className="size-4" />{t("plEditContent")}</Button>
                </div>
              )}
              <p className="mt-4 text-3xl font-semibold tabular-nums">{money(current?.monthly ?? p.monthly)}<span className="text-sm font-normal text-muted-foreground"> {t("plPerMonth")}</span></p>
              <p className="text-xs text-muted-foreground">{t("plYearly", { amount: money((current?.monthly ?? p.monthly) * 10) })}</p>
              {upcoming.map((v) => <Badge key={v.id} variant="outline" className="mt-2 w-fit border-transparent bg-info-soft text-info-foreground">{t("plUpcoming", { amount: money(v.monthly), date: date(v.effectiveFrom) })}</Badge>)}
              <ul className="mt-4 flex-1 space-y-1 text-sm">
                {p.features.map((f) => <li key={f} className="flex gap-2"><span className="text-success" aria-hidden>✓</span>{f}</li>)}
              </ul>
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-3 text-sm">
                <div><p className="text-xs text-muted-foreground">{t("plCustomers")}</p><p className="font-semibold tabular-nums">{on.length}</p></div>
                <div><p className="text-xs text-muted-foreground">MRR</p><p className="font-semibold tabular-nums">{money(on.reduce((s, c) => s + accountMrr(c), 0))}</p></div>
              </div>
            </div>
          )
        })}
      </section>

      <Panel title={t("plVersions")} hint={t("plVersionsHint")}>
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("pfPlan")}</TableHead>
                <TableHead className="text-end">{t("plMonthly")}</TableHead>
                <TableHead>{t("plFrom")}</TableHead>
                <TableHead>{t("plExisting")}</TableHead>
                <TableHead>{t("plBy")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{NEXORA_PLANS.find((p) => p.id === v.plan)?.name}</TableCell>
                  <TableCell className="text-end tabular-nums">{money(v.monthly)}</TableCell>
                  <TableCell>{date(v.effectiveFrom)}</TableCell>
                  <TableCell>{t(v.existing === "keep" ? "plKeep" : "plMove")}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{v.createdBy}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Panel>

      <DataTableEntityFormSheet
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        mode="create"
        createTitle={editing ? t("plChangeTitle", { plan: NEXORA_PLANS.find((p) => p.id === editing)!.name }) : ""}
        editTitle=""
        description={t("plChangeDesc")}
        isSubmitting={m.createVersion.isPending}
        submitLabel={{ create: t("plSaveVersion") }}
        onSubmit={() => setStepUp(true)}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pl-price">{t("plNewMonthly")}</Label>
            <Input id="pl-price" type="number" min={1} step="0.01" value={form.monthly} onChange={(e) => setForm({ ...form, monthly: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pl-from">{t("plFrom")}</Label>
            <Input id="pl-from" type="date" min={today} value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pl-existing">{t("plExisting")}</Label>
            <Select value={form.existing} onValueChange={(v) => setForm({ ...form, existing: v as "keep" | "move_at_renewal" })}>
              <SelectTrigger id="pl-existing"><SelectValue>{t(form.existing === "keep" ? "plKeep" : "plMove")}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="keep">{t("plKeep")}</SelectItem>
                <SelectItem value="move_at_renewal">{t("plMove")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="rounded-2xl bg-info-soft p-3 text-xs text-info-foreground">{t("plNote")}</p>
        </div>
      </DataTableEntityFormSheet>
      <DataTableEntityFormSheet
        open={!!content}
        onOpenChange={(v) => !v && setContent(null)}
        mode="edit"
        createTitle=""
        editTitle={content ? t("plContentTitle", { plan: NEXORA_PLANS.find((p) => p.id === content.plan)!.name }) : ""}
        description={t("plContentDesc")}
        isSubmitting={m.planContent.isPending}
        submitLabel={{ edit: t("save") }}
        onSubmit={() => setContentStepUp(true)}
      >
        {content && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pc-desc">{t("plDescription")}</Label>
              <Textarea id="pc-desc" rows={2} value={content.description} onChange={(e) => setContent({ ...content, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pc-seats">{t("plPeopleIncluded")}</Label>
              <Input id="pc-seats" type="number" min={1} disabled={content.unlimited} value={content.seats} onChange={(e) => setContent({ ...content, seats: e.target.value })} />
              <Switch checked={content.unlimited} onCheckedChange={(unlimited) => setContent({ ...content, unlimited })} labelText={t("plUnlimitedPeople")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pc-features">{t("plFeatures")}</Label>
              <Textarea id="pc-features" rows={7} value={content.features} onChange={(e) => setContent({ ...content, features: e.target.value })} aria-describedby="pc-features-hint" />
              <p id="pc-features-hint" className="text-xs text-muted-foreground">{t("plFeaturesHint")}</p>
            </div>
            <Switch checked={content.retired} onCheckedChange={(retired) => setContent({ ...content, retired })} labelText={t("plRetire")} />
            <p className="rounded-2xl bg-info-soft p-3 text-xs text-info-foreground">{t("plContentNote")}</p>
          </div>
        )}
      </DataTableEntityFormSheet>
      <StepUpDialog
        open={contentStepUp}
        onOpenChange={setContentStepUp}
        action={content ? t("plContentStepUp", { plan: NEXORA_PLANS.find((p) => p.id === content.plan)!.name }) : ""}
        onConfirmed={() => content && m.planContent.mutate({ plan: content.plan, description: content.description, seats: content.unlimited ? -1 : Number(content.seats), features: content.features.split("\n"), retired: content.retired }, { onSuccess: () => setContent(null) })}
      />
      <StepUpDialog
        open={stepUp}
        onOpenChange={setStepUp}
        action={editing ? t("plStepUp", { plan: NEXORA_PLANS.find((p) => p.id === editing)!.name, amount: form.monthly }) : ""}
        onConfirmed={() => editing && m.createVersion.mutate({ plan: editing, monthly: Number(form.monthly), effectiveFrom: form.effectiveFrom, existing: form.existing }, { onSuccess: () => setEditing(null) })}
      />
    </div>
  )
}
