"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "@/lib/utils/toast"
import { setCompanyTimeZone } from "@/lib/workforce/project-metrics"
import { useCurrentWorkspace, useWorkspaceStore } from "@/store/workspace-store"
import {
  createDepartmentApi,
  deleteDepartmentApi,
  getSettingsApi,
  renameDepartmentApi,
  updateApprovalsApi,
  updateCompanyApi,
  updateHolidaysApi,
  updatePeriodLockApi,
  updateListsApi,
  updateCustomFieldsApi,
  updateAccountsApi,
  updateOverheadsApi,
  updateOwnerEmployeeApi,
} from "@/lib/api/settings-api"
import type { AccountKey, ApprovalRule, CompanySettings, CustomFieldDef, Holiday, OverheadItem, WorkspaceSettings } from "@/types/work-settings"
import { translateError } from "@/lib/errors/translate-error"

export function useWorkspaceSettings() {
  const { id } = useCurrentWorkspace()
  return useQuery({
    queryKey: ["settings", id],
    queryFn: async () => {
      const settings = await getSettingsApi(id)
      // Business dates follow the company's time zone (M2)
      setCompanyTimeZone(settings.company.timeZone)
      // Screens format money in the company's base currency (MAD for Morocco)
      useWorkspaceStore.getState().setCurrency(id, settings.company.baseCurrency)
      return settings
    },
  })
}

type Lists = Pick<WorkspaceSettings, "leaveTypes" | "expenseCategories" | "taskLabels" | "receiptRequiredAbove">

export function useSettingsMutations() {
  const t = useTranslations()
  const { id: workspaceId } = useCurrentWorkspace()
  const queryClient = useQueryClient()
  const onError = (err: unknown) =>
    toast.error(translateError(err, t))
  const saved = (data: WorkspaceSettings) => {
    setCompanyTimeZone(data.company.timeZone)
    useWorkspaceStore.getState().setCurrency(workspaceId, data.company.baseCurrency)
    queryClient.setQueryData(["settings", workspaceId], data)
    toast.success(t("settingsSaved"))
  }
  const refreshDepartments = () => queryClient.invalidateQueries({ queryKey: ["departments", workspaceId] })

  return {
    company: useMutation({ mutationFn: (c: CompanySettings) => updateCompanyApi(workspaceId, c), onSuccess: saved, onError }),
    approvals: useMutation({ mutationFn: (a: ApprovalRule[]) => updateApprovalsApi(workspaceId, a), onSuccess: saved, onError }),
    holidays: useMutation({ mutationFn: (h: Holiday[]) => updateHolidaysApi(workspaceId, h), onSuccess: saved, onError }),
    periodLock: useMutation({ mutationFn: (date: string | null) => updatePeriodLockApi(workspaceId, date), onSuccess: saved, onError }),
    lists: useMutation({ mutationFn: (l: Lists) => updateListsApi(workspaceId, l), onSuccess: saved, onError }),
    ownerEmployee: useMutation({ mutationFn: (id: string | null) => updateOwnerEmployeeApi(workspaceId, id), onSuccess: saved, onError }),
    overheads: useMutation({ mutationFn: (o: OverheadItem[]) => updateOverheadsApi(workspaceId, o), onSuccess: saved, onError }),
    customFields: useMutation({ mutationFn: (f: CustomFieldDef[]) => updateCustomFieldsApi(workspaceId, f), onSuccess: saved, onError }),
    accounts: useMutation({ mutationFn: (a: Partial<Record<AccountKey, string>>) => updateAccountsApi(workspaceId, a), onSuccess: saved, onError }),
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
