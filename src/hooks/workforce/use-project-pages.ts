"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { deleteProjectPageApi, listProjectPagesApi, saveProjectPageApi, setProjectPageBodyApi, setProjectPagePinnedApi } from "@/lib/api/project-pages-api"
import type { ProjectPageInput } from "@/types/work-projects"
import { translateError } from "@/lib/errors/translate-error"
import { toast } from "@/lib/utils/toast"

/** A project's wiki pages and meeting notes (P5). */
/** Every page of the workspace, for the search */
export function useAllProjectPages() {
  const { id } = useCurrentWorkspace()
  return useQuery({ queryKey: ["project-pages", id, "all"], queryFn: () => listProjectPagesApi(id) })
}

export function useProjectPages(projectId: string) {
  const { id } = useCurrentWorkspace()
  return useQuery({ queryKey: ["project-pages", id, projectId], queryFn: () => listProjectPagesApi(id, projectId) })
}

export function useProjectPageMutations(projectId: string) {
  const t = useTranslations()
  const { id: ws } = useCurrentWorkspace()
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: ["project-pages", ws, projectId] })
  const onError = (err: unknown) => toast.error(translateError(err, t))
  return {
    save: useMutation({
      mutationFn: ({ input, id }: { input: ProjectPageInput; id?: string }) => saveProjectPageApi(ws, input, id),
      onSuccess: () => {
        toast.success(t("pgSaved"))
        refresh()
      },
      onError,
    }),
    setBody: useMutation({ mutationFn: ({ id, body }: { id: string; body: string }) => setProjectPageBodyApi(ws, id, body), onSuccess: refresh, onError }),
    pin: useMutation({ mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) => setProjectPagePinnedApi(ws, id, pinned), onSuccess: refresh, onError }),
    remove: useMutation({
      mutationFn: (id: string) => deleteProjectPageApi(ws, id),
      onSuccess: () => {
        toast.success(t("pgDeleted"))
        refresh()
      },
      onError,
    }),
  }
}
