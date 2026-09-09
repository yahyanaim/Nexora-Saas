"use client"
import { useMutation } from "@tanstack/react-query"

export const useAuthAnnounceLogin = () => {
  const mutation = useMutation({
    // mutationFn: authAnnounceLoginApi,
    mutationFn: async () => {},
  })

  return mutation
}
