import { useQueryClient } from "@tanstack/react-query"

export const useTerminateSession = () => {
  const queryClient = useQueryClient()

  // return useMutation({
  //   mutationFn: terminateSessionApi,
  //   onSuccess: (targetSessionId) => {
  //     queryClient.setQueryData<Session[]>(["sessions"], (old) => {
  //       if (!old) return old
  //       return old.filter((s) => s.id !== targetSessionId)
  //     })
  //   },
  // })
}
