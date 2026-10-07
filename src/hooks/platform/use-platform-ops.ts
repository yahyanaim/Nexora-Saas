"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "@/lib/utils/toast"
import { translateError } from "@/lib/errors/translate-error"
import {
  createIncidentApi,
  listBackupsApi,
  listHealthApi,
  listIncidentsApi,
  listTenantErrorsApi,
  noticesForWorkspaceApi,
  notifyIncidentApi,
  resolveIncidentApi,
  restoreServiceApi,
  runRestoreTestApi,
  scheduleMaintenanceApi,
  simulateOutageApi,
  updateIncidentApi,
  updateMaintenanceApi,
} from "@/lib/api/platform-ops-api"
import type { ConsoleActor } from "@/lib/api/platform-console-api"
import type { IncidentSeverity, IncidentStatus, MaintenanceStatus, ServiceId } from "@/types/platform-ops"
import { useConsoleActor } from "./use-platform-console"

const K = (...rest: string[]) => ["platform", "ops", ...rest]

// monitoring refreshes the tiles every minute
export const useServiceHealth = () => useQuery({ queryKey: K("health"), queryFn: listHealthApi, refetchInterval: 60_000 })
export const useTenantErrors = () => useQuery({ queryKey: K("tenants"), queryFn: listTenantErrorsApi })
export const useIncidents = () => useQuery({ queryKey: K("incidents"), queryFn: listIncidentsApi })
export const useBackups = () => useQuery({ queryKey: K("backups"), queryFn: listBackupsApi })
export const usePlatformNotices = (workspaceId: string) => useQuery({ queryKey: K("notices", workspaceId), queryFn: () => noticesForWorkspaceApi(workspaceId), refetchInterval: 60_000 })

function useOpsAction<V, R>(fn: (a: ConsoleActor, v: V) => Promise<R>, success: string) {
  const t = useTranslations()
  const queryClient = useQueryClient()
  const actor = useConsoleActor()
  return useMutation({
    mutationFn: (v: V) => {
      if (!actor) throw new Error("Your console role does not allow this")
      return fn(actor, v)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform"] })
      toast.success(t(success))
    },
    onError: (err) => toast.error(translateError(err, t)),
  })
}

/** Health, incident and maintenance actions (INC-01 to INC-07). */
export function useOpsMutations() {
  return {
    simulate: useOpsAction((a, v: { service: ServiceId; state: "degraded" | "down" }) => simulateOutageApi(a, v.service, v.state), "opsSimulated"),
    restore: useOpsAction((a, service: ServiceId) => restoreServiceApi(a, service), "opsRestored"),
    create: useOpsAction((a, v: { title: string; severity: IncidentSeverity; services: ServiceId[]; customerIds: string[]; text: string }) => createIncidentApi(a, v), "incCreated"),
    update: useOpsAction((a, v: { id: string; text: string; status?: IncidentStatus; severity?: IncidentSeverity; customerIds?: string[] }) => updateIncidentApi(a, v.id, v), "incUpdated"),
    notify: useOpsAction((a, v: { id: string; notice: string }) => notifyIncidentApi(a, v.id, v.notice), "incNotified"),
    resolve: useOpsAction((a, v: { id: string; resolution: string; postmortem?: string }) => resolveIncidentApi(a, v.id, v), "incResolvedToast"),
    schedule: useOpsAction((a, v: { title: string; services: ServiceId[]; customerIds: string[]; plannedStart: string; plannedEnd: string; notice: string }) => scheduleMaintenanceApi(a, v), "mntScheduled"),
    updateMaintenance: useOpsAction((a, v: { id: string; status: Exclude<MaintenanceStatus, "scheduled">; text: string }) => updateMaintenanceApi(a, v.id, v.status, v.text), "mntUpdated"),
    restoreTest: useOpsAction((a) => runRestoreTestApi(a), "bkRestoreDone"),
  }
}
