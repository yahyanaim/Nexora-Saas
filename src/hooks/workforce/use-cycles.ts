"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "@/lib/utils/toast"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { closeCycleApi, deleteCycleApi, listCyclesApi, saveCycleApi } from "@/lib/api/cycles-api"
import type { CycleInput } from "@/types/work-projects"
import { translateError } from "@/lib/errors/translate-error"

/** A project's cycles (P4), in date order. */
export function useCycles(projectId?: string) {
  const { id } = useCurrentWorkspace()
  return useQuery({ queryKey: ["cycles", id, projectId ?? "all"], queryFn: () => listCyclesApi(id, projectId) })
}

export function useCycleMutations() {
  const t = useTranslations()
  const { id: ws } = useCurrentWorkspace()
  const qc = useQueryClient()
  const onError = (err: unknown) => toast.error(translateError(err, t))
  // Closing and deleting move tasks, so the task lists refresh too
  const refresh = (message?: string) => () => {
    if (message) toast.success(message)
    for (const k of ["cycles", "tasks", "task-activity"]) qc.invalidateQueries({ queryKey: [k, ws] })
  }
  return {
    save: useMutation({ mutationFn: (v: { input: CycleInput; id?: string }) => saveCycleApi(ws, v.input, v.id), onSuccess: refresh(t("cySaved")), onError }),
    remove: useMutation({ mutationFn: (id: string) => deleteCycleApi(ws, id), onSuccess: refresh(t("cyDeleted")), onError }),
    close: useMutation({
      mutationFn: (v: { id: string; carryTo: "next" | "backlog" }) => closeCycleApi(ws, v.id, v.carryTo),
      onSuccess: (r) => refresh(r.next ? t("cyClosedMoved", { name: r.next.name }) : t("cyClosed"))(),
      onError,
    }),
  }
}
