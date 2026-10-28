"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { addClientFileApi, listClientFilesApi, removeClientFileApi, setClientFileCategoryApi } from "@/lib/api/client-files-api"
import type { ClientFile, ClientFileCategory } from "@/types/work-crm"
import { translateError } from "@/lib/errors/translate-error"
import { toast } from "@/lib/utils/toast"

/** A client's files, newest first (CRM step 10). */
export function useClientFiles(clientId: string) {
  const { id } = useCurrentWorkspace()
  return useQuery({ queryKey: ["client-files", id, clientId], queryFn: () => listClientFilesApi(id, clientId) })
}

export function useClientFileMutations(clientId: string) {
  const t = useTranslations()
  const { id: ws } = useCurrentWorkspace()
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: ["client-files", ws, clientId] })
  const onError = (err: unknown) => toast.error(translateError(err, t))
  return {
    add: useMutation({
      mutationFn: ({ file, category }: { file: Pick<ClientFile, "name" | "type" | "size" | "dataUrl">; category: ClientFileCategory }) => addClientFileApi(ws, clientId, file, category),
      onSuccess: (f) => {
        toast.success(t("cfAdded", { name: f.name }))
        refresh()
      },
      onError,
    }),
    setCategory: useMutation({ mutationFn: ({ id, category }: { id: string; category: ClientFileCategory }) => setClientFileCategoryApi(ws, id, category), onSuccess: refresh, onError }),
    remove: useMutation({
      mutationFn: (id: string) => removeClientFileApi(ws, id),
      onSuccess: () => {
        toast.success(t("cfRemoved"))
        refresh()
      },
      onError,
    }),
  }
}
