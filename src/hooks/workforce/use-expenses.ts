"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "@/lib/utils/toast"
import { useCurrentWorkspace } from "@/store/workspace-store"
import {
  deleteExpenseApi,
  listExpensesApi,
  reimburseExpenseApi,
  reviewExpenseApi,
  submitExpenseApi,
} from "@/lib/api/expenses-api"
import type { ExpenseInput } from "@/types/work-costs"

export function useExpenses() {
  const { id } = useCurrentWorkspace()
  return useQuery({ queryKey: ["expenses", id], queryFn: () => listExpensesApi(id) })
}

export function useExpenseMutations() {
  const t = useTranslations()
  const { id: workspaceId } = useCurrentWorkspace()
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["expenses", workspaceId] })
  const done = (message: string) => () => {
    toast.success(message)
    refresh()
  }
  const onError = (err: unknown) =>
    toast.error(err instanceof Error && err.message ? err.message : t("somethingWentWrong"))

  const submit = useMutation({
    mutationFn: (input: ExpenseInput) => submitExpenseApi(workspaceId, input),
    onSuccess: done(t("expenseSubmitted")),
    onError,
  })
  const review = useMutation({
    mutationFn: ({ id, approved, reason }: { id: string; approved: boolean; reason?: string }) =>
      reviewExpenseApi(workspaceId, id, approved, reason),
    onSuccess: (_x, { approved }) => done(approved ? t("expenseApproved") : t("expenseRejected"))(),
    onError,
  })
  const reimburse = useMutation({
    mutationFn: (id: string) => reimburseExpenseApi(workspaceId, id),
    onSuccess: done(t("expenseReimbursed")),
    onError,
  })
  const remove = useMutation({
    mutationFn: (id: string) => deleteExpenseApi(workspaceId, id),
    onSuccess: done(t("expenseDeleted")),
    onError,
  })
  return { submit, review, reimburse, remove }
}
