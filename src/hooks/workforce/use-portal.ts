"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "@/lib/utils/toast"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { decideMilestoneApi, invitePortalContactApi, listPortalAccessApi, portalInactivityDays, revokePortalAccessApi } from "@/lib/api/portal-api"
import { translateError } from "@/lib/errors/translate-error"

export function usePortalAccess() {
  const { id } = useCurrentWorkspace()
  return useQuery({ queryKey: ["portal-access", id], queryFn: () => listPortalAccessApi(id) })
}

export function usePortalInactivityDays() {
  const { id } = useCurrentWorkspace()
  return useQuery({ queryKey: ["portal-days", id], queryFn: () => portalInactivityDays(id) })
}

export function usePortalMutations() {
  const t = useTranslations()
  const { id: ws } = useCurrentWorkspace()
  const qc = useQueryClient()
  const onError = (err: unknown) => toast.error(translateError(err, t))
  const done = (message: string, keys: string[]) => () => {
    toast.success(message)
    keys.forEach((k) => qc.invalidateQueries({ queryKey: [k, ws] }))
  }
  return {
    invite: useMutation({
      mutationFn: ({ clientId, contactId }: { clientId: string; contactId: string }) => invitePortalContactApi(ws, clientId, contactId),
      onSuccess: done(t("portalInvited"), ["portal-access"]),
      onError,
    }),
    revoke: useMutation({ mutationFn: (id: string) => revokePortalAccessApi(ws, id), onSuccess: done(t("portalRevoked"), ["portal-access"]), onError }),
    decide: useMutation({
      mutationFn: (v: { clientId: string; milestoneId: string; approved: boolean; comment?: string; by: string }) =>
        decideMilestoneApi(ws, v.clientId, v.milestoneId, { approved: v.approved, comment: v.comment, by: v.by }),
      onSuccess: (_d, v) => done(v.approved ? t("portalMilestoneApproved") : t("portalChangesRequested"), ["milestones", "projects"])(),
      onError,
    }),
  }
}
