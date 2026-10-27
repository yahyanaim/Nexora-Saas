"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { listClientHistoryApi, listDeletedClientsApi, mergeClientsApi, purgeClientApi, restoreClientApi } from "@/lib/api/clients-api"
import type { MergePicks } from "@/lib/workforce/client-history"
import { translateError } from "@/lib/errors/translate-error"
import { toast } from "@/lib/utils/toast"

/** A client's change history, newest first (CRM step 9). */
export function useClientHistory(clientId: string) {
  const { id } = useCurrentWorkspace()
  return useQuery({ queryKey: ["client-history", id, clientId], queryFn: () => listClientHistoryApi(id, clientId) })
}

/** The clients in the deleted clients bin. */
export function useDeletedClients(enabled = true) {
  const { id } = useCurrentWorkspace()
  return useQuery({ queryKey: ["clients-deleted", id], queryFn: () => listDeletedClientsApi(id), enabled })
}

/** Restore, remove for good and merge (CRM step 9). */
export function useClientSafety() {
  const t = useTranslations()
  const { id: ws } = useCurrentWorkspace()
  const qc = useQueryClient()
  const refresh = (keys: string[]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k, ws] }))
  const onError = (err: unknown) => toast.error(translateError(err, t))

  const restore = useMutation({
    mutationFn: (id: string) => restoreClientApi(ws, id),
    onSuccess: (c) => {
      toast.success(t("csRestored", { name: c.name }))
      refresh(["clients", "clients-deleted", "deals", "client-follow-ups", "client-history"])
    },
    onError,
  })
  const purge = useMutation({
    mutationFn: (id: string) => purgeClientApi(ws, id),
    onSuccess: () => {
      toast.success(t("csPurged"))
      refresh(["clients-deleted"])
    },
    onError,
  })
  const merge = useMutation({
    mutationFn: ({ keepId, otherId, picks }: { keepId: string; otherId: string; picks: MergePicks }) => mergeClientsApi(ws, keepId, otherId, picks),
    onSuccess: (c) => {
      toast.success(t("csMerged", { name: c.name }))
      // deals, invoices, projects, quotes… all point at the kept client now
      qc.invalidateQueries()
    },
    onError,
  })
  return { restore, purge, merge }
}
