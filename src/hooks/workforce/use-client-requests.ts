"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "@/lib/utils/toast"
import { useCurrentWorkspace } from "@/store/workspace-store"
import {
  acceptClientRequestApi,
  createClientRequestApi,
  listClientRequestsApi,
  markRequestDuplicateApi,
  rejectClientRequestApi,
  reopenClientRequestApi,
  snoozeClientRequestApi,
} from "@/lib/api/client-requests-api"
import type { AcceptRequestInput, ClientRequestInput } from "@/types/work-requests"
import { translateError } from "@/lib/errors/translate-error"

/** Client requests (P3): all of them for the team, one client's in its portal. */
export function useClientRequests(clientId?: string) {
  const { id } = useCurrentWorkspace()
  return useQuery({ queryKey: ["client-requests", id, clientId ?? "all"], queryFn: () => listClientRequestsApi(id, clientId) })
}

export function useClientRequestMutations() {
  const t = useTranslations()
  const { id: ws } = useCurrentWorkspace()
  const qc = useQueryClient()
  const onError = (err: unknown) => toast.error(translateError(err, t))
  // Accepting makes a task and maybe a change order, so those lists refresh too
  const done = (message: string, keys: string[] = []) => () => {
    toast.success(message)
    for (const k of ["client-requests", ...keys]) qc.invalidateQueries({ queryKey: [k, ws] })
  }
  return {
    create: useMutation({
      mutationFn: (v: { clientId: string; input: ClientRequestInput; by: string; team?: boolean }) => createClientRequestApi(ws, v.clientId, v.input, { name: v.by, team: v.team }),
      onSuccess: (r) => done(t("rqSent", { number: r.number }))(),
      onError,
    }),
    accept: useMutation({
      mutationFn: (v: { id: string; input: AcceptRequestInput }) => acceptClientRequestApi(ws, v.id, v.input),
      onSuccess: (r) => done(r.changeOrderId ? t("rqAcceptedWithChange") : t("rqAccepted"), ["tasks", "change-orders", "task-activity"])(),
      onError,
    }),
    reject: useMutation({ mutationFn: (v: { id: string; reason: string }) => rejectClientRequestApi(ws, v.id, v.reason), onSuccess: done(t("rqDeclined")), onError }),
    snooze: useMutation({ mutationFn: (v: { id: string; until: string }) => snoozeClientRequestApi(ws, v.id, v.until), onSuccess: done(t("rqSnoozed")), onError }),
    duplicate: useMutation({ mutationFn: (v: { id: string; taskId: string }) => markRequestDuplicateApi(ws, v.id, v.taskId), onSuccess: done(t("rqMarkedDuplicate")), onError }),
    reopen: useMutation({ mutationFn: (id: string) => reopenClientRequestApi(ws, id), onSuccess: done(t("rqReopened")), onError }),
  }
}
