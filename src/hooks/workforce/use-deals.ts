"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { translateError } from "@/lib/errors/translate-error"
import { deleteDealApi, listDealsApi, moveDealApi, saveDealApi } from "@/lib/api/deals-api"
import type { DealInput, DealStage } from "@/types/work-sales"

export function useDeals() {
  const { id } = useCurrentWorkspace()
  return useQuery({ queryKey: ["deals", id], queryFn: () => listDealsApi(id) })
}

export function useDealMutations() {
  const t = useTranslations()
  const { id: workspaceId } = useCurrentWorkspace()
  const queryClient = useQueryClient()
  const done = (message: string) => () => {
    toast.success(message)
    queryClient.invalidateQueries({ queryKey: ["deals", workspaceId] })
  }
  const onError = (err: unknown) => toast.error(translateError(err, t))
  return {
    save: useMutation({ mutationFn: ({ id, input }: { id?: string; input: DealInput }) => saveDealApi(workspaceId, input, id), onSuccess: done(t("dealSaved")), onError }),
    move: useMutation({ mutationFn: ({ id, stage, lostReason }: { id: string; stage: DealStage; lostReason?: string }) => moveDealApi(workspaceId, id, stage, lostReason), onSuccess: done(t("dealMoved")), onError }),
    remove: useMutation({ mutationFn: (id: string) => deleteDealApi(workspaceId, id), onSuccess: done(t("dealDeleted")), onError }),
  }
}
