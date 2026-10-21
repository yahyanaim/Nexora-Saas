"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "@/lib/utils/toast"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { deleteTaskViewApi, listTaskViewsApi, saveTaskViewApi, setTaskViewSharedApi, type ViewOwner } from "@/lib/api/task-views-api"
import type { TaskViewInput } from "@/types/work-projects"
import { translateError } from "@/lib/errors/translate-error"

/** A project's saved task views for this person (P2). */
export function useTaskViews(projectId: string, userId: string) {
  const { id } = useCurrentWorkspace()
  return useQuery({ queryKey: ["task-views", id, projectId, userId], queryFn: () => listTaskViewsApi(id, projectId, userId) })
}

export function useTaskViewMutations(owner: ViewOwner, canManage: boolean) {
  const t = useTranslations()
  const { id: workspaceId } = useCurrentWorkspace()
  const queryClient = useQueryClient()
  const onError = (err: unknown) => toast.error(translateError(err, t))
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["task-views", workspaceId] })
  return {
    save: useMutation({
      mutationFn: (input: TaskViewInput) => saveTaskViewApi(workspaceId, input, owner),
      onSuccess: (v) => {
        toast.success(t("vwSaved", { name: v.name }))
        refresh()
      },
      onError,
    }),
    share: useMutation({ mutationFn: ({ id, shared }: { id: string; shared: boolean }) => setTaskViewSharedApi(workspaceId, id, shared, owner.id), onSuccess: refresh, onError }),
    remove: useMutation({ mutationFn: (id: string) => deleteTaskViewApi(workspaceId, id, owner.id, canManage), onSuccess: refresh, onError }),
  }
}
