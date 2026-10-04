"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "@/lib/utils/toast"
import { useCurrentWorkspace } from "@/store/workspace-store"
import {
  addTaskCommentApi,
  deleteTaskCommentApi,
  listTaskActivityApi,
  listTaskCommentsApi,
} from "@/lib/api/task-collab-api"
import { setHealthOverrideApi } from "@/lib/api/work-projects-api"
import type { Employee } from "@/types/workforce"
import type { ProjectHealth } from "@/types/work-projects"

export function useTaskComments(taskId: string) {
  const { id } = useCurrentWorkspace()
  return useQuery({ queryKey: ["task-comments", id, taskId], queryFn: () => listTaskCommentsApi(id, taskId) })
}

export function useTaskActivity(taskId: string) {
  const { id } = useCurrentWorkspace()
  return useQuery({ queryKey: ["task-activity", id, taskId], queryFn: () => listTaskActivityApi(id, taskId) })
}

function useOnError() {
  const t = useTranslations()
  return (err: unknown) => toast.error(err instanceof Error && err.message ? err.message : t("somethingWentWrong"))
}

export function useTaskCommentMutations(taskId: string) {
  const { id: workspaceId } = useCurrentWorkspace()
  const queryClient = useQueryClient()
  const onError = useOnError()
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["task-comments", workspaceId, taskId] })
  return {
    add: useMutation({
      mutationFn: ({ body, people }: { body: string; people: Pick<Employee, "id" | "name">[] }) =>
        addTaskCommentApi(workspaceId, taskId, body, people),
      onSuccess: refresh,
      onError,
    }),
    remove: useMutation({ mutationFn: (id: string) => deleteTaskCommentApi(workspaceId, id), onSuccess: refresh, onError }),
  }
}

export function useHealthOverride(projectId: string) {
  const t = useTranslations()
  const { id: workspaceId } = useCurrentWorkspace()
  const queryClient = useQueryClient()
  const onError = useOnError()
  return useMutation({
    mutationFn: (override: { health: ProjectHealth; reason: string } | null) => setHealthOverrideApi(workspaceId, projectId, override),
    onSuccess: () => {
      toast.success(t("healthUpdated"))
      queryClient.invalidateQueries({ queryKey: ["projects", workspaceId] })
    },
    onError,
  })
}
