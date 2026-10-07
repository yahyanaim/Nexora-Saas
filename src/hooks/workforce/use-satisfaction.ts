"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { translateError } from "@/lib/errors/translate-error"
import { listSatisfactionApi, submitSatisfactionApi } from "@/lib/api/satisfaction-api"
import type { SatisfactionInput } from "@/types/work-feedback"

export function useSatisfaction() {
  const { id } = useCurrentWorkspace()
  return useQuery({ queryKey: ["satisfaction", id], queryFn: () => listSatisfactionApi(id) })
}

export function useSubmitSatisfaction() {
  const t = useTranslations()
  const { id: workspaceId } = useCurrentWorkspace()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SatisfactionInput) => submitSatisfactionApi(workspaceId, input),
    onSuccess: () => {
      toast.success(t("csatThanks"))
      queryClient.invalidateQueries({ queryKey: ["satisfaction", workspaceId] })
    },
    onError: (err) => toast.error(translateError(err, t)),
  })
}
