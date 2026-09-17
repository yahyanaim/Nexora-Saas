"use client"

import { ForgotPassword } from "@/components/shared/auth-chunks/forgot-password"
import { LoginByEmail } from "@/components/shared/auth-chunks/login-by-email"
import { LoginByQrCode } from "@/components/shared/auth-chunks/login-by-qrCode"
import { ResetPassword } from "@/components/shared/auth-chunks/reset-password"
import { VerifyAccount } from "@/components/shared/auth-chunks/verify-account"
import { VerifyForgotPassword } from "@/components/shared/auth-chunks/verify-forgot-password"
import { RegisterForm } from "@/components/shared/auth-chunks/register"
import { InviteAcceptForm } from "@/components/shared/auth-chunks/invite-accept"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import { CitySkyline } from "@/components/shared/auth-chunks/city-skyline"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

export type AuthSections =
  | "login-by-email"
  | "login-by-qrCode"
  | "very-account"
  | "very-forgot-password"
  | "forgot-password"
  | "reset-password"
  | "register"
  | "accept-invite"

export const AuthPage = () => {
  const searchParams = useSearchParams()
  const initialSection = (searchParams?.get("section") as AuthSections) || "register"
  const urlToken = searchParams?.get("token") || ""

  const [authSections, setAuthSections] = useState<AuthSections>(initialSection)
  const [mfaToken, setMfaToken] = useState<string>("")
  const [resetEmail, setResetEmail] = useState<string>("")
  const [resetToken, setResetToken] = useState<string>("")

  useEffect(() => {
    queueMicrotask(() => {
      if (searchParams?.get("token") && searchParams?.get("section") === "reset-password") {
        setAuthSections("reset-password")
      } else if (searchParams?.get("token") && searchParams?.get("section") === "accept-invite") {
        setAuthSections("accept-invite")
      } else if (searchParams?.get("section") === "login") {
        setAuthSections("login-by-email")
      } else if (searchParams?.get("section") === "register") {
        setAuthSections("register")
      }
    })
  }, [searchParams])

  useEffect(() => {
    window.history.pushState(null, "", window.location.href)
    const handleBack = () => {
      setAuthSections("login-by-email")
      window.history.pushState(null, "", window.location.href)
    }
    window.addEventListener("popstate", handleBack)
    return () => {
      window.removeEventListener("popstate", handleBack)
    }
  }, [])

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-between overflow-x-hidden bg-background px-4 py-8 md:py-12">
      {/* Top right theme toggler */}
      <div className="fixed top-4 right-4 z-50 md:top-5 md:right-5">
        <AnimatedThemeToggler />
      </div>

      {/* Main Centered Auth Card Container */}
      <div className="my-auto flex w-full flex-col items-center justify-center py-8">
        <div className="w-full max-w-sm">
          {authSections === "login-by-qrCode" ? (
            <LoginByQrCode setAuthSections={setAuthSections} />
          ) : authSections === "login-by-email" ? (
            <LoginByEmail
              setAuthSections={setAuthSections}
              setMfaToken={setMfaToken}
            />
          ) : authSections === "register" ? (
            <RegisterForm setAuthSections={setAuthSections} />
          ) : authSections === "forgot-password" ? (
            <ForgotPassword
              setAuthSections={setAuthSections}
              setEmailForReset={setResetEmail}
            />
          ) : authSections === "very-account" ? (
            <VerifyAccount
              setAuthSections={setAuthSections}
              mfaToken={mfaToken}
            />
          ) : authSections === "very-forgot-password" ? (
            <VerifyForgotPassword
              setAuthSections={setAuthSections}
              email={resetEmail}
              setResetToken={setResetToken}
            />
          ) : authSections === "reset-password" ? (
            <ResetPassword
              setAuthSections={setAuthSections}
              token={resetToken || urlToken}
            />
          ) : authSections === "accept-invite" ? (
            <InviteAcceptForm
              setAuthSections={setAuthSections}
              token={urlToken}
            />
          ) : (
            <RegisterForm setAuthSections={setAuthSections} />
          )}
        </div>
      </div>

      {/* Grounded City Skyline Architectural Engraving Illustration */}
      <div className="w-full pt-4 pb-0">
        <CitySkyline />
      </div>
    </div>
  )
}
