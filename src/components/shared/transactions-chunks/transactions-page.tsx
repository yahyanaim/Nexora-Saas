// app/transactions/page.tsx

"use client"

import { useMemo, useRef, useState } from "react"
import { DataTable } from "@/components/shared/data-table-chunks/data-table"
import {
  createTransactionApi,
  updateTransactionApi,
  deleteTransactionApi,
  refundTransactionApi,
} from "@/lib/api/transactions-api"
import {
  Transaction,
  TransactionStatus,
  TransactionMethod,
} from "@/types/transactions"
import { useTransactionsTable } from "@/hooks/transactions/use-transactions-table"
import { useEntityMutations } from "@/hooks/tables/use-table-entity-mutations"
import { DataTableEntityFormSheet } from "@/components/shared/data-table-chunks/data-table-entity-form-sheet"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { useTranslations } from "next-intl"
import { TransactionForm, TransactionFormHandle } from "./transaction-form"
import { getTransactionsColumns } from "./transactions-columns"
import { TransactionsSummaryCards } from "./transactions-summary-cards"
import { toast } from "@/lib/utils/toast"
import { Plus } from "lucide-react"

type PendingAction =
  | { type: "delete"; transaction: Transaction }
  | { type: "refund"; transaction: Transaction }
  | { type: "cancel"; transaction: Transaction }
  | { type: "markAsPaid"; transaction: Transaction }
  | { type: "retry"; transaction: Transaction }
  | null

export default function TransactionsPage() {
  const t = useTranslations()
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null)
  const formRef = useRef<TransactionFormHandle>(null)

  const {
    items: transactions,
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
  } = useTransactionsTable()

  const { create, isCreating, update, isUpdating, remove, isDeleting } =
    useEntityMutations({
      queryKey: "transactions",
      createFn: createTransactionApi,
      updateFn: updateTransactionApi,
      deleteFn: deleteTransactionApi,
      entityLabel: "Transaction",
    })

  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [isRefunding, setIsRefunding] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  function openCreateForm() {
    setFormMode("create")
    setEditingTransaction(null)
    setFormOpen(true)
  }

  function openEditForm(transaction: Transaction) {
    setFormMode("edit")
    setEditingTransaction(transaction)
    setFormOpen(true)
  }

  function handleFormValid(values: any) {
    if (formMode === "create") {
      create(values, { onSuccess: () => setFormOpen(false) })
    } else if (editingTransaction) {
      update(editingTransaction.id, values)
      setFormOpen(false)
    }
  }

  async function handleConfirm() {
    if (!pendingAction) return

    setIsProcessing(true)
    try {
      switch (pendingAction.type) {
        case "delete":
          remove(pendingAction.transaction.id, {
            onSuccess: () => setPendingAction(null),
          })
          break
        case "refund":
          await refundTransactionApi(pendingAction.transaction.id)
          refresh()
          setPendingAction(null)
          toast.success(t("transactionRefundedSuccess"))
          break
        case "cancel":
          await updateTransactionApi(pendingAction.transaction.id, {
            status: TransactionStatus.CANCELED,
          })
          refresh()
          setPendingAction(null)
          toast.success(t("transactionCanceledSuccess"))
          break
        case "markAsPaid":
          await updateTransactionApi(pendingAction.transaction.id, {
            status: TransactionStatus.PAID,
          })
          refresh()
          setPendingAction(null)
          toast.success(t("transactionMarkedAsPaid"))
          break
        case "retry":
          await updateTransactionApi(pendingAction.transaction.id, {
            status: TransactionStatus.PENDING,
          })
          refresh()
          setPendingAction(null)
          toast.success(t("transactionRetryInitiated"))
          break
      }
    } catch (error: any) {
      toast.error(error.message || t("actionFailed"))
    } finally {
      setIsProcessing(false)
    }
  }

  // Mark as paid handler
  const handleMarkAsPaid = (transaction: Transaction) => {
    setPendingAction({ type: "markAsPaid", transaction })
  }

  // Retry handler
  const handleRetry = (transaction: Transaction) => {
    setPendingAction({ type: "retry", transaction })
  }

  // Download receipt handler
  const handleDownloadReceipt = (transaction: Transaction) => {
    // Generate a simple receipt (you can make this more sophisticated)
    const receipt = {
      id: transaction.transactionId,
      user: transaction.user.name,
      amount: transaction.amount,
      method: transaction.method,
      date: transaction.date,
      status: transaction.status,
    }

    // Create a JSON blob and download
    const blob = new Blob([JSON.stringify(receipt, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `receipt-${transaction.transactionId}.json`
    a.click()
    URL.revokeObjectURL(url)

    toast.success(t("receiptDownloaded"))
  }

  // Print handler
  const handlePrint = (transaction: Transaction) => {
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>${t("receipt")} - ${transaction.transactionId}</title></head>
          <body>
            <h1>${t("transactionReceipt")}</h1>
            <p><strong>${t("id")}:</strong> ${transaction.transactionId}</p>
            <p><strong>${t("user")}:</strong> ${transaction.user.name}</p>
            <p><strong>${t("amount")}:</strong> $${transaction.amount.toFixed(2)}</p>
            <p><strong>${t("method")}:</strong> ${t(transaction.method.toLowerCase())}</p>
            <p><strong>${t("status")}:</strong> ${t(transaction.status.toLowerCase())}</p>
            <p><strong>${t("date")}:</strong> ${new Date(transaction.date).toLocaleString()}</p>
            <p><strong>${t("description")}:</strong> ${transaction.description || t("notAvailable")}</p>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const columns = useMemo(
    () =>
      getTransactionsColumns(
        {
          onView: (txn) => openEditForm(txn),
          onEdit: (txn) => openEditForm(txn),
          onDelete: (txn) =>
            setPendingAction({ type: "delete", transaction: txn }),
          onRefund: (txn) =>
            setPendingAction({ type: "refund", transaction: txn }),
          onCancel: (txn) =>
            setPendingAction({ type: "cancel", transaction: txn }),
          onMarkAsPaid: handleMarkAsPaid,
          onRetry: handleRetry,
          onDownloadReceipt: handleDownloadReceipt,
          onPrint: handlePrint,
        },
        t
      ),
    [t]
  )

  const confirmConfig = useMemo(() => {
    if (!pendingAction) return null
    const name = pendingAction.transaction.user.name

    switch (pendingAction.type) {
      case "delete":
        return {
          title: t("deleteTransaction"),
          description: t("deleteTransactionConfirmation", { name }),
          confirmLabel: t("delete"),
          destructive: true,
          isLoading: isDeleting || isProcessing,
        }
      case "refund":
        return {
          title: t("refundTransaction"),
          description: t("refundTransactionConfirmation", { name }),
          confirmLabel: t("refund"),
          destructive: false,
          isLoading: isRefunding || isProcessing,
        }
      case "cancel":
        return {
          title: t("cancelTransaction"),
          description: t("cancelTransactionConfirmation", { name }),
          confirmLabel: t("cancel"),
          destructive: true,
          isLoading: isProcessing,
        }
      case "markAsPaid":
        return {
          title: t("markAsPaid"),
          description: t("markAsPaidConfirmation", { name }),
          confirmLabel: t("confirm"),
          destructive: false,
          isLoading: isProcessing,
        }
      case "retry":
        return {
          title: t("retryTransaction"),
          description: t("retryTransactionConfirmation", { name }),
          confirmLabel: t("retry"),
          destructive: false,
          isLoading: isProcessing,
        }
    }
  }, [pendingAction, isDeleting, isRefunding, isProcessing, t])

  const getDefaultValues = (transaction: Transaction | null) => {
    if (!transaction) return undefined

    return {
      user: transaction.user.id,
      amount: String(transaction.amount),
      method: transaction.method,
      status: transaction.status,
      description: transaction.description || "",
      reference: transaction.reference || "",
    }
  }

  return (
    <>
      <TransactionsSummaryCards transactions={transactions} />
      <DataTable
        manual
        title={t("transactions")}
        isLoading={isLoading}
        isFetching={isFetching}
        columns={columns}
        data={transactions}
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
        searchPlaceholder={t("searchTransactions")}
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
              { label: t("paid"), value: TransactionStatus.PAID },
              { label: t("pending"), value: TransactionStatus.PENDING },
              { label: t("failed"), value: TransactionStatus.FAILED },
              { label: t("refunded"), value: TransactionStatus.REFUNDED },
              { label: t("canceled"), value: TransactionStatus.CANCELED },
            ],
          },
          {
            columnId: "method",
            title: t("method"),
            options: Object.values(TransactionMethod).map((method) => ({
              label: t(method.toLowerCase()),
              value: method,
            })),
          },
        ]}
      />

      <DataTableEntityFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        createTitle={t("addTransaction")}
        editTitle={t("editTransaction")}
        description={
          formMode === "create"
            ? t("createNewTransaction")
            : t("updateTransactionDetails")
        }
        isSubmitting={isCreating || isUpdating}
        onSubmit={() => formRef.current?.submit()}
      >
        <TransactionForm
          ref={formRef}
          mode={formMode}
          defaultValues={getDefaultValues(editingTransaction)}
          onValid={handleFormValid}
        />
      </DataTableEntityFormSheet>

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
