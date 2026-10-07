"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { translateError } from "@/lib/errors/translate-error"
import { assignBookingApi, deleteBookingApi, listBookingsApi, saveBookingApi } from "@/lib/api/resource-bookings-api"
import type { ResourceBookingInput } from "@/types/work-planning"

export function useBookings() {
  const { id } = useCurrentWorkspace()
  return useQuery({ queryKey: ["resource-bookings", id], queryFn: () => listBookingsApi(id) })
}

export function useBookingMutations() {
  const t = useTranslations()
  const { id: workspaceId } = useCurrentWorkspace()
  const queryClient = useQueryClient()
  const done = (message: string) => () => {
    toast.success(message)
    queryClient.invalidateQueries({ queryKey: ["resource-bookings", workspaceId] })
  }
  const onError = (err: unknown) => toast.error(translateError(err, t))
  return {
    save: useMutation({ mutationFn: ({ id, input }: { id?: string; input: ResourceBookingInput }) => saveBookingApi(workspaceId, input, id), onSuccess: done(t("bookingSaved")), onError }),
    assign: useMutation({ mutationFn: ({ id, employeeId }: { id: string; employeeId: string }) => assignBookingApi(workspaceId, id, employeeId), onSuccess: done(t("bookingAssigned")), onError }),
    remove: useMutation({ mutationFn: (id: string) => deleteBookingApi(workspaceId, id), onSuccess: done(t("bookingDeleted")), onError }),
  }
}
