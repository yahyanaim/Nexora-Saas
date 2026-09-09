import { fetchMyAccountApi } from "@/lib/api/auth-apis"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"

export const useFetchMyAccount = (enabled: boolean) => {
  const queryClient = useQueryClient()
  const {
    data: myAccount,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    refetchOnWindowFocus: false,
    queryKey: ["myAccount"],
    queryFn: fetchMyAccountApi,
    enabled,
  })

  const refreshMyAccount = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["myAccount"] })
    refetch()
  }, [queryClient, refetch])

  const clearMyAccountCache = useCallback(() => {
    queryClient.removeQueries({ queryKey: ["myAccount"] })
  }, [queryClient])

  return {
    myAccount,
    isLoading,
    isFetching,
    isError,
    error,
    refreshMyAccount,
    clearMyAccountCache,
  }
}
