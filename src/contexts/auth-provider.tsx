"use client"

import { createContext, useEffect, ReactNode, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { User } from "@/types/users"
import { useFetchMyAccount } from "@/hooks/my-profile/use-fetch-my-account"
import { playConfetti } from "@/lib/utils/play-confetti"

export interface AuthGuardContextType {
  authedUser: User | undefined
  currentUserId?: string
  isAuthenticated: boolean
  isLoading: boolean
  isError: boolean
  token: string | undefined
  initializeAuth: (enableRouter?: boolean) => void
  clearAuth: () => void
  updatedUser: (user: User) => void
  myEmail: string
  isPasscodeLocked?: boolean
  myPrivacy?: {
    email?: string
    lastSeen?: string
    profilePhoto?: string
    forwardedMessages?: string
    invite?: string
  }
}

export const AuthGuardContext = createContext<AuthGuardContextType | null>(null)

const getLocalStorageItem = (key: string): string | null => {
  if (typeof window === "undefined") return null
  return localStorage.getItem(key)
}

const getLocalStorageJSON = (key: string): any => {
  if (typeof window === "undefined") return null
  const item = localStorage.getItem(key)
  if (!item) return null
  try {
    return JSON.parse(item)
  } catch {
    return null
  }
}

const setLocalStorageItem = (key: string, value: any): void => {
  if (typeof window === "undefined") return
  if (typeof value === "string") {
    localStorage.setItem(key, value)
  } else {
    localStorage.setItem(key, JSON.stringify(value))
  }
}

const removeLocalStorageItem = (key: string): void => {
  if (typeof window === "undefined") return
  localStorage.removeItem(key)
}

export function AuthGuardProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | undefined>(undefined)
  const [user, setUser] = useState<User | undefined>(undefined)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [isInitialized, setIsInitialized] = useState<boolean>(false)
  const [isMounted, setIsMounted] = useState<boolean>(false)
  const router = useRouter()
  const pathname = usePathname()

  const {
    myAccount,
    error: accountError,
    isError: isAccountError,
  } = useFetchMyAccount(isAuthenticated && !!token)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return

    const isAuthPage = pathname?.includes("/auth")
    const hasToken = !!getLocalStorageItem("token")

    if (isAuthPage && hasToken) {
      router.replace("/dashboard/overview")
      return
    }

    if (isInitialized) return

    const getUser = getLocalStorageJSON("user")
    const getToken = getLocalStorageItem("token")

    if (getToken && getUser) {
      setToken(getToken)
      setUser(getUser)
      setIsAuthenticated(true)
    } else if (!isAuthPage) {
      router.replace("/auth")
    }

    setIsInitialized(true)
  }, [isMounted, pathname])

  useEffect(() => {
    if (myAccount && isAuthenticated && isMounted) {
      const updatedUserData = { ...user, ...myAccount }
      setUser(updatedUserData)
      setLocalStorageItem("user", updatedUserData)
    }
  }, [myAccount, isAuthenticated, isMounted])

  useEffect(() => {
    if (!isMounted || !isInitialized) return
    if (!isAccountError || !accountError) return

    const status = (accountError as any)?.response?.status
    const code = (accountError as any)?.response?.data?.code

    if (status === 401 || code === "Unauthorized") {
      removeLocalStorageItem("token")
      removeLocalStorageItem("user")
      removeLocalStorageItem("passcode")
      setToken(undefined)
      setUser(undefined)
      setIsAuthenticated(false)
      router.replace("/auth")
    }
  }, [isAccountError, accountError, isMounted, isInitialized, router])

  const initializeAuth = (enableRouter = false) => {
    if (typeof window === "undefined") return

    const getUser = getLocalStorageJSON("user") ?? undefined
    const getToken = getLocalStorageItem("token") ?? undefined

    if (getToken && getUser) {
      setToken(getToken)
      setUser(getUser)
      setIsAuthenticated(true)

      if (enableRouter) {
        router.replace("/dashboard/overview")
        setTimeout(() => {
          return playConfetti()
        }, 2000)
      }
    }
  }

  const updatedUser = (user: User) => {
    if (typeof window === "undefined") return
    const getUser = getLocalStorageJSON("user") ?? {}
    const newData = { ...getUser, ...user }
    setLocalStorageItem("user", newData)
    setUser(newData)
  }

  const clearAuth = () => {
    if (typeof window === "undefined") return
    removeLocalStorageItem("token")
    removeLocalStorageItem("user")
    removeLocalStorageItem("passcode")
    setToken(undefined)
    setUser(undefined)
    setIsAuthenticated(false)
    router.replace("/auth")
  }

  if (!isMounted) {
    return null
  }

  const passcode = getLocalStorageItem("passcode")

  const value: AuthGuardContextType = {
    authedUser: {
      name: user?.name as any,
      id: user?.id as any,
      username: user?.username,
      userType: user?.userType as any,
      profileColor: user?.profileColor as any,
      avatar: user?.avatar as any,
      status: user?.status as any,
      is2FA: user?.is2FA as any,
      roles: user?.roles as any,
    },
    myEmail: user?.email as any,
    myPrivacy: user?.privacy as any,
    isPasscodeLocked: (user?.isPasscodeLocked as any) || !!passcode,
    currentUserId: user?.id,
    isAuthenticated,
    isError: false,
    isLoading: !isInitialized,
    token,
    initializeAuth,
    updatedUser,
    clearAuth,
  }

  return (
    <AuthGuardContext.Provider value={value}>
      {children}
    </AuthGuardContext.Provider>
  )
}
