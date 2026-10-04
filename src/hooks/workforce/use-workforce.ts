"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "@/lib/utils/toast"
import { useCurrentWorkspace } from "@/store/workspace-store"
import {
  changeRateApi,
  createEmployeeApi,
  deleteEmployeeApi,
  listDepartmentsApi,
  listEmployeesApi,
  updateEmployeeApi,
} from "@/lib/api/employees-api"
import {
  createClientApi,
  deleteClientApi,
  listClientsApi,
  updateClientApi,
} from "@/lib/api/clients-api"
import type { ClientInput, EmployeeInput, RateChange } from "@/types/workforce"

export function useEmployees() {
  const { id } = useCurrentWorkspace()
  return useQuery({ queryKey: ["employees", id], queryFn: () => listEmployeesApi(id) })
}

export function useDepartments() {
  const { id } = useCurrentWorkspace()
  return useQuery({ queryKey: ["departments", id], queryFn: () => listDepartmentsApi(id) })
}

export function useClients() {
  const { id } = useCurrentWorkspace()
  return useQuery({ queryKey: ["clients", id], queryFn: () => listClientsApi(id) })
}

/**
 * Create / update / delete for one workspace collection, with toasts and a
 * refetch of that collection afterwards.
 */
function useCollectionMutations<TInput>(
  key: string,
  fns: {
    create: (workspaceId: string, input: TInput) => Promise<unknown>
    update: (workspaceId: string, id: string, input: Partial<TInput>) => Promise<unknown>
    remove: (workspaceId: string, id: string) => Promise<void>
  },
  labels: { created: string; updated: string; deleted: string }
) {
  const t = useTranslations()
  const { id: workspaceId } = useCurrentWorkspace()
  const queryClient = useQueryClient()

  const onSuccess = (message: string) => () => {
    toast.success(message)
    queryClient.invalidateQueries({ queryKey: [key, workspaceId] })
  }
  const onError = (err: unknown) =>
    toast.error(err instanceof Error && err.message ? err.message : t("somethingWentWrong"))

  const create = useMutation({
    mutationFn: (input: TInput) => fns.create(workspaceId, input),
    onSuccess: onSuccess(labels.created),
    onError,
  })
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<TInput> }) =>
      fns.update(workspaceId, id, input),
    onSuccess: onSuccess(labels.updated),
    onError,
  })
  const remove = useMutation({
    mutationFn: (id: string) => fns.remove(workspaceId, id),
    onSuccess: onSuccess(labels.deleted),
    onError,
  })

  return { create, update, remove }
}

export function useEmployeeMutations() {
  const t = useTranslations()
  return useCollectionMutations<EmployeeInput>(
    "employees",
    { create: createEmployeeApi, update: updateEmployeeApi, remove: deleteEmployeeApi },
    { created: t("employeeCreated"), updated: t("employeeUpdated"), deleted: t("employeeDeleted") }
  )
}

/** Records an effective-dated rate change for one employee (HR-3). */
export function useRateChange() {
  const t = useTranslations()
  const { id: workspaceId } = useCurrentWorkspace()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, change }: { id: string; change: RateChange }) => changeRateApi(workspaceId, id, change),
    onSuccess: () => {
      toast.success(t("ratesUpdated"))
      queryClient.invalidateQueries({ queryKey: ["employees", workspaceId] })
    },
    onError: (err: unknown) => toast.error(err instanceof Error && err.message ? err.message : t("somethingWentWrong")),
  })
}

export function useClientMutations() {
  const t = useTranslations()
  return useCollectionMutations<ClientInput>(
    "clients",
    { create: createClientApi, update: updateClientApi, remove: deleteClientApi },
    { created: t("clientCreated"), updated: t("clientUpdated"), deleted: t("clientDeleted") }
  )
}
