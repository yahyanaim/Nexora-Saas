"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "@/lib/utils/toast"

interface UseEntityMutationsOptions<T, TCreateInput, TUpdateInput> {
  queryKey: string
  createFn: (input: TCreateInput) => Promise<T>
  updateFn: (id: string, input: TUpdateInput) => Promise<T>
  deleteFn?: (id: string) => Promise<void>
  entityLabel?: string // "User", "Group"...
}

export function useEntityMutations<T, TCreateInput, TUpdateInput>({
  queryKey,
  createFn,
  updateFn,
  deleteFn,
  entityLabel = "Item",
}: UseEntityMutationsOptions<T, TCreateInput, TUpdateInput>) {
  const queryClient = useQueryClient()

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: [queryKey] })
  }

  const createMutation = useMutation({
    mutationFn: createFn,
    onSuccess: () => {
      toast.success(`${entityLabel} created`)
      invalidate()
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message ??
          `Couldn't create ${entityLabel.toLowerCase()}`
      )
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: TUpdateInput }) =>
      updateFn(id, input),
    onSuccess: () => {
      toast.success(`${entityLabel} updated`)
      invalidate()
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message ??
          `Couldn't update ${entityLabel.toLowerCase()}`
      )
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (!deleteFn) throw new Error("deleteFn not provided")
      return deleteFn(id)
    },
    onSuccess: () => {
      toast.success(`${entityLabel} deleted`)
      invalidate()
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message ??
          `Couldn't delete ${entityLabel.toLowerCase()}`
      )
    },
  })

  return {
    create: createMutation.mutate,
    isCreating: createMutation.isPending,
    update: (
      id: string,
      input: TUpdateInput,
      options?: Parameters<typeof updateMutation.mutate>[1]
    ) => updateMutation.mutate({ id, input }, options),
    isUpdating: updateMutation.isPending,
    remove: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  }
}
