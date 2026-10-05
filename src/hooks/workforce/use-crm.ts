"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "@/lib/utils/toast"
import { useCurrentWorkspace } from "@/store/workspace-store"
import {
  addClientNoteApi,
  deleteClientNoteApi,
  deleteContractApi,
  listClientNotesApi,
  listContractsApi,
  saveContractApi,
} from "@/lib/api/crm-api"
import {
  deleteRecurringApi,
  listRecurringApi,
  runDueRecurringApi,
  runRecurringApi,
  saveRecurringApi,
  setRecurringActiveApi,
} from "@/lib/api/recurring-invoices-api"
import { sendReminderApi } from "@/lib/api/work-billing-api"
import { updateRemindersApi } from "@/lib/api/settings-api"
import type { ClientNote, ContractInput, RecurringInput, ReminderSettings } from "@/types/work-crm"

export function useContracts() {
  const { id } = useCurrentWorkspace()
  return useQuery({ queryKey: ["client-contracts", id], queryFn: () => listContractsApi(id) })
}

export function useClientNotes() {
  const { id } = useCurrentWorkspace()
  return useQuery({ queryKey: ["client-notes", id], queryFn: () => listClientNotesApi(id) })
}

export function useRecurringInvoices() {
  const { id } = useCurrentWorkspace()
  return useQuery({ queryKey: ["recurring-invoices", id], queryFn: () => listRecurringApi(id) })
}

function useHelpers(keys: string[]) {
  const t = useTranslations()
  const { id: ws } = useCurrentWorkspace()
  const qc = useQueryClient()
  const refresh = () => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k, ws] }))
  const onError = (err: unknown) => toast.error(err instanceof Error && err.message ? err.message : t("somethingWentWrong"))
  const ok = (message: string) => () => {
    toast.success(message)
    refresh()
  }
  return { t, ws, onError, ok, refresh }
}

export function useCrmMutations() {
  const { t, ws, onError, ok } = useHelpers(["client-contracts", "client-notes"])
  return {
    saveContract: useMutation({
      mutationFn: ({ input, id }: { input: ContractInput; id?: string }) => saveContractApi(ws, input, id),
      onSuccess: ok(t("contractSaved")),
      onError,
    }),
    deleteContract: useMutation({ mutationFn: (id: string) => deleteContractApi(ws, id), onSuccess: ok(t("contractDeleted")), onError }),
    addNote: useMutation({
      mutationFn: (input: Pick<ClientNote, "clientId" | "kind" | "date" | "text" | "authorId">) => addClientNoteApi(ws, input),
      onSuccess: ok(t("noteAdded")),
      onError,
    }),
    deleteNote: useMutation({ mutationFn: (id: string) => deleteClientNoteApi(ws, id), onSuccess: ok(t("noteDeleted")), onError }),
  }
}

export function useRecurringMutations() {
  const { t, ws, onError, ok, refresh } = useHelpers(["recurring-invoices", "client-invoices"])
  return {
    save: useMutation({
      mutationFn: ({ input, id }: { input: RecurringInput; id?: string }) => saveRecurringApi(ws, input, id),
      onSuccess: ok(t("recurringSaved")),
      onError,
    }),
    setActive: useMutation({
      mutationFn: ({ id, active }: { id: string; active: boolean }) => setRecurringActiveApi(ws, id, active),
      onSuccess: ok(t("recurringUpdated")),
      onError,
    }),
    remove: useMutation({ mutationFn: (id: string) => deleteRecurringApi(ws, id), onSuccess: ok(t("recurringDeleted")), onError }),
    run: useMutation({ mutationFn: (id: string) => runRecurringApi(ws, id), onSuccess: ok(t("recurringDrafted")), onError }),
    runDue: useMutation({ mutationFn: () => runDueRecurringApi(ws), onSuccess: refresh, onError }),
  }
}

export function useReminderMutations() {
  const { t, ws, onError, ok } = useHelpers(["client-invoices", "settings"])
  return {
    send: useMutation({
      mutationFn: ({ id, level }: { id: string; level: 1 | 2 | 3 }) => sendReminderApi(ws, id, level),
      onSuccess: ok(t("reminderSent")),
      onError,
    }),
    saveSettings: useMutation({
      mutationFn: (settings: ReminderSettings) => updateRemindersApi(ws, settings),
      onSuccess: ok(t("settingsSaved")),
      onError,
    }),
  }
}
