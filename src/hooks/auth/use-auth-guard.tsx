import {
  AuthGuardContext,
  AuthGuardContextType,
} from "@/contexts/auth-provider"
import { useContext } from "react"

export const useAuthGuard = (): AuthGuardContextType => {
  const ctx = useContext(AuthGuardContext)
  if (!ctx) {
    throw new Error("useAuthGuard must be used inside <AuthGuardProvider>")
  }
  return ctx
}
