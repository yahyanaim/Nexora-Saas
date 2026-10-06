"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "@/lib/utils/toast"
import { useCurrentWorkspace } from "@/store/workspace-store"
import {
  acceptQuoteApi,
  convertQuoteToInvoiceApi,
  createProjectFromQuoteApi,
  createQuoteApi,
  declineQuoteApi,
  deleteQuoteApi,
  duplicateQuoteApi,
  listQuotesApi,
  sendQuoteApi,
  updateQuoteApi,
} from "@/lib/api/quotes-api"
import type { QuoteInput } from "@/types/work-quotes"
import { translateError } from "@/lib/errors/translate-error"

export function useQuotes() {
  const { id } = useCurrentWorkspace()
  return useQuery({ queryKey: ["quotes", id], queryFn: () => listQuotesApi(id) })
}

export function useQuoteMutations() {
  const t = useTranslations()
  const { id: ws } = useCurrentWorkspace()
  const qc = useQueryClient()
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["quotes", ws] })
    qc.invalidateQueries({ queryKey: ["client-invoices", ws] })
    qc.invalidateQueries({ queryKey: ["projects", ws] })
  }
  const ok = (message: string) => () => {
    toast.success(message)
    refresh()
  }
  const onError = (err: unknown) => toast.error(translateError(err, t))
  return {
    create: useMutation({ mutationFn: (input: QuoteInput) => createQuoteApi(ws, input), onSuccess: ok(t("quoteSaved")), onError }),
    update: useMutation({ mutationFn: ({ id, input }: { id: string; input: QuoteInput }) => updateQuoteApi(ws, id, input), onSuccess: ok(t("quoteSaved")), onError }),
    send: useMutation({ mutationFn: (id: string) => sendQuoteApi(ws, id), onSuccess: ok(t("quoteMarkedSent")), onError }),
    accept: useMutation({ mutationFn: (id: string) => acceptQuoteApi(ws, id), onSuccess: ok(t("quoteMarkedAccepted")), onError }),
    decline: useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => declineQuoteApi(ws, id, reason), onSuccess: ok(t("quoteMarkedDeclined")), onError }),
    duplicate: useMutation({ mutationFn: (id: string) => duplicateQuoteApi(ws, id), onSuccess: ok(t("quoteDuplicated")), onError }),
    remove: useMutation({ mutationFn: (id: string) => deleteQuoteApi(ws, id), onSuccess: ok(t("quoteDeleted")), onError }),
    invoice: useMutation({ mutationFn: (id: string) => convertQuoteToInvoiceApi(ws, id, t("docDiscount").replace(/\s*\(%\)/, "")), onSuccess: ok(t("quoteConverted")), onError }),
    project: useMutation({
      mutationFn: ({ id, code, managerId }: { id: string; code: string; managerId?: string }) => createProjectFromQuoteApi(ws, id, { code, managerId }),
      onSuccess: ok(t("quoteProjectCreated")),
      onError,
    }),
  }
}
