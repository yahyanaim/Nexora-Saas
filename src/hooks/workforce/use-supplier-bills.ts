"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { translateError } from "@/lib/errors/translate-error"
import { approverRef } from "@/lib/workforce/approvals"
import {
  createSupplierBillApi,
  deleteSupplierBillApi,
  listSupplierBillsApi,
  paySupplierBillApi,
  reviewSupplierBillApi,
  updateSupplierBillApi,
} from "@/lib/api/supplier-bills-api"
import type { SupplierBillInput, SupplierBillPayment } from "@/types/work-purchases"
import { useApprover } from "./use-current-employee"

export function useSupplierBills() {
  const { id } = useCurrentWorkspace()
  return useQuery({ queryKey: ["supplier-bills", id], queryFn: () => listSupplierBillsApi(id) })
}

/** Bill actions as the signed-in person, with toasts and a refresh. */
export function useSupplierBillMutations() {
  const t = useTranslations()
  const { id: workspaceId } = useCurrentWorkspace()
  const queryClient = useQueryClient()
  const approver = useApprover()
  const done = (message: string) => () => {
    toast.success(message)
    queryClient.invalidateQueries({ queryKey: ["supplier-bills", workspaceId] })
  }
  const onError = (err: unknown) => toast.error(translateError(err, t))
  return {
    save: useMutation({
      mutationFn: ({ id, input }: { id?: string; input: SupplierBillInput }) =>
        id ? updateSupplierBillApi(workspaceId, id, input) : createSupplierBillApi(workspaceId, input, approverRef(approver)),
      onSuccess: done(t("billSaved")),
      onError,
    }),
    review: useMutation({
      mutationFn: ({ id, approved, reason }: { id: string; approved: boolean; reason?: string }) => reviewSupplierBillApi(workspaceId, approver, id, approved, reason),
      onSuccess: (b) => done(t(b.status === "approved" ? "billApproved" : "billRejected"))(),
      onError,
    }),
    pay: useMutation({
      mutationFn: ({ id, payment }: { id: string; payment: Omit<SupplierBillPayment, "id"> }) => paySupplierBillApi(workspaceId, id, payment),
      onSuccess: done(t("paymentRecorded")),
      onError,
    }),
    remove: useMutation({ mutationFn: (id: string) => deleteSupplierBillApi(workspaceId, id), onSuccess: done(t("billDeleted")), onError }),
  }
}
