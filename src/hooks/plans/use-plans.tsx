"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "@/lib/utils/toast"
import {
  createPlanApi,
  updatePlanApi,
  deletePlanApi,
} from "@/lib/api/plans-apis"
import { CreatePlanPayload, UpdatePlanPayload } from "@/types/plans"

export function usePlans() {
  const queryClient = useQueryClient()

  const invalidatePlans = () => {
    queryClient.invalidateQueries({ queryKey: ["plans"] })
  }

  const createMutation = useMutation({
    mutationFn: (payload: CreatePlanPayload) => createPlanApi(payload),
    onSuccess: () => {
      toast.success("Plan created successfully")
      invalidatePlans()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to create plan")
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePlanPayload }) =>
      updatePlanApi(id, payload),
    onSuccess: () => {
      toast.success("Plan updated successfully")
      invalidatePlans()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to update plan")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePlanApi(id),
    onSuccess: () => {
      toast.success("Plan deleted successfully")
      invalidatePlans()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to delete plan")
    },
  })

  return {
    createPlan: createMutation.mutate,
    createPlanAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,

    updatePlan: updateMutation.mutate,
    updatePlanAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,

    deletePlan: deleteMutation.mutate,
    deletePlanAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,

    isLoading:
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending,
  }
}
