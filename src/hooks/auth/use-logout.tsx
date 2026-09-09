"use client"
import { logoutApi } from "@/lib/api/auth-apis"
import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { useAuthGuard } from "./use-auth-guard"

export const useLogout = () => {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const { clearAuth } = useAuthGuard()

  const mutation = useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      clearAuth()
      setShowLogoutDialog(false)
    },
  })

  return {
    mutation,
    showLogoutDialog,
    setShowLogoutDialog,
  }
}
