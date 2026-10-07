"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "@/lib/utils/toast"
import { translateError } from "@/lib/errors/translate-error"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import {
  changeStaffRoleApi,
  findStaffByEmailApi,
  inviteStaffApi,
  listAuditApi,
  listSessionsApi,
  listStaffApi,
  recordAuditExportApi,
  removeStaffApi,
  resendInviteApi,
  revokeSessionApi,
  type ConsoleActor,
} from "@/lib/api/platform-console-api"
import {
  activateCustomerApi,
  addCustomerNoteApi,
  cancelCustomerApi,
  createTrialApi,
  extendTrialApi,
  liftCustomerSuspensionApi,
  liftUserSuspensionApi,
  listCustomersApi,
  listDirectoryApi,
  listUserSuspensionsApi,
  sendPasswordResetApi,
  suspendCustomerApi,
  suspendUserApi,
  undoCancellationApi,
  type DirectoryUser,
} from "@/lib/api/platform-customers-api"
import type { ConsoleRole } from "@/types/platform-console"
import type { NexoraPlanId } from "@/lib/platform/nexora-catalog"

const KEYS = {
  staff: ["platform", "staff"], sessions: ["platform", "sessions"], audit: ["platform", "audit"], me: ["platform", "me"],
  customers: ["platform", "customers"], directory: ["platform", "directory"], suspensions: ["platform", "suspensions"],
}

/** The signed-in team member and their console role (UX-01), or null for anyone else. */
export function useConsoleActor() {
  const { authedUser } = useAuthGuard()
  const email = (authedUser as { email?: string } | undefined)?.email
  const { data } = useQuery({ queryKey: [...KEYS.me, email], queryFn: () => findStaffByEmailApi(email), enabled: !!email })
  const actor: ConsoleActor | null = data ? { id: data.id, name: data.name, role: data.role, sessionId: "ses_1" } : null
  return actor
}

export const useConsoleStaff = () => useQuery({ queryKey: KEYS.staff, queryFn: listStaffApi })
export const useConsoleSessions = () => useQuery({ queryKey: KEYS.sessions, queryFn: listSessionsApi, refetchInterval: 60_000 })
export const useConsoleAudit = () => useQuery({ queryKey: KEYS.audit, queryFn: listAuditApi })
export const useConsoleCustomers = () => useQuery({ queryKey: KEYS.customers, queryFn: listCustomersApi })
export const useConsoleDirectory = () => useQuery({ queryKey: KEYS.directory, queryFn: listDirectoryApi })
export const useUserSuspensions = () => useQuery({ queryKey: KEYS.suspensions, queryFn: listUserSuspensionsApi })

export function useConsoleMutations() {
  const t = useTranslations()
  const queryClient = useQueryClient()
  const actor = useConsoleActor()
  const refresh = () => {
    for (const key of Object.values(KEYS)) queryClient.invalidateQueries({ queryKey: key })
  }
  const useAction = <V, R>(fn: (actor: ConsoleActor, vars: V) => Promise<R>, success: string) =>
    useMutation({
      mutationFn: (vars: V) => {
        if (!actor) throw new Error("Your console role does not allow this")
        return fn(actor, vars)
      },
      onSuccess: () => {
        refresh()
        toast.success(t(success))
      },
      onError: (err) => toast.error(translateError(err, t)),
    })
  return {
    invite: useAction((a, v: { name: string; email: string; role: ConsoleRole }) => inviteStaffApi(a, v), "stfInvited"),
    resend: useAction((a, id: string) => resendInviteApi(a, id), "stfInviteResent"),
    changeRole: useAction((a, v: { id: string; role: ConsoleRole }) => changeStaffRoleApi(a, v.id, v.role), "stfRoleChanged"),
    remove: useAction((a, id: string) => removeStaffApi(a, id), "stfRemoved"),
    revoke: useAction((a, id: string) => revokeSessionApi(a, id), "sesRevoked"),
    recordExport: useAction((a, rows: number) => recordAuditExportApi(a, rows), "audExported"),
    createTrial: useAction((a, v: { name: string; city: string; country: string; ice?: string; plan: NexoraPlanId; adminName: string; adminEmail: string }) => createTrialApi(a, v), "cuTrialCreated"),
    extendTrial: useAction((a, id: string) => extendTrialApi(a, id), "cuTrialExtended"),
    activate: useAction((a, id: string) => activateCustomerApi(a, id), "cuActivated"),
    suspendCustomer: useAction((a, v: { id: string; reason: string; until?: string }) => suspendCustomerApi(a, v.id, v), "cuSuspended"),
    liftCustomer: useAction((a, id: string) => liftCustomerSuspensionApi(a, id), "cuLifted"),
    cancel: useAction((a, id: string) => cancelCustomerApi(a, id), "cuCancelled"),
    undoCancel: useAction((a, id: string) => undoCancellationApi(a, id), "cuCancelUndone"),
    addNote: useAction((a, v: { id: string; text: string }) => addCustomerNoteApi(a, v.id, v.text), "cuNoteAdded"),
    passwordReset: useAction((a, u: DirectoryUser) => sendPasswordResetApi(a, u), "usrResetSent"),
    suspendUser: useAction((a, v: { user: DirectoryUser; reason: string; until?: string }) => suspendUserApi(a, v.user, v), "usrSuspendedToast"),
    liftUser: useAction((a, id: string) => liftUserSuspensionApi(a, id), "usrLifted"),
  }
}
