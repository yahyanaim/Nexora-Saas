"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { translateError } from "@/lib/errors/translate-error"
import { decideChangeOrderApi, deleteChangeOrderApi, listChangeOrdersApi, saveChangeOrderApi, sendChangeOrderApi } from "@/lib/api/change-orders-api"
import type { ChangeOrderInput } from "@/types/work-projects"

export function useChangeOrders(projectId?: string) {
  const { id } = useCurrentWorkspace()
  return useQuery({ queryKey: ["change-orders", id, projectId ?? "all"], queryFn: () => listChangeOrdersApi(id, projectId) })
}

export function useChangeOrderMutations() {
  const t = useTranslations()
  const { id: workspaceId } = useCurrentWorkspace()
  const queryClient = useQueryClient()
  const done = (message: string) => () => {
    toast.success(message)
    queryClient.invalidateQueries({ queryKey: ["change-orders", workspaceId] })
  }
  const onError = (err: unknown) => toast.error(translateError(err, t))
  return {
    save: useMutation({ mutationFn: ({ id, input }: { id?: string; input: ChangeOrderInput }) => saveChangeOrderApi(workspaceId, input, id), onSuccess: done(t("coSaved")), onError }),
    send: useMutation({ mutationFn: (id: string) => sendChangeOrderApi(workspaceId, id), onSuccess: done(t("coSent")), onError }),
    decide: useMutation({
      mutationFn: ({ id, approved, by, reason }: { id: string; approved: boolean; by: string; reason?: string }) => decideChangeOrderApi(workspaceId, id, approved, by, reason),
      onSuccess: (o) => done(t(o.status === "approved" ? "coApproved" : "coRejected"))(),
      onError,
    }),
    remove: useMutation({ mutationFn: (id: string) => deleteChangeOrderApi(workspaceId, id), onSuccess: done(t("coDeleted")), onError }),
  }
}
