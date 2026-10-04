"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "@/lib/utils/toast"
import { useCurrentWorkspace } from "@/store/workspace-store"
import {
  createDepartmentApi,
  deleteDepartmentApi,
  getSettingsApi,
  renameDepartmentApi,
  updateApprovalsApi,
  updateCompanyApi,
  updateHolidaysApi,
  updateListsApi,
} from "@/lib/api/settings-api"
import type { ApprovalRule, CompanySettings, Holiday, WorkspaceSettings } from "@/types/work-settings"

export function useWorkspaceSettings() {
  const { id } = useCurrentWorkspace()
  return useQuery({ queryKey: ["settings", id], queryFn: () => getSettingsApi(id) })
}

type Lists = Pick<WorkspaceSettings, "leaveTypes" | "expenseCategories" | "taskLabels" | "receiptRequiredAbove">

export function useSettingsMutations() {
  const t = useTranslations()
  const { id: workspaceId } = useCurrentWorkspace()
  const queryClient = useQueryClient()
  const onError = (err: unknown) =>
    toast.error(err instanceof Error && err.message ? err.message : t("somethingWentWrong"))
  const saved = (data: WorkspaceSettings) => {
    queryClient.setQueryData(["settings", workspaceId], data)
    toast.success(t("settingsSaved"))
  }
  const refreshDepartments = () => queryClient.invalidateQueries({ queryKey: ["departments", workspaceId] })

  return {
    company: useMutation({ mutationFn: (c: CompanySettings) => updateCompanyApi(workspaceId, c), onSuccess: saved, onError }),
    approvals: useMutation({ mutationFn: (a: ApprovalRule[]) => updateApprovalsApi(workspaceId, a), onSuccess: saved, onError }),
    holidays: useMutation({ mutationFn: (h: Holiday[]) => updateHolidaysApi(workspaceId, h), onSuccess: saved, onError }),
    lists: useMutation({ mutationFn: (l: Lists) => updateListsApi(workspaceId, l), onSuccess: saved, onError }),
    createDepartment: useMutation({
      mutationFn: (name: string) => createDepartmentApi(workspaceId, name),
      onSuccess: refreshDepartments,
      onError,
    }),
    renameDepartment: useMutation({
      mutationFn: ({ id, name }: { id: string; name: string }) => renameDepartmentApi(workspaceId, id, name),
      onSuccess: refreshDepartments,
      onError,
    }),
    deleteDepartment: useMutation({
      mutationFn: ({ id, used }: { id: string; used: (string | undefined)[] }) => deleteDepartmentApi(workspaceId, id, used),
      onSuccess: refreshDepartments,
      onError,
    }),
  }
}
