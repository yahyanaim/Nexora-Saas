"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "@/lib/utils/toast"
import { translateError } from "@/lib/errors/translate-error"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import {
  activeSessionForWorkspaceApi,
  agentReplyApi,
  assignSupportApi,
  createSupportRequestApi,
  customerReplyApi,
  decideSessionApi,
  endSessionApi,
  listCompanySupportApi,
  listSupportRequestsApi,
  listSupportSessionsApi,
  ownerApproveSessionApi,
  recordSessionPageApi,
  requestSessionApi,
  setSupportStatusApi,
} from "@/lib/api/platform-support-api"
import type { ConsoleActor } from "@/lib/api/platform-console-api"
import type { SupportCategory, SupportPriority, SupportStatus } from "@/types/platform-support"
import { useConsoleActor } from "./use-platform-console"

const K = (...rest: string[]) => ["platform", "support", ...rest]

export const useSupportRequests = () => useQuery({ queryKey: K("requests"), queryFn: listSupportRequestsApi })
// sessions expire on their own, so the lists refresh every minute
export const useSupportSessions = () => useQuery({ queryKey: K("sessions"), queryFn: listSupportSessionsApi, refetchInterval: 60_000 })
export const useCompanySupport = (workspaceId: string) => useQuery({ queryKey: K("company", workspaceId), queryFn: () => listCompanySupportApi(workspaceId), refetchInterval: 60_000 })
export const useActiveSupportSession = (workspaceId: string) => useQuery({ queryKey: K("active", workspaceId), queryFn: () => activeSessionForWorkspaceApi(workspaceId), refetchInterval: 60_000 })

/** The signed-in company user, as the person behind customer-side actions. */
export function useSupportPerson() {
  const { authedUser } = useAuthGuard()
  const u = authedUser as { name?: string; email?: string } | undefined
  return u?.email ? { name: u.name ?? u.email, email: u.email } : null
}

/** One support action: refresh every platform list (requests, sessions, audit) and toast the outcome. */
function useSupportAction<V, R>(fn: (v: V) => Promise<R>, success?: string | ((v: V) => string)) {
  const t = useTranslations()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (_r, v) => {
      queryClient.invalidateQueries({ queryKey: ["platform"] })
      if (success) toast.success(t(typeof success === "string" ? success : success(v)))
    },
    onError: (err) => toast.error(translateError(err, t)),
  })
}

/** Console side: answer, assign and ask for access (SUP-02, SUP-03, SUP-08). */
export function useSupportDeskMutations() {
  const actor = useConsoleActor()
  const as = <V, R>(fn: (a: ConsoleActor, v: V) => Promise<R>) => (v: V) => {
    if (!actor) throw new Error("Your console role does not allow this")
    return fn(actor, v)
  }
  return {
    reply: useSupportAction(as((a, v: { id: string; text: string; waitForCustomer: boolean }) => agentReplyApi(a, v.id, v)), "supReplied"),
    assign: useSupportAction(as((a, v: { id: string; staff: { id: string; name: string } }) => assignSupportApi(a, v.id, v.staff)), "supAssigned"),
    setStatus: useSupportAction(as((a, v: { id: string; status: SupportStatus }) => setSupportStatusApi(a, v.id, v.status)), "supStatusSaved"),
    requestSession: useSupportAction(as((a, v: { customerId: string; requestId?: string; reason: string; scope: "read" | "write"; minutes: number }) => requestSessionApi(a, v)), "sesRequested"),
    ownerApprove: useSupportAction(as((a, id: string) => ownerApproveSessionApi(a, id)), "sesOwnerApproved"),
    end: useSupportAction(as((a, id: string) => endSessionApi({ actor: a }, id)), "sesEnded"),
    recordPage: useSupportAction(as((a, v: { sessionId: string; path: string }) => recordSessionPageApi(a, v.sessionId, v.path))),
  }
}

/** Company side: raise and follow requests, answer access requests (SUP-01, SUP-04, SUP-06). */
export function useCompanySupportMutations(workspaceId: string) {
  const person = useSupportPerson()
  const as = <V, R>(fn: (p: { name: string; email: string }, v: V) => Promise<R>) => (v: V) => {
    if (!person) throw new Error("Your console role does not allow this")
    return fn(person, v)
  }
  return {
    create: useSupportAction(as((p, v: { subject: string; category: SupportCategory; priority: SupportPriority; text: string }) => createSupportRequestApi(p, workspaceId, v)), "helpSent"),
    reply: useSupportAction(as((p, v: { id: string; text: string }) => customerReplyApi(p, v.id, v.text)), "supReplied"),
    decide: useSupportAction(as((p, v: { id: string; approve: boolean }) => decideSessionApi(p, v.id, v.approve)), (v) => (v.approve ? "sesApproved" : "sesRefused")),
    revoke: useSupportAction(as((p, id: string) => endSessionApi({ customer: p }, id)), "sesRevoked"),
  }
}
