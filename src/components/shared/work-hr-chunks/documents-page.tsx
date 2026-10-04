"use client"

import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { AlertTriangle, Clock, FileText, Pencil, Plus, Trash2, Briefcase } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "../data-table-chunks/data-table"
import { DataTableColumnHeader } from "../data-table-chunks/data-table-column-header"
import { DataTableEntityFormSheet } from "../data-table-chunks/data-table-entity-form-sheet"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { can } from "@/lib/permissions/can"
import { AdminPermissionsPlatform } from "@/types/roles"
import { useEmployees } from "@/hooks/workforce/use-workforce"
import { useDocumentMutations, useDocuments } from "@/hooks/workforce/use-documents"
import { todayIso } from "@/lib/workforce/project-metrics"
import { daysUntil, documentStatus, documentsNeedingAction } from "@/lib/workforce/documents"
import { toast } from "@/lib/utils/toast"
import { EmployeeStatus } from "@/types/workforce"
import { ContractType, DocumentKind, type EmployeeDocument, type EmployeeDocumentInput } from "@/types/work-hr"
import { includesFilter } from "../workforce-chunks/workforce-labels"
import { formatShortDate } from "../work-projects-chunks/project-labels"
import {
  CONTRACT_TYPE_LABEL,
  DOCUMENT_FILE_TYPES,
  DOCUMENT_KIND_LABEL,
  DOCUMENT_MAX_BYTES,
  DOCUMENT_STATUS_CLASS,
  DOCUMENT_STATUS_LABEL,
} from "./hr-labels"

type Form = {
  employeeId: string
  kind: DocumentKind
  title: string
  contractType: ContractType
  startDate: string
  expiryDate: string
  fileName: string
  notes: string
}

const emptyForm = (employeeId = ""): Form => ({
  employeeId,
  kind: DocumentKind.CONTRACT,
  title: "",
  contractType: ContractType.PERMANENT,
  startDate: todayIso(),
  expiryDate: "",
  fileName: "",
  notes: "",
})

/** Contracts and HR documents of every employee, with expiry follow-up (HR-9). */
export default function DocumentsPage() {
  const t = useTranslations()
  const locale = useLocale()
  const { authedUser } = useAuthGuard()
  const canEdit = can(authedUser, AdminPermissionsPlatform.EMPLOYEES_UPDATE)
  const { data: docs = [], isLoading } = useDocuments()
  const { data: employees = [] } = useEmployees()
  const { create, update, remove } = useDocumentMutations()
  const today = todayIso()

  const staff = employees.filter((e) => e.status !== EmployeeStatus.INACTIVE)
  const nameOf = (id: string) => employees.find((e) => e.id === id)?.name ?? "—"
  const [editing, setEditing] = useState<EmployeeDocument | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<Form>(emptyForm())
  const [deleting, setDeleting] = useState<EmployeeDocument | null>(null)

  const action = useMemo(() => documentsNeedingAction(docs, staff.map((e) => e.id), today), [docs, staff, today])
  const expired = action.filter((x) => x.status === "expired").length
  const expiring = action.length - expired
  const contractsEnding = docs.filter(
    (d) => d.kind === DocumentKind.CONTRACT && d.expiryDate && daysUntil(d.expiryDate, today) >= 0 && daysUntil(d.expiryDate, today) <= 90
  ).length
  const withoutContract = staff.filter((e) => !docs.some((d) => d.employeeId === e.id && d.kind === DocumentKind.CONTRACT)).length

  const cards: MetricCardItem[] = [
    { key: "expired", title: t("docsExpired"), value: expired, valueClassName: expired ? "text-destructive" : undefined, footer: { icon: AlertTriangle, text: t("docsExpiredHint") } },
    { key: "expiring", title: t("docsExpiring"), value: expiring, valueClassName: expiring ? "text-warning-foreground" : undefined, footer: { icon: Clock, text: t("docsExpiringHint") } },
    { key: "ending", title: t("contractsEnding"), value: contractsEnding, footer: { icon: Briefcase, text: t("contractsEndingHint") } },
    { key: "missing", title: t("withoutContract"), value: withoutContract, valueClassName: withoutContract ? "text-warning-foreground" : undefined, footer: { icon: FileText, text: t("withoutContractHint") } },
  ]

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm(staff[0]?.id))
    setFormOpen(true)
  }
  const openEdit = (d: EmployeeDocument) => {
    setEditing(d)
    setForm({
      employeeId: d.employeeId,
      kind: d.kind,
      title: d.title,
      contractType: d.contractType ?? ContractType.PERMANENT,
      startDate: d.startDate ?? "",
      expiryDate: d.expiryDate ?? "",
      fileName: d.fileName ?? "",
      notes: d.notes ?? "",
    })
    setFormOpen(true)
  }
  const onFile = (file?: File) => {
    if (!file) return setForm((f) => ({ ...f, fileName: "" }))
    if (!DOCUMENT_FILE_TYPES.includes(file.type)) return toast.error(t("receiptType"))
    if (file.size > DOCUMENT_MAX_BYTES) return toast.error(t("receiptTooLarge"))
    setForm((f) => ({ ...f, fileName: file.name }))
  }
  const submit = () => {
    const input: EmployeeDocumentInput = {
      employeeId: form.employeeId,
      kind: form.kind,
      title: form.title || (form.kind === DocumentKind.CONTRACT ? t(CONTRACT_TYPE_LABEL[form.contractType]) : ""),
      contractType: form.kind === DocumentKind.CONTRACT ? form.contractType : undefined,
      startDate: form.startDate || undefined,
      expiryDate: form.expiryDate || undefined,
      fileName: form.fileName || undefined,
      notes: form.notes || undefined,
    }
    const close = { onSuccess: () => setFormOpen(false) }
    if (editing) update.mutate({ id: editing.id, input }, close)
    else create.mutate(input, close)
  }

  const columns = useMemo<ColumnDef<EmployeeDocument>[]>(
    () => [
      {
        accessorKey: "title",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("document")} />,
        cell: ({ row }) => {
          const d = row.original
          return (
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{d.title}</span>
              <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                {t(DOCUMENT_KIND_LABEL[d.kind])}
                {d.contractType && ` · ${t(CONTRACT_TYPE_LABEL[d.contractType])}`}
                {d.fileName && (
                  <>
                    {" · "}
                    <FileText className="size-3" /> {d.fileName}
                  </>
                )}
              </span>
            </span>
          )
        },
      },
      {
        id: "employee",
        accessorFn: (d) => nameOf(d.employeeId),
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("employee")} />,
        cell: ({ row }) => (
          <span className="flex items-center gap-2">
            <SpaceAvatar name={nameOf(row.original.employeeId)} size="sm" />
            <span className="truncate text-sm">{nameOf(row.original.employeeId)}</span>
          </span>
        ),
      },
      {
        id: "kind",
        accessorFn: (d) => d.kind,
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("type")} />,
        cell: ({ row }) => <span className="text-sm">{t(DOCUMENT_KIND_LABEL[row.original.kind])}</span>,
        filterFn: includesFilter,
      },
      {
        accessorKey: "startDate",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("startDate")} />,
        cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.startDate ? formatShortDate(row.original.startDate, locale) : "—"}</span>,
      },
      {
        accessorKey: "expiryDate",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("expiryDate")} />,
        cell: ({ row }) => {
          const d = row.original
          if (!d.expiryDate) return <span className="text-sm text-muted-foreground">—</span>
          const left = daysUntil(d.expiryDate, today)
          return (
            <span className="flex flex-col text-sm tabular-nums">
              {formatShortDate(d.expiryDate, locale)}
              <span className="text-xs text-muted-foreground">{left < 0 ? t("expiredDaysAgo", { count: -left }) : t("expiresInDays", { count: left })}</span>
            </span>
          )
        },
      },
      {
        id: "status",
        accessorFn: (d) => documentStatus(d, today),
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("status")} />,
        cell: ({ row }) => {
          const status = documentStatus(row.original, today)
          return <Badge variant="outline" className={DOCUMENT_STATUS_CLASS[status]}>{t(DOCUMENT_STATUS_LABEL[status])}</Badge>
        },
        filterFn: includesFilter,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">{t("actions")}</span>,
        cell: ({ row }) =>
          canEdit ? (
            <span className="flex justify-end gap-1">
              <Button variant="ghost" size="sm" aria-label={t("edit")} onClick={() => openEdit(row.original)}>
                <Pencil className="size-4" />
              </Button>
              <Button variant="ghost" size="sm" aria-label={t("delete")} onClick={() => setDeleting(row.original)}>
                <Trash2 className="size-4" />
              </Button>
            </span>
          ) : null,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, locale, employees, today, canEdit]
  )

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        actions={
          canEdit && (
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              {t("addDocument")}
            </Button>
          )
        }
      />
      <MetricCardGrid cards={cards} isLoading={isLoading} />

      {action.length > 0 && (
        <section className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
          <h2 className="text-base font-semibold">{t("docsNeedAction")}</h2>
          <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {action.slice(0, 9).map(({ doc, status, days }) => (
              <li key={doc.id} className="flex items-center gap-3 rounded-2xl border border-border p-3">
                <SpaceAvatar name={nameOf(doc.employeeId)} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{doc.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {nameOf(doc.employeeId)} · {days < 0 ? t("expiredDaysAgo", { count: -days }) : t("expiresInDays", { count: days })}
                  </p>
                </div>
                <Badge variant="outline" className={DOCUMENT_STATUS_CLASS[status]}>{t(DOCUMENT_STATUS_LABEL[status])}</Badge>
                {canEdit && (
                  <Button variant="ghost" size="sm" aria-label={t("edit")} onClick={() => openEdit(doc)}>
                    <Pencil className="size-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <DataTable
        title={t("allDocuments")}
        isLoading={isLoading}
        columns={columns}
        data={docs}
        searchColumnId="employee"
        searchPlaceholder={t("searchByEmployee")}
        emptyMessage={t("noDocuments")}
        exportFilename="documents"
        filters={[
          { columnId: "kind", title: t("type"), options: Object.values(DocumentKind).map((k) => ({ label: t(DOCUMENT_KIND_LABEL[k]), value: k })) },
          { columnId: "status", title: t("status"), options: (["expired", "expiring", "valid", "no_expiry"] as const).map((s) => ({ label: t(DOCUMENT_STATUS_LABEL[s]), value: s })) },
        ]}
      />

      <DataTableEntityFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={editing ? "edit" : "create"}
        createTitle={t("addDocument")}
        editTitle={t("editDocument")}
        description={t("documentFormHint")}
        submitLabel={{ create: t("save"), edit: t("save") }}
        isSubmitting={create.isPending || update.isPending}
        onSubmit={submit}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>{t("employee")}</Label>
            <Select value={form.employeeId} onValueChange={(v) => setForm((f) => ({ ...f, employeeId: v }))}>
              <SelectTrigger className="w-full bg-card" aria-label={t("employee")}><SelectValue>{nameOf(form.employeeId)}</SelectValue></SelectTrigger>
              <SelectContent>{staff.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>{t("type")}</Label>
              <Select value={form.kind} onValueChange={(v) => setForm((f) => ({ ...f, kind: v as DocumentKind }))}>
                <SelectTrigger className="w-full bg-card" aria-label={t("type")}><SelectValue>{t(DOCUMENT_KIND_LABEL[form.kind])}</SelectValue></SelectTrigger>
                <SelectContent>{Object.values(DocumentKind).map((k) => <SelectItem key={k} value={k}>{t(DOCUMENT_KIND_LABEL[k])}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.kind === DocumentKind.CONTRACT && (
              <div className="flex flex-col gap-2">
                <Label>{t("contractType")}</Label>
                <Select value={form.contractType} onValueChange={(v) => setForm((f) => ({ ...f, contractType: v as ContractType }))}>
                  <SelectTrigger className="w-full bg-card" aria-label={t("contractType")}><SelectValue>{t(CONTRACT_TYPE_LABEL[form.contractType])}</SelectValue></SelectTrigger>
                  <SelectContent>{Object.values(ContractType).map((c) => <SelectItem key={c} value={c}>{t(CONTRACT_TYPE_LABEL[c])}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="doc-title">{t("title")}</Label>
            <Input id="doc-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder={t("documentTitlePlaceholder")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="doc-start">{t("startDate")}</Label>
              <Input id="doc-start" type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="doc-expiry">{t("expiryDate")}</Label>
              <Input id="doc-expiry" type="date" min={form.startDate || undefined} value={form.expiryDate} onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))} />
            </div>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">{t("expiryHint")}</p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="doc-file">{t("file")}</Label>
            <Input id="doc-file" type="file" accept={DOCUMENT_FILE_TYPES.join(",")} onChange={(e) => onFile(e.target.files?.[0])} />
            <p className="text-xs text-muted-foreground">{form.fileName || t("receiptHint")}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="doc-notes">{t("notes")}</Label>
            <Textarea id="doc-notes" rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
      </DataTableEntityFormSheet>

      <ConfirmAlertDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("deleteDocument")}
        description={t("deleteDocumentConfirm", { title: deleting?.title ?? "" })}
        destructive
        isLoading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </div>
  )
}
