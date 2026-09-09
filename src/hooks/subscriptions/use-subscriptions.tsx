"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "@/lib/utils/toast"
import {
  createSubscriptionApi,
  updateSubscriptionApi,
  deleteSubscriptionApi,
  cancelSubscriptionApi,
} from "@/lib/api/subscriptions-api"
import {
  CreateSubscriptionPayload,
  UpdateSubscriptionPayload,
} from "@/types/subscriptions"

export function useSubscriptions() {
  const queryClient = useQueryClient()

  const invalidateSubscriptions = () => {
    queryClient.invalidateQueries({ queryKey: ["subscriptions"] })
  }

  const createMutation = useMutation({
    mutationFn: (payload: CreateSubscriptionPayload) =>
      createSubscriptionApi(payload),
    onSuccess: () => {
      toast.success("Subscription created successfully")
      invalidateSubscriptions()
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to create subscription"
      )
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: UpdateSubscriptionPayload
    }) => updateSubscriptionApi(id, payload),
    onSuccess: () => {
      toast.success("Subscription updated successfully")
      invalidateSubscriptions()
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to update subscription"
      )
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSubscriptionApi(id),
    onSuccess: () => {
      toast.success("Subscription deleted successfully")
      invalidateSubscriptions()
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to delete subscription"
      )
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelSubscriptionApi(id),
    onSuccess: () => {
      toast.success("Subscription canceled successfully")
      invalidateSubscriptions()
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to cancel subscription"
      )
    },
  })

  return {
    createSubscription: createMutation.mutate,
    createSubscriptionAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,

    updateSubscription: updateMutation.mutate,
    updateSubscriptionAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,

    deleteSubscription: deleteMutation.mutate,
    deleteSubscriptionAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,

    cancelSubscription: cancelMutation.mutate,
    cancelSubscriptionAsync: cancelMutation.mutateAsync,
    isCanceling: cancelMutation.isPending,

    isLoading:
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending ||
      cancelMutation.isPending,
  }
}
