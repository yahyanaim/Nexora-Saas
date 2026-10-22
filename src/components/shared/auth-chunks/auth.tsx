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
import { NexusMark, NexusPattern } from "@/components/ui/nexus"
import { useTranslations } from "next-intl"

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
  const t = useTranslations()
  const searchParams = useSearchParams()
  const initialSection = (searchParams?.get("section") as AuthSections) || "login-by-email"
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
    <div className="relative isolate flex min-h-dvh flex-col items-center justify-between overflow-x-hidden bg-background px-4 py-8 md:py-12">
      {/* DS-07: the navy Nexus band behind the card, same as the app's shell bar */}
      <div aria-hidden className="nx-shell absolute inset-x-0 top-0 -z-10 h-[46vh] min-h-72 overflow-hidden rounded-b-[40px]">
        <NexusPattern fade="radial" className="text-white/[0.14]" />
        <span className="absolute inset-x-[15%] bottom-0 h-px [background:var(--shell-line)]" />
      </div>
      {/* Top right theme toggler */}
      <div className="fixed top-4 right-4 z-50 rounded-full bg-card shadow-md md:top-5 md:right-5">
        <AnimatedThemeToggler />
      </div>

      {/* Main Centered Auth Card Container */}
      <div className="my-auto flex w-full flex-col items-center justify-center gap-6 py-8">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary shadow-[0_0_0_6px_rgb(38_132_255/0.2)]">
            <NexusMark className="size-8 text-white" />
          </span>
          <span className="font-display text-2xl font-bold tracking-tight text-white">{t("appName")}</span>
        </div>
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-lg sm:p-8">
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
