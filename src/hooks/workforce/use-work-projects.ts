"use client"

import { createProjectFromTemplateApi, listTemplatesApi, saveProjectAsTemplateApi } from "@/lib/api/project-templates-api"
import type { CloseSnapshot } from "@/types/work-projects"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "@/lib/utils/toast"
import { useCurrentWorkspace } from "@/store/workspace-store"
import {
  createMilestoneApi,
  createProjectApi,
  closeProjectApi,
  reopenProjectApi,
  createTaskApi,
  deleteMilestoneApi,
  deleteProjectApi,
  deleteTaskApi,
  getProjectApi,
  listMilestonesApi,
  listProjectsApi,
  listTasksApi,
  moveTaskApi,
  setMilestoneApprovalApi,
  updateMilestoneApi,
  updateProjectApi,
  updateTaskApi,
} from "@/lib/api/work-projects-api"
import type {
  MilestoneInput,
  TaskStatus,
  WorkProjectInput,
  WorkTask,
  WorkTaskInput,
} from "@/types/work-projects"
import { translateError } from "@/lib/errors/translate-error"

export function useProjects() {
  const { id } = useCurrentWorkspace()
  return useQuery({ queryKey: ["projects", id], queryFn: () => listProjectsApi(id) })
}

export function useProject(projectId: string) {
  const { id } = useCurrentWorkspace()
  return useQuery({ queryKey: ["projects", id, projectId], queryFn: () => getProjectApi(id, projectId) })
}

/** All tasks of the workspace, or of one project. */
export function useTasks(projectId?: string) {
  const { id } = useCurrentWorkspace()
  return useQuery({
    queryKey: ["tasks", id, projectId ?? "all"],
    queryFn: () => listTasksApi(id, projectId),
  })
}

export function useMilestones(projectId?: string) {
  const { id } = useCurrentWorkspace()
  return useQuery({
    queryKey: ["milestones", id, projectId ?? "all"],
    queryFn: () => listMilestonesApi(id, projectId),
  })
}

function useHelpers() {
  const t = useTranslations()
  const { id: workspaceId } = useCurrentWorkspace()
  const queryClient = useQueryClient()
  const refresh = (...keys: string[]) => {
    for (const key of keys) queryClient.invalidateQueries({ queryKey: [key, workspaceId] })
  }
  const onError = (err: unknown) =>
    toast.error(translateError(err, t))
  return { t, workspaceId, queryClient, refresh, onError }
}

export function useProjectMutations() {
  const { t, workspaceId, refresh, onError } = useHelpers()

  const create = useMutation({
    mutationFn: (input: WorkProjectInput) => createProjectApi(workspaceId, input),
    onSuccess: () => {
      toast.success(t("projectCreated"))
      refresh("projects")
    },
    onError,
  })
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<WorkProjectInput> }) =>
      updateProjectApi(workspaceId, id, input),
    onSuccess: () => {
      toast.success(t("projectUpdated"))
      refresh("projects", "tasks")
    },
    onError,
  })
  const remove = useMutation({
    mutationFn: (id: string) => deleteProjectApi(workspaceId, id),
    onSuccess: () => {
      toast.success(t("projectDeleted"))
      refresh("projects", "tasks", "milestones")
    },
    onError,
  })
  const close = useMutation({
    mutationFn: ({ id, snapshot }: { id: string; snapshot: Omit<CloseSnapshot, "closedAt" | "closedBy"> }) => closeProjectApi(workspaceId, id, snapshot),
    onSuccess: () => {
      toast.success(t("projectClosed"))
      refresh("projects")
    },
    onError,
  })
  const reopen = useMutation({
    mutationFn: (id: string) => reopenProjectApi(workspaceId, id),
    onSuccess: () => {
      toast.success(t("projectReopened"))
      refresh("projects")
    },
    onError,
  })
  const saveTemplate = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => saveProjectAsTemplateApi(workspaceId, id, name),
    onSuccess: () => {
      toast.success(t("templateSaved"))
      refresh("project-templates")
    },
    onError,
  })
  const createFromTemplate = useMutation({
    mutationFn: ({ templateId, input }: { templateId: string; input: WorkProjectInput }) => createProjectFromTemplateApi(workspaceId, templateId, input),
    onSuccess: () => {
      toast.success(t("projectCreated"))
      refresh("projects", "tasks", "milestones")
    },
    onError,
  })
  return { create, update, remove, close, reopen, saveTemplate, createFromTemplate }
}

export function useProjectTemplates() {
  const { id } = useCurrentWorkspace()
  return useQuery({ queryKey: ["project-templates", id], queryFn: () => listTemplatesApi(id) })
}

export function useTaskMutations() {
  const { t, workspaceId, queryClient, refresh, onError } = useHelpers()

  const create = useMutation({
    mutationFn: (input: WorkTaskInput) => createTaskApi(workspaceId, input),
    onSuccess: () => {
      toast.success(t("taskCreated"))
      refresh("tasks", "task-activity")
    },
    onError,
  })
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<WorkTaskInput> }) =>
      updateTaskApi(workspaceId, id, input),
    onSuccess: () => refresh("tasks", "task-activity"),
    onError,
  })

  // Board moves update the cached lists first so the card lands instantly
  const move = useMutation({
    mutationFn: ({ id, status, index }: { id: string; status: TaskStatus; index?: number }) =>
      moveTaskApi(workspaceId, id, status, index),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks", workspaceId] })
      const snapshots = queryClient.getQueriesData<WorkTask[]>({ queryKey: ["tasks", workspaceId] })
      for (const [key, list] of snapshots) {
        if (list) queryClient.setQueryData(key, list.map((task) => (task.id === id ? { ...task, status } : task)))
      }
      return { snapshots }
    },
    onError: (err, _vars, context) => {
      for (const [key, list] of context?.snapshots ?? []) queryClient.setQueryData(key, list)
      onError(err)
    },
    onSettled: () => refresh("tasks", "task-activity"),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteTaskApi(workspaceId, id),
    onSuccess: () => {
      toast.success(t("taskDeleted"))
      refresh("tasks", "task-activity")
    },
    onError,
  })
  return { create, update, move, remove }
}

export function useMilestoneMutations() {
  const { t, workspaceId, refresh, onError } = useHelpers()

  const create = useMutation({
    mutationFn: (input: MilestoneInput) => createMilestoneApi(workspaceId, input),
    onSuccess: () => {
      toast.success(t("milestoneCreated"))
      refresh("milestones")
    },
    onError,
  })
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<MilestoneInput> }) =>
      updateMilestoneApi(workspaceId, id, input),
    onSuccess: () => refresh("milestones"),
    onError,
  })
  const approve = useMutation({
    mutationFn: ({ id, approved }: { id: string; approved: boolean }) =>
      setMilestoneApprovalApi(workspaceId, id, approved),
    onSuccess: (_m, { approved }) => {
      toast.success(approved ? t("milestoneApproved") : t("approvalWithdrawn"))
      refresh("milestones")
    },
    onError,
  })
  const remove = useMutation({
    mutationFn: (id: string) => deleteMilestoneApi(workspaceId, id),
    onSuccess: () => {
      toast.success(t("milestoneDeleted"))
      refresh("milestones", "tasks")
    },
    onError,
  })
  return { create, update, approve, remove }
}
