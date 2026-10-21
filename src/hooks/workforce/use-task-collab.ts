"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "@/lib/utils/toast"
import { useCurrentWorkspace } from "@/store/workspace-store"
import {
  addTaskAttachmentApi,
  addTaskCommentApi,
  deleteTaskCommentApi,
  listTaskActivityApi,
  listTaskAttachmentsApi,
  listTaskCommentsApi,
  removeTaskAttachmentApi,
} from "@/lib/api/task-collab-api"
import { setHealthOverrideApi } from "@/lib/api/work-projects-api"
import type { Employee } from "@/types/workforce"
import type { ProjectHealth, TaskAttachment } from "@/types/work-projects"
import { translateError } from "@/lib/errors/translate-error"

export function useTaskComments(taskId: string) {
  const { id } = useCurrentWorkspace()
  return useQuery({ queryKey: ["task-comments", id, taskId], queryFn: () => listTaskCommentsApi(id, taskId) })
}

export function useTaskActivity(taskId: string) {
  const { id } = useCurrentWorkspace()
  return useQuery({ queryKey: ["task-activity", id, taskId], queryFn: () => listTaskActivityApi(id, taskId) })
}

export function useTaskAttachments(taskId: string) {
  const { id } = useCurrentWorkspace()
  return useQuery({ queryKey: ["task-attachments", id, taskId], queryFn: () => listTaskAttachmentsApi(id, taskId) })
}

/** Attach files to a task and remove them (P1). */
export function useTaskAttachmentMutations(taskId: string) {
  const { id: workspaceId } = useCurrentWorkspace()
  const queryClient = useQueryClient()
  const onError = useOnError()
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["task-attachments", workspaceId, taskId] })
    queryClient.invalidateQueries({ queryKey: ["task-activity", workspaceId, taskId] })
  }
  return {
    add: useMutation({ mutationFn: (file: Pick<TaskAttachment, "name" | "type" | "size" | "dataUrl">) => addTaskAttachmentApi(workspaceId, taskId, file), onSuccess: refresh, onError }),
    remove: useMutation({ mutationFn: (id: string) => removeTaskAttachmentApi(workspaceId, id), onSuccess: refresh, onError }),
  }
}

function useOnError() {
  const t = useTranslations()
  return (err: unknown) => toast.error(translateError(err, t))
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
