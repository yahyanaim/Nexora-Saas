"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "@/lib/utils/toast"
import { useCurrentWorkspace } from "@/store/workspace-store"
import {
  approveTimeEntriesApi,
  clearTimesheetRowApi,
  createInvoiceFromHoursApi,
  deleteInvoiceDraftApi,
  listClientInvoicesApi,
  listTimeEntriesApi,
  markInvoicePaidApi,
  markInvoiceSentApi,
  rejectTimeEntriesApi,
  setTimesheetCellApi,
  submitTimesheetApi,
  updateInvoiceDraftApi,
  voidInvoiceApi,
  type TimesheetCell,
} from "@/lib/api/work-billing-api"
import type { ClientInvoice } from "@/types/work-billing"

export function useTimeEntries() {
  const { id } = useCurrentWorkspace()
  return useQuery({ queryKey: ["time-entries", id], queryFn: () => listTimeEntriesApi(id) })
}

export function useClientInvoices() {
  const { id } = useCurrentWorkspace()
  return useQuery({ queryKey: ["client-invoices", id], queryFn: () => listClientInvoicesApi(id) })
}

function useHelpers() {
  const t = useTranslations()
  const { id: workspaceId } = useCurrentWorkspace()
  const queryClient = useQueryClient()
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["time-entries", workspaceId] })
    queryClient.invalidateQueries({ queryKey: ["client-invoices", workspaceId] })
  }
  const onError = (err: unknown) =>
    toast.error(err instanceof Error && err.message ? err.message : t("somethingWentWrong"))
  return { t, workspaceId, refresh, onError }
}

export function useTimesheetMutations() {
  const { t, workspaceId, refresh, onError } = useHelpers()

  const setCell = useMutation({
    mutationFn: (cell: TimesheetCell) => setTimesheetCellApi(workspaceId, cell),
    onSuccess: refresh,
    onError: (err) => {
      onError(err)
      refresh()
    },
  })
  const clearRow = useMutation({
    mutationFn: (row: Parameters<typeof clearTimesheetRowApi>[1]) => clearTimesheetRowApi(workspaceId, row),
    onSuccess: refresh,
    onError,
  })
  const submit = useMutation({
    mutationFn: ({ employeeId, from, to }: { employeeId: string; from: string; to: string }) =>
      submitTimesheetApi(workspaceId, employeeId, from, to),
    onSuccess: (count) => {
      toast.success(t("hoursSubmitted", { count }))
      refresh()
    },
    onError,
  })
  const approve = useMutation({
    mutationFn: (ids: string[]) => approveTimeEntriesApi(workspaceId, ids),
    onSuccess: (count) => {
      toast.success(t("hoursApproved", { count }))
      refresh()
    },
    onError,
  })
  const reject = useMutation({
    mutationFn: ({ ids, reason }: { ids: string[]; reason: string }) => rejectTimeEntriesApi(workspaceId, ids, reason),
    onSuccess: (count) => {
      toast.success(t("hoursRejected", { count }))
      refresh()
    },
    onError,
  })
  return { setCell, clearRow, submit, approve, reject }
}

export function useInvoiceMutations() {
  const { t, workspaceId, refresh, onError } = useHelpers()
  const done = (message: string) => () => {
    toast.success(message)
    refresh()
  }

  const createFromHours = useMutation({
    mutationFn: (input: Parameters<typeof createInvoiceFromHoursApi>[1]) => createInvoiceFromHoursApi(workspaceId, input),
    onSuccess: done(t("invoiceDrafted")),
    onError,
  })
  const updateDraft = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<Pick<ClientInvoice, "taxRate" | "notes" | "issueDate" | "dueDate" | "lines">> }) =>
      updateInvoiceDraftApi(workspaceId, id, input),
    onSuccess: done(t("invoiceSaved")),
    onError,
  })
  const markSent = useMutation({
    mutationFn: (id: string) => markInvoiceSentApi(workspaceId, id),
    onSuccess: done(t("invoiceMarkedSent")),
    onError,
  })
  const markPaid = useMutation({
    mutationFn: (id: string) => markInvoicePaidApi(workspaceId, id),
    onSuccess: done(t("invoiceMarkedPaid")),
    onError,
  })
  const voidInvoice = useMutation({
    mutationFn: (id: string) => voidInvoiceApi(workspaceId, id),
    onSuccess: done(t("invoiceVoided")),
    onError,
  })
  const deleteDraft = useMutation({
    mutationFn: (id: string) => deleteInvoiceDraftApi(workspaceId, id),
    onSuccess: done(t("invoiceDeleted")),
    onError,
  })
  return { createFromHours, updateDraft, markSent, markPaid, voidInvoice, deleteDraft }
}
