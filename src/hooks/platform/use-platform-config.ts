"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "@/lib/utils/toast"
import { translateError } from "@/lib/errors/translate-error"
import {
  createAnnouncementApi,
  endAnnouncementApi,
  flagOnForWorkspaceApi,
  getIdentityApi,
  listAnnouncementsApi,
  listFlagsApi,
  resetDemoWorkspaceApi,
  updateFlagApi,
  updateIdentityApi,
  type IdentityInput,
} from "@/lib/api/platform-config-api"
import { audit, type ConsoleActor } from "@/lib/api/platform-console-api"
import type { FeatureFlagKey } from "@/lib/platform/config-rules"
import type { NexoraPlanId } from "@/lib/platform/nexora-catalog"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { useConsoleActor } from "./use-platform-console"

const K = (...rest: string[]) => ["platform", "config", ...rest]

export const useNexoraIdentity = () => useQuery({ queryKey: K("identity"), queryFn: getIdentityApi })
export const useAnnouncements = () => useQuery({ queryKey: K("announcements"), queryFn: listAnnouncementsApi })
export const useFeatureFlags = () => useQuery({ queryKey: K("flags"), queryFn: listFlagsApi })

/** CFG-02: whether a released-gradually feature is on for the current workspace. */
export function useFeatureFlag(key: FeatureFlagKey) {
  const workspace = useCurrentWorkspace()
  const { data } = useQuery({ queryKey: K("flag", key, workspace.id), queryFn: () => flagOnForWorkspaceApi(key, workspace.id) })
  return data ?? false
}

function useConfigAction<V, R>(fn: (a: ConsoleActor, v: V) => Promise<R>, success: string | ((r: R) => string)) {
  const t = useTranslations()
  const queryClient = useQueryClient()
  const actor = useConsoleActor()
  return useMutation({
    mutationFn: (v: V) => {
      if (!actor) throw new Error("Your console role does not allow this")
      return fn(actor, v)
    },
    onSuccess: (r) => {
      // a demo reset touches every list of that workspace, not only the console's
      queryClient.invalidateQueries()
      toast.success(typeof success === "string" ? t(success) : success(r))
    },
    onError: (err) => toast.error(translateError(err, t)),
  })
}

export function useConfigMutations() {
  const t = useTranslations()
  return {
    identity: useConfigAction((a, v: IdentityInput) => updateIdentityApi(a, v), "cfgIdentitySaved"),
    announce: useConfigAction((a, v: { title: string; message: string; plans: NexoraPlanId[]; countries: string[]; from: string; to: string }) => createAnnouncementApi(a, v), "annCreated"),
    endAnnouncement: useConfigAction((a, id: string) => endAnnouncementApi(a, id), "annEnded"),
    flag: useConfigAction((a, v: { key: FeatureFlagKey; enabled: boolean; plans: NexoraPlanId[]; customerIds: string[] }) => updateFlagApi(a, v.key, v), "ffSaved"),
    resetDemo: useConfigAction((a, customerId: string) => resetDemoWorkspaceApi(a, customerId), (n) => t("demoResetDone", { n })),
  }
}

/** AUD-07: exporting the metrics is itself audited. */
export function useMetricsExportAudit() {
  const actor = useConsoleActor()
  const queryClient = useQueryClient()
  return (format: string, period: string) => {
    if (!actor) return
    audit(actor, "metrics.exported", "metrics", `Metrics · ${format}`, { after: period })
    queryClient.invalidateQueries({ queryKey: ["platform", "audit"] })
  }
}
