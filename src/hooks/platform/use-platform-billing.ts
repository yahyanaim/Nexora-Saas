"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "@/lib/utils/toast"
import { translateError } from "@/lib/errors/translate-error"
import {
  approveRefundApi,
  assignTransferApi,
  changePlanApi,
  createPlanVersionApi,
  issueCreditNoteApi,
  listCreditNotesApi,
  listDunningApi,
  listInvoicesApi,
  listPaymentsApi,
  listPlanVersionsApi,
  listRefundsApi,
  listSubscriptionsApi,
  listTaxRatesApi,
  recordTransferApi,
  runBillingJobsApi,
  startSubscriptionApi,
} from "@/lib/api/platform-billing-api"
import type { ConsoleActor } from "@/lib/api/platform-console-api"
import type { NexoraPlanId } from "@/lib/platform/nexora-catalog"
import { useConsoleActor } from "./use-platform-console"

const K = (name: string) => ["platform", "billing", name]

export const usePlanVersions = () => useQuery({ queryKey: K("versions"), queryFn: listPlanVersionsApi })
export const useNxSubscriptions = () => useQuery({ queryKey: K("subscriptions"), queryFn: listSubscriptionsApi })
export const useNxInvoices = () => useQuery({ queryKey: K("invoices"), queryFn: listInvoicesApi })
export const useNxCreditNotes = () => useQuery({ queryKey: K("credit-notes"), queryFn: listCreditNotesApi })
export const useNxPayments = () => useQuery({ queryKey: K("payments"), queryFn: listPaymentsApi })
export const useNxRefunds = () => useQuery({ queryKey: K("refunds"), queryFn: listRefundsApi })
export const useNxDunning = () => useQuery({ queryKey: K("dunning"), queryFn: listDunningApi })
export const useTaxRates = () => useQuery({ queryKey: K("taxes"), queryFn: listTaxRatesApi })

export function useBillingMutations() {
  const t = useTranslations()
  const queryClient = useQueryClient()
  const actor = useConsoleActor()
  // billing changes customers, audit and every billing list
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["platform"] })
  const useAction = <V, R>(fn: (a: ConsoleActor, v: V) => Promise<R>, success: string | ((r: R) => string)) =>
    useMutation({
      mutationFn: (v: V) => {
        if (!actor) throw new Error("Your console role does not allow this")
        return fn(actor, v)
      },
      onSuccess: (r) => {
        refresh()
        toast.success(typeof success === "string" ? t(success) : success(r))
      },
      onError: (err) => toast.error(translateError(err, t)),
    })
  return {
    createVersion: useAction((a, v: { plan: NexoraPlanId; monthly: number; effectiveFrom: string; existing: "keep" | "move_at_renewal" }) => createPlanVersionApi(a, v), "biVersionCreated"),
    start: useAction((a, v: { customerId: string; plan: NexoraPlanId; billing: "monthly" | "yearly"; method: "card" | "transfer" }) => startSubscriptionApi(a, v.customerId, v), "biStarted"),
    changePlan: useAction((a, v: { customerId: string; plan: NexoraPlanId }) => changePlanApi(a, v.customerId, v.plan), (r) => (r.invoice ? t("biUpgraded", { number: r.invoice.number }) : t("biDowngradeScheduled"))),
    runJobs: useAction((a, v: { cardOutcome: "ok" | "declined" }) => runBillingJobsApi(a, undefined, v.cardOutcome), (r) => t("biJobsDone", { renewed: r.renewed, steps: r.steps })),
    recordTransfer: useAction((a, v: { amount: number; reference: string; payer: string; date: string }) => recordTransferApi(a, v), (r) => t(r.matched ? "biTransferMatched" : "biTransferQueued")),
    assign: useAction((a, v: { paymentId: string; invoiceId: string }) => assignTransferApi(a, v.paymentId, v.invoiceId), "biTransferMatched"),
    creditNote: useAction((a, v: { invoiceId: string; amount: number; reason: string; refund: boolean }) => issueCreditNoteApi(a, v.invoiceId, v), (r) => (r.refund?.status === "awaiting_approval" ? t("biRefundAwaiting", { number: r.creditNote.number }) : t("biCreditIssued", { number: r.creditNote.number }))),
    approveRefund: useAction((a, id: string) => approveRefundApi(a, id), "biRefundDone"),
  }
}
