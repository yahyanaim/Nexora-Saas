"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "@/lib/utils/toast"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { cancelLeaveApi, decideLeaveApi, listLeaveApi, requestLeaveApi } from "@/lib/api/leave-api"
import type { LeaveRequestInput } from "@/types/work-planning"
import { useApprover } from "@/hooks/workforce/use-current-employee"
import { translateError } from "@/lib/errors/translate-error"

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
    toast.error(translateError(err, t))

  const request = useMutation({
    mutationFn: (input: LeaveRequestInput) => requestLeaveApi(workspaceId, input),
    onSuccess: () => {
      toast.success(t("leaveRequested"))
      refresh()
    },
    onError,
  })
  const approver = useApprover()
  const decide = useMutation({
    mutationFn: ({ id, approved, note }: { id: string; approved: boolean; note?: string }) =>
      decideLeaveApi(workspaceId, approver, id, approved, note),
    onSuccess: (r, { approved }) => {
      toast.success(!approved ? t("leaveDeclined") : r.status === "pending" ? t("approvalFirstStep") : t("leaveApproved"))
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
