"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "@/lib/utils/toast"
import { translateError } from "@/lib/errors/translate-error"
import {
  approveRefundApi,
  cancelNowApi,
  changeBillingApi,
  changeMethodApi,
  customerChangePlanApi,
  listPlanContentApi,
  removeDiscountApi,
  removeExtensionApi,
  setDiscountApi,
  setExtensionApi,
  updatePlanContentApi,
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
  listReconciliationsApi,
  listSettlementsApi,
  recordChargebackApi,
  runReconciliationApi,
  simulateSettlementGapApi,
} from "@/lib/api/platform-billing-api"
import type { ConsoleActor } from "@/lib/api/platform-console-api"
import type { NexoraPlanId } from "@/lib/platform/nexora-catalog"
import { useConsoleActor } from "./use-platform-console"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"

const K = (name: string) => ["platform", "billing", name]

export const usePlanVersions = () => useQuery({ queryKey: K("versions"), queryFn: listPlanVersionsApi })
export const useNxSubscriptions = () => useQuery({ queryKey: K("subscriptions"), queryFn: listSubscriptionsApi })
export const useNxInvoices = () => useQuery({ queryKey: K("invoices"), queryFn: listInvoicesApi })
export const useNxCreditNotes = () => useQuery({ queryKey: K("credit-notes"), queryFn: listCreditNotesApi })
export const useNxPayments = () => useQuery({ queryKey: K("payments"), queryFn: listPaymentsApi })
export const useNxRefunds = () => useQuery({ queryKey: K("refunds"), queryFn: listRefundsApi })
export const useNxDunning = () => useQuery({ queryKey: K("dunning"), queryFn: listDunningApi })
export const useTaxRates = () => useQuery({ queryKey: K("taxes"), queryFn: listTaxRatesApi })
export const usePlanContent = () => useQuery({ queryKey: K("plan-content"), queryFn: listPlanContentApi })
export const useSettlements = () => useQuery({ queryKey: K("settlements"), queryFn: listSettlementsApi })
export const useReconciliations = () => useQuery({ queryKey: K("reconciliations"), queryFn: listReconciliationsApi })

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
    chargeback: useAction((a, v: { paymentId: string; reason: string; date: string }) => recordChargebackApi(a, v.paymentId, v), "trChargebackRecorded"),
    reconcile: useAction((a, day: string) => runReconciliationApi(a, day), (r) => (r.differences.length ? t("recDoneDiff", { n: r.differences.length }) : t("recDoneClean"))),
    simulateGap: useAction((a, _v: void) => simulateSettlementGapApi(a), "recGapSimulated"),
    planContent: useAction((a, v: { plan: NexoraPlanId; description: string; seats: number; features: string[]; retired: boolean }) => updatePlanContentApi(a, v.plan, v), "plContentSaved"),
    changeBilling: useAction((a, v: { customerId: string; billing: "monthly" | "yearly" }) => changeBillingApi({ actor: a }, v.customerId, v.billing), (r) => (r.invoice ? t("subBillingNow", { number: r.invoice.number }) : t("subBillingScheduled"))),
    changeMethod: useAction((a, v: { customerId: string; method: "card" | "transfer" }) => changeMethodApi({ actor: a }, v.customerId, v.method), "subMethodSaved"),
    setDiscount: useAction((a, v: { customerId: string; kind: "percent" | "amount"; value: number; invoices: number | null; reason: string }) => setDiscountApi(a, v.customerId, v), "subDiscountSaved"),
    removeDiscount: useAction((a, customerId: string) => removeDiscountApi(a, customerId), "subDiscountRemoved"),
    setExtension: useAction((a, v: { customerId: string; seats: number; until: string; reason: string }) => setExtensionApi(a, v.customerId, v), "subExtensionSaved"),
    removeExtension: useAction((a, customerId: string) => removeExtensionApi(a, customerId), "subExtensionRemoved"),
    cancelNow: useAction((a, v: { customerId: string; reason: string; refund: boolean }) => cancelNowApi(a, v.customerId, v), (r) => (r.refund?.status === "awaiting_approval" ? t("subCancelNowAwaiting") : t("subCancelledNow"))),
  }
}

/** The company administrator's own changes from My subscription (same rules as the console). */
export function useCompanySubscriptionMutations() {
  const t = useTranslations()
  const queryClient = useQueryClient()
  const { authedUser } = useAuthGuard()
  const u = authedUser as { name?: string; email?: string } | undefined
  const person = { name: u?.name ?? u?.email ?? "—", email: u?.email ?? "" }
  const make = <V, R>(fn: (v: V) => Promise<R>, success: (r: R) => string) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks -- each call below is made once, in a fixed order
    useMutation({
      mutationFn: fn,
      onSuccess: (r) => {
        queryClient.invalidateQueries()
        toast.success(success(r))
      },
      onError: (err) => toast.error(translateError(err, t)),
    })
  return {
    changePlan: make((v: { customerId: string; plan: NexoraPlanId }) => customerChangePlanApi(person, v.customerId, v.plan), (r) => (r.invoice ? t("biUpgraded", { number: r.invoice.number }) : t("biDowngradeScheduled"))),
    changeBilling: make((v: { customerId: string; billing: "monthly" | "yearly" }) => changeBillingApi({ person }, v.customerId, v.billing), (r) => (r.invoice ? t("subBillingNow", { number: r.invoice.number }) : t("subBillingScheduled"))),
    changeMethod: make((v: { customerId: string; method: "card" | "transfer" }) => changeMethodApi({ person }, v.customerId, v.method), () => t("subMethodSaved")),
  }
}
