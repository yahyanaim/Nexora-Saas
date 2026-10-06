"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "@/lib/utils/toast"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { createDocumentApi, deleteDocumentApi, listDocumentsApi, updateDocumentApi } from "@/lib/api/documents-api"
import type { EmployeeDocumentInput } from "@/types/work-hr"
import { translateError } from "@/lib/errors/translate-error"

export function useDocuments() {
  const { id } = useCurrentWorkspace()
  return useQuery({ queryKey: ["documents", id], queryFn: () => listDocumentsApi(id) })
}

export function useDocumentMutations() {
  const t = useTranslations()
  const { id: workspaceId } = useCurrentWorkspace()
  const queryClient = useQueryClient()
  const done = (message: string) => () => {
    toast.success(message)
    queryClient.invalidateQueries({ queryKey: ["documents", workspaceId] })
  }
  const onError = (err: unknown) => toast.error(translateError(err, t))

  const create = useMutation({ mutationFn: (input: EmployeeDocumentInput) => createDocumentApi(workspaceId, input), onSuccess: done(t("documentSaved")), onError })
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: EmployeeDocumentInput }) => updateDocumentApi(workspaceId, id, input),
    onSuccess: done(t("documentSaved")),
    onError,
  })
  const remove = useMutation({ mutationFn: (id: string) => deleteDocumentApi(workspaceId, id), onSuccess: done(t("documentDeleted")), onError })
  return { create, update, remove }
}
