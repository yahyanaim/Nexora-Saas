"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "@/lib/utils/toast"
import { useCurrentWorkspace } from "@/store/workspace-store"
import {
  addHoursApi,
  approveTimeEntriesApi,
  copyPreviousWeekApi,
  reopenTimeEntriesApi,
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
import { discardTimerApi, getTimerApi, startTimerApi, stopTimerApi, type RunningTimer } from "@/lib/api/timer-api"

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
    // Invoices also re-bill (and release) expenses
    queryClient.invalidateQueries({ queryKey: ["expenses", workspaceId] })
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
  const reopen = useMutation({
    mutationFn: ({ ids, reason }: { ids: string[]; reason: string }) => reopenTimeEntriesApi(workspaceId, ids, reason),
    onSuccess: (count) => {
      toast.success(t("hoursReopened", { count }))
      refresh()
    },
    onError,
  })
  const copyWeek = useMutation({
    mutationFn: ({ employeeId, monday }: { employeeId: string; monday: string }) => copyPreviousWeekApi(workspaceId, employeeId, monday),
    onSuccess: (count) => {
      toast.success(t("hoursCopied", { count }))
      refresh()
    },
    onError,
  })
  const addHours = useMutation({
    mutationFn: (cell: TimesheetCell) => addHoursApi(workspaceId, cell),
    onSuccess: (_e, cell) => {
      toast.success(t("hoursLogged", { hours: cell.hours }))
      refresh()
    },
    onError,
  })
  return { setCell, clearRow, submit, approve, reject, reopen, copyWeek, addHours }
}

/** The person's running timer, if any (TIM-2). */
export function useTimer(employeeId: string) {
  const { id } = useCurrentWorkspace()
  return useQuery({ queryKey: ["timer", id, employeeId], queryFn: () => getTimerApi(id, employeeId), enabled: !!employeeId })
}

export function useTimerMutations(employeeId: string) {
  const { t, workspaceId, refresh, onError } = useHelpers()
  const queryClient = useQueryClient()
  const refreshTimer = () => queryClient.invalidateQueries({ queryKey: ["timer", workspaceId, employeeId] })
  return {
    start: useMutation({
      mutationFn: (timer: Omit<RunningTimer, "startedAt" | "employeeId">) => startTimerApi(workspaceId, { ...timer, employeeId }),
      onSuccess: () => {
        refreshTimer()
        refresh()
      },
      onError,
    }),
    stop: useMutation({
      mutationFn: () => stopTimerApi(workspaceId, employeeId),
      onSuccess: (entry) => {
        toast.success(t("timerLogged", { hours: entry?.hours ?? 0 }))
        refreshTimer()
        refresh()
      },
      onError,
    }),
    discard: useMutation({ mutationFn: () => discardTimerApi(workspaceId, employeeId), onSuccess: refreshTimer, onError }),
  }
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
