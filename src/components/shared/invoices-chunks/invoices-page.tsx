"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { DataTable } from "@/components/shared/data-table-chunks/data-table"
import {
  createInvoiceApi,
  updateInvoiceApi,
  deleteInvoiceApi,
  sendInvoiceApi,
  markAsPaidApi,
} from "@/lib/api/invoices-api"
import { Invoice, InvoiceStatus, InvoiceMethod, CreateInvoicePayload } from "@/types/invoices"
import { useInvoicesTable } from "@/hooks/invoices/use-invoices-table"
import { useEntityMutations } from "@/hooks/tables/use-table-entity-mutations"
import { DataTableEntityFormSheet } from "@/components/shared/data-table-chunks/data-table-entity-form-sheet"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { useTranslations } from "next-intl"
import { toast } from "@/lib/utils/toast"
import { InvoiceForm, InvoiceFormHandle } from "./invoice-form"
import { getInvoicesColumns } from "./invoices-columns"
import { InvoicesSummaryCards } from "./invoices-summary-cards"
import { InvoiceDialog } from "./invoice-dialog"
import { Plus } from "@/components/ui/carbon/icons"
import { generateInvoicePdf, printInvoice } from "@/lib/pdf/generate-invoice-pdf"

type PendingAction =
  | { type: "delete"; invoice: Invoice }
  | { type: "markAsPaid"; invoice: Invoice }
  | { type: "cancel"; invoice: Invoice }
  | null

export default function InvoicesPage() {
  const t = useTranslations()
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const formRef = useRef<InvoiceFormHandle>(null)

  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null)

  const {
    items: invoices,
    pageCount,
    totalItems,
    isLoading,
    isFetching,
    search,
    setSearch,
    pagination,
    setPagination,
    columnFilters,
    setColumnFilters,
    sorting,
    setSorting,
    refresh,
  } = useInvoicesTable()

  const { create, isCreating, update, isUpdating, remove, isDeleting } =
    useEntityMutations({
      queryKey: "invoices",
      createFn: createInvoiceApi,
      updateFn: updateInvoiceApi,
      deleteFn: deleteInvoiceApi,
      entityLabel: "Invoice",
    })

  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  function openCreateForm() {
    setFormMode("create")
    setEditingInvoice(null)
    setFormOpen(true)
  }

  function openEditForm(invoice: Invoice) {
    setFormMode("edit")
    setEditingInvoice(invoice)
    setFormOpen(true)
  }

  function handleFormValid(values: CreateInvoicePayload) {
    if (formMode === "create") {
      create(values, { onSuccess: () => setFormOpen(false) })
    } else if (editingInvoice) {
      update(editingInvoice.id, values)
      setFormOpen(false)
    }
  }

  const handleDownload = useCallback(async (invoice: Invoice) => {
    try {
      await generateInvoicePdf(invoice)
      toast.success(t("downloadStarted"))
    } catch (_error) {
      toast.error(t("downloadFailed"))
    }
  }, [t])

  const handleSend = useCallback(async (invoice: Invoice) => {
    try {
      await sendInvoiceApi(invoice.id)
      toast.success(t("invoiceSent"))
    } catch (_error) {
      toast.error(t("sendFailed"))
    }
  }, [t])

  async function handleMarkAsPaid(invoice: Invoice) {
    setPendingAction({ type: "markAsPaid", invoice })
  }

  const handleCancel = (invoice: Invoice) => {
    setPendingAction({ type: "cancel", invoice })
  }

  const handleDuplicate = useCallback((invoice: Invoice) => {
    const newInvoice = {
      user: invoice.user.id,
      items: invoice.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      method: invoice.method,
      taxRate: invoice.taxRate,
      dueDate: invoice.dueDate,
      notes: invoice.notes,
    }
    create(newInvoice, {
      onSuccess: () => {
        toast.success(t("invoiceDuplicated"))
        refresh()
      },
    })
  }, [create, refresh, t])

  const handlePrint = useCallback((invoice: Invoice) => {
    try {
      printInvoice(invoice)
    } catch (_error) {
      toast.error("Failed to open print preview")
    }
  }, [])

  const handleSendReminder = useCallback(async (invoice: Invoice) => {
    try {
      await sendInvoiceApi(invoice.id)
      toast.success(t("reminderSent"))
    } catch (_error) {
      toast.error(t("reminderFailed"))
    }
  }, [t])

  async function handleConfirm() {
    if (!pendingAction) return

    if (pendingAction.type === "delete") {
      remove(pendingAction.invoice.id, {
        onSuccess: () => setPendingAction(null),
      })
      return
    }

    if (pendingAction.type === "markAsPaid") {
      setIsProcessing(true)
      try {
        await markAsPaidApi(pendingAction.invoice.id)
        refresh()
        setPendingAction(null)
        toast.success(t("invoiceMarkedAsPaid"))
      } finally {
        setIsProcessing(false)
      }
      return
    }

    if (pendingAction.type === "cancel") {
      setIsProcessing(true)
      try {
        await updateInvoiceApi(pendingAction.invoice.id, {
          status: InvoiceStatus.CANCELLED,
        })
        refresh()
        setPendingAction(null)
        toast.success(t("invoiceCancelled"))
      } finally {
        setIsProcessing(false)
      }
      return
    }
  }

  const columns = useMemo(
    () =>
      getInvoicesColumns(
        {
          onView: (invoice) => {
            setPreviewInvoice(invoice)
            setPreviewOpen(true)
          },
          onEdit: openEditForm,
          onDownload: handleDownload,
          onSend: handleSend,
          onMarkAsPaid: handleMarkAsPaid,
          onDelete: (invoice) => setPendingAction({ type: "delete", invoice }),
          onDuplicate: handleDuplicate,
          onPrint: handlePrint,
          onCancel: handleCancel,
          onSendReminder: handleSendReminder,
        },
        t
      ),
    [t, handleDownload, handleSend, handleDuplicate, handlePrint, handleSendReminder]
  )

  const confirmConfig = useMemo(() => {
    if (!pendingAction) return null
    const name = pendingAction.invoice.user.name

    switch (pendingAction.type) {
      case "delete":
        return {
          title: t("deleteInvoice"),
          description: t("deleteInvoiceConfirmation", { name }),
          confirmLabel: t("delete"),
          destructive: true,
          isLoading: isDeleting,
        }
      case "markAsPaid":
        return {
          title: t("markAsPaid"),
          description: t("markAsPaidConfirmation", { name }),
          confirmLabel: t("markAsPaid"),
          destructive: false,
          isLoading: isProcessing,
        }
      case "cancel":
        return {
          title: t("cancelInvoice"),
          description: t("cancelInvoiceConfirmation", { name }),
          confirmLabel: t("cancel"),
          destructive: true,
          isLoading: isProcessing,
        }
      default:
        return null
    }
  }, [pendingAction, isDeleting, isProcessing, t])

  const getDefaultValues = (invoice: Invoice | null) => {
    if (!invoice) return undefined

    return {
      user: invoice.user.id,
      items: invoice.items,
      status: invoice.status,
      method: invoice.method,
      taxRate: invoice.taxRate,
      dueDate: invoice.dueDate,
      notes: invoice.notes,
    }
  }

  return (
    <>
      <div className="p-4 md:p-6 space-y-6">
        <InvoicesSummaryCards invoices={invoices} />

        <DataTable
          manual
          title={t("invoices")}
          isLoading={isLoading}
          isFetching={isFetching}
          columns={columns}
          data={invoices}
          rowCount={totalItems}
          pageCount={pageCount}
          pagination={pagination}
          onPaginationChange={setPagination}
          columnFilters={columnFilters}
          onColumnFiltersChange={setColumnFilters}
          sorting={sorting}
          onSortingChange={setSorting}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder={t("searchInvoices")}
          actions={[
            {
              label: t("create"),
              onClick: () => openCreateForm(),
              iconOnly: true,
              icon: Plus,
              variant: "primary",
            },
          ]}
          filters={[
            {
              columnId: "status",
              title: t("status"),
              options: [
                { label: t("paid"), value: InvoiceStatus.PAID },
                { label: t("pending"), value: InvoiceStatus.PENDING },
                { label: t("overdue"), value: InvoiceStatus.OVERDUE },
                { label: t("cancelled"), value: InvoiceStatus.CANCELLED },
                { label: t("draft"), value: InvoiceStatus.DRAFT },
              ],
            },
            {
              columnId: "method",
              title: t("method"),
              options: Object.values(InvoiceMethod).map((method) => ({
                label: t(method.toLowerCase()),
                value: method,
              })),
            },
          ]}
        />
      </div>

      <DataTableEntityFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        createTitle={t("addInvoice")}
        editTitle={t("editInvoice")}
        description={
          formMode === "create"
            ? t("createNewInvoice")
            : t("updateInvoiceDetails")
        }
        isSubmitting={isCreating || isUpdating}
        onSubmit={() => formRef.current?.submit()}
      >
        <InvoiceForm
          ref={formRef}
          mode={formMode}
          defaultValues={getDefaultValues(editingInvoice)}
          onValid={handleFormValid}
        />
      </DataTableEntityFormSheet>

      <InvoiceDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        invoice={previewInvoice}
        onDownload={handleDownload}
        onSend={handleSend}
      />

      {confirmConfig && (
        <ConfirmAlertDialog
          open={!!pendingAction}
          onOpenChange={(open) => !open && setPendingAction(null)}
          title={confirmConfig.title}
          description={confirmConfig.description}
          confirmLabel={confirmConfig.confirmLabel}
          destructive={confirmConfig.destructive}
          isLoading={confirmConfig.isLoading}
          onConfirm={handleConfirm}
        />
      )}
    </>
  )
}
