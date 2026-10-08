"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "@/lib/utils/toast"
import { translateError } from "@/lib/errors/translate-error"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import {
  approveDeletionApi,
  downloadExportApi,
  fulfilExportApi,
  getRetentionApi,
  listDataRequestsApi,
  prepareDeletionApi,
  refuseDataRequestApi,
  requestDataExportApi,
  requestDeletionApi,
  updateRetentionApi,
} from "@/lib/api/platform-data-api"
import type { ConsoleActor } from "@/lib/api/platform-console-api"
import { downloadText } from "@/lib/platform/nx-ubl"
import { useConsoleActor } from "./use-platform-console"

const K = ["platform", "data"]

export const useDataRequests = () => useQuery({ queryKey: [...K, "requests"], queryFn: listDataRequestsApi })
export const useRetention = () => useQuery({ queryKey: [...K, "retention"], queryFn: getRetentionApi })

const save = (file: { filename: string; json: string }) => downloadText(file.json, file.filename, "application/json")

/** The team's side of data requests (AUD-04, AUD-05) and retention (AUD-06). */
export function useDataRequestMutations() {
  const t = useTranslations()
  const queryClient = useQueryClient()
  const actor = useConsoleActor()
  const useAction = <V, R>(fn: (a: ConsoleActor, v: V) => Promise<R>, success: string, after?: (r: R) => void) =>
    useMutation({
      mutationFn: (v: V) => {
        if (!actor) throw new Error("Your console role does not allow this")
        return fn(actor, v)
      },
      onSuccess: (r) => {
        void queryClient.invalidateQueries({ queryKey: ["platform"] })
        after?.(r)
        toast.success(t(success))
      },
      onError: (err) => toast.error(translateError(err, t)),
    })
  return {
    fulfil: useAction((a, id: string) => fulfilExportApi(a, id), "drFulfilled"),
    download: useAction((a, id: string) => downloadExportApi({ actor: a }, id), "drDownloaded", save),
    prepare: useAction((a, id: string) => prepareDeletionApi(a, id), "drPrepared"),
    approve: useAction((a, id: string) => approveDeletionApi(a, id), "drDeleted"),
    refuse: useAction((a, v: { id: string; reason: string }) => refuseDataRequestApi(a, v.id, v.reason), "drRefused"),
    retention: useAction((a, auditYears: number) => updateRetentionApi(a, { auditYears }), "drRetentionSaved"),
  }
}

/** The company's side, from My subscription: its administrator asks and downloads. */
export function useCompanyDataRequests() {
  const t = useTranslations()
  const queryClient = useQueryClient()
  const { authedUser } = useAuthGuard()
  const person = { name: authedUser?.name ?? "", email: (authedUser as { email?: string } | undefined)?.email ?? "" }
  const done = (key: string) => () => {
    void queryClient.invalidateQueries({ queryKey: ["platform"] })
    toast.success(t(key))
  }
  const onError = (err: unknown) => toast.error(translateError(err, t))
  return {
    askExport: useMutation({ mutationFn: (customerId: string) => requestDataExportApi(person, customerId), onSuccess: done("drAsked"), onError }),
    askDeletion: useMutation({ mutationFn: (v: { customerId: string; reason: string }) => requestDeletionApi(person, v.customerId, v.reason), onSuccess: done("drDeletionAsked"), onError }),
    download: useMutation({ mutationFn: (id: string) => downloadExportApi({ person }, id), onSuccess: (f) => { save(f); done("drDownloaded")() }, onError }),
  }
}
