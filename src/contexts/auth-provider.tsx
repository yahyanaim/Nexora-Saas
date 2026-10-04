"use client"

import { createContext, useEffect, useState, useCallback, useMemo, useRef } from "react"
import { useRouter, usePathname } from "@/i18n/navigation"
import { User, UserStatus, UserType } from "@/types/users"
import { AuthUser, LoginPayload, LoginResponse, RegisterPayload, RegisterResponse } from "@/types/auth"
import { fetchMyAccountApi, loginApi, logoutApi, registerApi } from "@/lib/api/auth-apis"
import { fetchSubscriptionApi } from "@/lib/api/billing-apis"
import { BillingPlan } from "@/types/plans"
import { FeatureFlagKey, isFeatureEnabledForPlan } from "@/lib/feature-flags/feature-flags"
import { isSuperUser } from "@/lib/permissions/can"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { UPGRADE_REQUIRED_EVENT, SESSION_EXPIRED_EVENT, apiErrorMessage } from "@/lib/myapi/client"
import { isDemoMode } from "@/lib/auth/demo-mode"
import { tokenStorage } from "@/lib/myapi/token-storage"
import { toast } from "sonner"
import { useLockScreenStore } from "@/store/auth/lock-screen-store"
import { isUnderPath, resolveAfterLoginPath } from "@/lib/auth/safe-redirect"

/**
 * Context value exposed by {@link AuthGuardProvider}.
 * Provides reactive access to the authenticated user, session loading status,
 * login/register/logout actions, and route gatekeeping utilities.
 */
export interface AuthGuardContextType {
  authedUser: User | undefined
  user: User | undefined
  currentUserId?: string
  isAuthenticated: boolean
  isLoading: boolean
  isError: boolean
  token?: string
  initializeAuth: (enableRouter?: boolean) => void
  clearAuth: () => void
  updatedUser: (user: Partial<User>) => void
  myEmail?: string
  isPasscodeLocked?: boolean
  myPrivacy?: {
    email?: string
    lastSeen?: string
    profilePhoto?: string
    forwardedMessages?: string
    invite?: string
  }
  currentPlan?: BillingPlan
  hasFeature: (flag: FeatureFlagKey) => boolean
  login: (payload: LoginPayload) => Promise<LoginResponse>
  register: (payload: RegisterPayload) => Promise<RegisterResponse>
  logout: () => Promise<void>
  refetchUser: () => void
}

export const AuthGuardContext = createContext<AuthGuardContextType | null>(null)

const UPGRADE_PROMPT_COOLDOWN_MS = 3000

/**
 * Transforms an {@link AuthUser} payload into the full platform {@link User} entity.
 * Prioritizes custom uploaded or AI portrait avatars, applying a deterministic fallback.
 *
 * @param authUser - Raw session user object returned from auth APIs
 * @returns Fully normalized User entity or undefined
 */
function mapAuthUserToUser(authUser: AuthUser | null | undefined): User | undefined {
  if (!authUser) return undefined
  const extended = authUser as unknown as Partial<User>
  return {
    ...authUser,
    role: authUser.role ?? "user",
    avatar: authUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(authUser.name || authUser.id || "user")}`,
    userType: extended.userType ?? UserType.USER,
    status: extended.status ?? UserStatus.ACTIVE,
  }
}

export function AuthGuardProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const [localOverrides, setLocalOverrides] = useState<Partial<User>>({})
  const pathnameRef = useRef(pathname)
  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  // Session query via HTTP-only cookie
  const {
    data: myAccount,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["myAccount"],
    queryFn: fetchMyAccountApi,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  const user: User | undefined = useMemo(() => {
    const baseUser = mapAuthUserToUser(myAccount)
    return baseUser ? { ...baseUser, ...localOverrides } : undefined
  }, [myAccount, localOverrides])
  const isAuthenticated = !!user

  // 1. Plan gate handler: 403 upgrade_required -> route to the company's subscription page
  // Parallel requests can all fail with upgrade_required; show one toast and
  // navigate once instead of once per request.
  const lastUpgradePromptRef = useRef(0)
  useEffect(() => {
    const goPricing = () => {
      const now = Date.now()
      if (now - lastUpgradePromptRef.current < UPGRADE_PROMPT_COOLDOWN_MS) return
      lastUpgradePromptRef.current = now

      toast.error("Your current plan does not include this feature. Upgrade to continue.", {
        id: "upgrade-required",
      })
      if (!isUnderPath(pathnameRef.current, "/dashboard/subscription")) {
        router.push("/dashboard/subscription")
      }
    }
    window.addEventListener(UPGRADE_REQUIRED_EVENT, goPricing)
    return () => window.removeEventListener(UPGRADE_REQUIRED_EVENT, goPricing)
  }, [router])

  // 2. Routing guards (RequireAuth / GuestOnly)
  useEffect(() => {
    if (isLoading) return

    const isAuthPage = isUnderPath(pathname, "/auth")
    const isDashboardPage = isUnderPath(pathname, "/dashboard")

    if (isAuthenticated && isAuthPage) {
      router.replace(resolveAfterLoginPath(window.location.search))
    } else if (!isAuthenticated && isDashboardPage) {
      const next = encodeURIComponent(`${pathname}${window.location.search}`)
      router.replace(`/auth?next=${next}`)
    }
  }, [isAuthenticated, isLoading, pathname, router])

  // 3. Email verification / Account Lock error handling
  useEffect(() => {
    if (!isError || !error) return
    const data = (error as { response?: { data?: { code?: string } } })?.response?.data
    if (data?.code === "email_unverified") {
      toast.error("Your email is unverified. Please check your inbox to activate your account.")
    } else if (data?.code === "account_locked") {
      toast.error(apiErrorMessage(error, "Account is temporarily locked. Please contact support."))
    }
  }, [isError, error])

  const initializeAuth = useCallback(
    async (enableRouter = false) => {
      await queryClient.invalidateQueries({ queryKey: ["myAccount"] })
      const res = await refetch()
      if (enableRouter && res.data) {
        router.replace(resolveAfterLoginPath(window.location.search))
      }
    },
    [queryClient, refetch, router]
  )

  const updatedUser = useCallback((partial: Partial<User>) => {
    setLocalOverrides((prev) => ({ ...prev, ...partial }))
  }, [])

  const clearAuth = useCallback(() => {
    queryClient.setQueryData(["myAccount"], null)
    useLockScreenStore.getState().lock()
    setLocalOverrides({})
    router.replace("/auth")
  }, [queryClient, router])

  useEffect(() => {
    const handleSessionExpired = () => {
      if (isDemoMode()) return
      if (!isUnderPath(pathname, "/auth")) {
        clearAuth()
        toast.error("Your session has expired. Please log in again.")
      }
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
  }, [clearAuth, pathname])

  const login = useCallback(
    async (payload: LoginPayload) => {
      const response = await loginApi(payload)
      if (!response.mfaRequired) {
        await initializeAuth(true)
      }
      return response
    },
    [initializeAuth]
  )

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const response = await registerApi(payload)
      await initializeAuth(true)
      return response
    },
    [initializeAuth]
  )

  const { data: subscription } = useQuery({
    queryKey: ["currentSubscription"],
    queryFn: fetchSubscriptionApi,
    staleTime: 5 * 60 * 1000,
    enabled: isAuthenticated,
    retry: false,
  })

  const currentPlan: BillingPlan = subscription?.plan || "free"

  /**
   * UI-ONLY — enforced by backend per request
   */
  const hasFeature = useCallback(
    (flag: FeatureFlagKey): boolean => {
      if (!user) return false
      if (isSuperUser(user)) return true
      return isFeatureEnabledForPlan(flag, currentPlan)
    },
    [user, currentPlan]
  )

  const logout = useCallback(async () => {
    await logoutApi()
    clearAuth()
  }, [clearAuth])

  const refetchUser = useCallback(() => {
    void refetch()
  }, [refetch])

  // Demo-only client token; production relies on HttpOnly cookies
  const token = useMemo(
    () => (isAuthenticated && isDemoMode() ? (tokenStorage.get() ?? undefined) : undefined),
    [isAuthenticated]
  )

  // Memoized so consumers only re-render when auth state actually changes
  const value = useMemo<AuthGuardContextType>(
    () => ({
      authedUser: user,
      user,
      currentUserId: user?.id,
      myEmail: user?.email,
      isAuthenticated,
      isPasscodeLocked: Boolean(user?.isPasscodeLocked),
      isError,
      isLoading,
      token,
      currentPlan,
      hasFeature,
      initializeAuth,
      clearAuth,
      updatedUser,
      login,
      register,
      logout,
      refetchUser,
    }),
    [
      user,
      isAuthenticated,
      isError,
      isLoading,
      token,
      currentPlan,
      hasFeature,
      initializeAuth,
      clearAuth,
      updatedUser,
      login,
      register,
      logout,
      refetchUser,
    ]
  )

  return (
    <AuthGuardContext.Provider value={value}>
      {children}
    </AuthGuardContext.Provider>
  )
}

export const AuthProvider = AuthGuardProvider
export default AuthGuardProvider
