"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "@/lib/utils/toast"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { cancelLeaveApi, decideLeaveApi, listLeaveApi, requestLeaveApi } from "@/lib/api/leave-api"
import type { LeaveRequestInput } from "@/types/work-planning"

export function useLeave() {
  const { id } = useCurrentWorkspace()
  return useQuery({ queryKey: ["leave", id], queryFn: () => listLeaveApi(id) })
}

export function useLeaveMutations() {
  const t = useTranslations()
  const { id: workspaceId } = useCurrentWorkspace()
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["leave", workspaceId] })
  const onError = (err: unknown) =>
    toast.error(err instanceof Error && err.message ? err.message : t("somethingWentWrong"))

  const request = useMutation({
    mutationFn: (input: LeaveRequestInput) => requestLeaveApi(workspaceId, input),
    onSuccess: () => {
      toast.success(t("leaveRequested"))
      refresh()
    },
    onError,
  })
  const decide = useMutation({
    mutationFn: ({ id, approved, note }: { id: string; approved: boolean; note?: string }) =>
      decideLeaveApi(workspaceId, id, approved, note),
    onSuccess: (_r, { approved }) => {
      toast.success(approved ? t("leaveApproved") : t("leaveDeclined"))
      refresh()
    },
    onError,
  })
  const cancel = useMutation({
    mutationFn: (id: string) => cancelLeaveApi(workspaceId, id),
    onSuccess: () => {
      toast.success(t("leaveCancelled"))
      refresh()
    },
    onError,
  })
  return { request, decide, cancel }
}
