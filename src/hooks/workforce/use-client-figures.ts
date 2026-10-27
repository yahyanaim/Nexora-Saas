"use client"

import { useMemo } from "react"
import { clientFigures, type ClientFigures } from "@/lib/workforce/client-figures"
import { todayIso } from "@/lib/workforce/project-metrics"
import { useClients } from "./use-workforce"
import { useClientInvoices } from "./use-work-billing"
import { useProjects } from "./use-work-projects"
import { useDeals } from "./use-deals"
import { useSatisfaction } from "./use-satisfaction"
import { useClientNotes, useContracts, useFollowUps } from "./use-crm"
import { useWorkspaceSettings } from "./use-settings"

/**
 * The CRM figures of every client of the workspace, by client id (CRM step 1):
 * one pass over the records the list, the details panel and the client page share.
 */
export function useClientFigures(): { figures: Map<string, ClientFigures>; isLoading: boolean } {
  const clients = useClients()
  const invoices = useClientInvoices()
  const projects = useProjects()
  const deals = useDeals()
  const notes = useClientNotes()
  const followUps = useFollowUps()
  const contracts = useContracts()
  const responses = useSatisfaction()
  const { data: settings } = useWorkspaceSettings()
  const queries = [clients, invoices, projects, deals, notes, followUps, contracts, responses]
  const isLoading = queries.some((q) => q.isLoading)
  const figures = useMemo(() => {
    const today = todayIso()
    const records = {
      pipeline: settings?.pipeline,
      invoices: invoices.data ?? [],
      projects: projects.data ?? [],
      deals: deals.data ?? [],
      notes: notes.data ?? [],
      followUps: followUps.data ?? [],
      contracts: contracts.data ?? [],
      responses: responses.data ?? [],
    }
    return new Map((clients.data ?? []).map((c) => [c.id, clientFigures(c, records, today)]))
  }, [clients.data, invoices.data, projects.data, deals.data, notes.data, followUps.data, contracts.data, responses.data, settings?.pipeline])
  return { figures, isLoading }
}
