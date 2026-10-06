"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Archive, Building, Pencil, Plus, Trash2, Warning } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useSupplierMutations, useSuppliers } from "@/hooks/workforce/use-workforce"
import { useWorkspaceSettings } from "@/hooks/workforce/use-settings"
import { can } from "@/lib/permissions/can"
import { clientNeedsIce } from "@/lib/workforce/tax-ids"
import { cn } from "@/lib/utils"
import { AdminPermissionsPlatform } from "@/types/roles"
import { SupplierCategory, SupplierStatus, type Supplier, type SupplierInput } from "@/types/work-purchases"

const NONE = "__none__"
const COUNTRIES = ["MA", "FR", "BE", "CH", "ES", "DE", "GB", "US", "CA", "AE", "SA", "TN", "DZ", "SN"]

const empty = (): SupplierInput => ({ name: "", category: SupplierCategory.SERVICES, status: SupplierStatus.ACTIVE, paymentTermsDays: 30 })

/** Suppliers and subcontractors the company buys from (Phase 6f.1). */
export default function SuppliersPage() {
  const t = useTranslations()
  const { authedUser } = useAuthGuard()
  const canEdit = can(authedUser, AdminPermissionsPlatform.INVOICES_CREATE)
  const { data: suppliers = [], isLoading } = useSuppliers()
  const { data: settings } = useWorkspaceSettings()
  const companyCountry = settings?.company.country ?? "MA"
  const { create, update, remove } = useSupplierMutations()
  const [query, setQuery] = useState("")
  const [showArchived, setShowArchived] = useState(false)
  const [editing, setEditing] = useState<{ id?: string; input: SupplierInput } | null>(null)
  const [deleting, setDeleting] = useState<Supplier | null>(null)

  const active = suppliers.filter((s) => s.status === SupplierStatus.ACTIVE)
  const missingIce = active.filter((s) => clientNeedsIce({ country: s.country }, companyCountry) && !s.ice)
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return suppliers
      .filter((s) => showArchived || s.status === SupplierStatus.ACTIVE)
      .filter((s) => !q || [s.name, s.legalName, s.ice, s.taxId, s.email].some((v) => v?.toLowerCase().includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [suppliers, query, showArchived])

  const cards: MetricCardItem[] = [
    { key: "active", title: t("suppliersActive"), value: active.length, valueClassName: "text-primary", footer: { icon: Building, text: t("suppliersActiveHint") } },
    { key: "sub", title: t("suppliersSubcontractors"), value: active.filter((s) => s.category === SupplierCategory.SUBCONTRACTOR).length, footer: { icon: Building, text: t("suppliersSubcontractorsHint") } },
    { key: "ice", title: t("suppliersMissingIce"), value: missingIce.length, valueClassName: missingIce.length ? "text-warning-foreground" : undefined, footer: { icon: Warning, text: t("suppliersMissingIceHint") } },
  ]

  const set = (patch: Partial<SupplierInput>) => setEditing((e) => (e ? { ...e, input: { ...e.input, ...patch } } : e))
  const open = (s?: Supplier) => {
    if (!s) return setEditing({ input: empty() })
    const { id, workspaceId: _w, createdAt: _c, updatedAt: _u, ...input } = s
    void _w; void _c; void _u
    setEditing({ id, input })
  }
  const save = () => {
    if (!editing) return
    const close = { onSuccess: () => setEditing(null) }
    if (editing.id) update.mutate({ id: editing.id, input: editing.input }, close)
    else create.mutate(editing.input, close)
  }
  const field = (key: "name" | "legalName" | "ice" | "taxId" | "email" | "phone" | "address" | "bankName" | "bankAccount", label: string, hint?: string) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`sup-${key}`}>{label}</Label>
      <Input id={`sup-${key}`} value={editing?.input[key] ?? ""} onChange={(e) => set({ [key]: e.target.value })} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
  const formCountry = editing?.input.country || companyCountry
  const formMoroccan = formCountry === "MA"

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader actions={canEdit ? <Button onClick={() => open()}><Plus className="size-4" /> {t("supplierNew")}</Button> : undefined} />
      <MetricCardGrid cards={cards} isLoading={isLoading} />

      <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">{t("suppliers")}</h2>
            <p className="text-sm text-muted-foreground">{t("suppliersListHint")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input className="h-9 w-64" placeholder={t("suppliersSearch")} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={t("suppliersSearch")} />
            <Button size="sm" variant={showArchived ? "primary" : "outline"} onClick={() => setShowArchived((v) => !v)}>
              <Archive className="size-4" /> {t("showArchived")}
            </Button>
          </div>
        </div>
        {isLoading ? (
          <ListSkeleton />
        ) : shown.length === 0 ? (
          <EmptyState icon={Building} title={t("suppliersEmpty")} hint={t("suppliersEmptyHint")} />
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
            {shown.map((s) => {
              const noIce = clientNeedsIce({ country: s.country }, companyCountry) && !s.ice
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t(`supCat_${s.category}`)}
                      {s.ice ? ` · ICE ${s.ice}` : ""}
                      {` · ${t("supplierTermsShort", { days: s.paymentTermsDays })}`}
                      {s.bankName ? ` · ${s.bankName}` : ""}
                    </p>
                  </div>
                  {noIce && s.status === SupplierStatus.ACTIVE && (
                    <Badge variant="outline" className="border-transparent bg-warning-soft text-warning-foreground">{t("supplierNoIce")}</Badge>
                  )}
                  <Badge variant="outline" className={cn("w-20 justify-center border-transparent", s.status === SupplierStatus.ACTIVE ? "bg-success-soft text-success-foreground" : "bg-muted text-muted-foreground")}>
                    {t(s.status === SupplierStatus.ACTIVE ? "supStatus_active" : "supStatus_archived")}
                  </Badge>
                  {canEdit && (
                    <div className="flex gap-1">
                      <Button size="icon-sm" variant="ghost" aria-label={t("edit")} onClick={() => open(s)}><Pencil className="size-4" /></Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t(s.status === SupplierStatus.ACTIVE ? "archive" : "restore")}
                        onClick={() => update.mutate({ id: s.id, input: { status: s.status === SupplierStatus.ACTIVE ? SupplierStatus.ARCHIVED : SupplierStatus.ACTIVE } })}
                      >
                        <Archive className="size-4" />
                      </Button>
                      <Button size="icon-sm" variant="ghost" aria-label={t("delete")} onClick={() => setDeleting(s)}><Trash2 className="size-4" /></Button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t(editing?.id ? "supplierEdit" : "supplierNew")}</DialogTitle>
            <DialogDescription>{t("supplierFormHint")}</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4 sm:grid-cols-2">
              {field("name", t("supplierName"))}
              {field("legalName", t("legalName"))}
              <div className="flex flex-col gap-1.5">
                <Label>{t("category")}</Label>
                <Select value={editing.input.category} onValueChange={(v) => set({ category: v as SupplierCategory })}>
                  <SelectTrigger className="w-full bg-card"><SelectValue>{t(`supCat_${editing.input.category}`)}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {Object.values(SupplierCategory).map((c) => <SelectItem key={c} value={c}>{t(`supCat_${c}`)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t("country")}</Label>
                <Select value={editing.input.country ?? NONE} onValueChange={(v) => set({ country: v === NONE ? undefined : v })}>
                  <SelectTrigger className="w-full min-w-0 bg-card"><SelectValue><span className="truncate">{editing.input.country ?? t("sameAsCompany", { country: companyCountry })}</span></SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t("sameAsCompany", { country: companyCountry })}</SelectItem>
                    {COUNTRIES.filter((c) => c !== companyCountry).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {field("ice", formMoroccan ? `${t("iceNumber")} *` : t("iceNumber"), formMoroccan ? t("supplierIceHint") : undefined)}
              {field("taxId", t("taxIdentifier"))}
              {field("email", t("email"))}
              {field("phone", t("phone"))}
              <div className="sm:col-span-2">{field("address", t("address"))}</div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sup-terms">{t("paymentTermsDays")}</Label>
                <Input id="sup-terms" type="number" min={0} max={365} value={editing.input.paymentTermsDays} onChange={(e) => set({ paymentTermsDays: Number(e.target.value) })} />
              </div>
              {field("bankName", t("bankName"))}
              <div className="sm:col-span-2">{field("bankAccount", formMoroccan ? t("supplierRib") : t("bankAccount"), formMoroccan ? t("supplierRibHint") : undefined)}</div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="sup-notes">{t("notes")}</Label>
                <Textarea id="sup-notes" rows={2} value={editing.input.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>{t("cancel")}</Button>
            <Button disabled={create.isPending || update.isPending} onClick={save}>{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmAlertDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t("supplierDeleteTitle")}
        description={t("supplierDeleteConfirm", { name: deleting?.name ?? "" })}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </div>
  )
}
