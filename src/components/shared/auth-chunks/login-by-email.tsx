"use client"

import { DEMO_USERS } from "@/lib/api/auth-apis"
import { Input } from "@/components/ui/input"
import { resolveAfterLoginPath } from "@/lib/auth/safe-redirect"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "@/components/ui/carbon/icons"
import { Dispatch, SetStateAction, useEffect } from "react"
import { clearIdleNotice, readIdleNotice } from "@/lib/auth/idle"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { AuthSections } from "./auth"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useTranslations, useLocale } from "next-intl"
import { useMutation } from "@tanstack/react-query"
import { loginApi, isDemoMode } from "@/lib/api/auth-apis"
import { DEMO_SESSION_TOKEN, tokenStorage } from "@/lib/myapi/token-storage"
import { toast } from "sonner"
import { apiErrorMessage } from "@/lib/myapi/client"

interface Props {
  setAuthSections: Dispatch<SetStateAction<AuthSections>>
  setMfaToken?: (token: string) => void
}

const loginSchema = (t: (key: string) => string) =>
  z.object({
    email: z.string().min(1, t("emailRequired")).email(t("validEmail")),
    password: z.string().min(1, t("passwordRequired")),
  })

type LoginFormValues = z.infer<ReturnType<typeof loginSchema>>

export function LoginByEmail({ setAuthSections, setMfaToken }: Props) {
  const t = useTranslations()
  const locale = useLocale()
  const { initializeAuth } = useAuthGuard()

  // Signed out for being idle (D3): say so once
  useEffect(() => {
    const minutes = readIdleNotice()
    // one id, so a second page load on the way here does not stack a second toast
    if (minutes) toast.info(t("idleSignedOut", { minutes }), { id: "idle-signed-out" })
  }, [t])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema(t)),
    defaultValues: {
      email: "founder@saas.test",
      password: "",
    },
  })

  const { mutate, isPending } = useMutation({
    mutationFn: loginApi,
    onSuccess: async (data) => {
      if (data?.mfaRequired && data?.mfaToken) {
        setMfaToken?.(data.mfaToken)
        setAuthSections("very-account")
        toast.info(t("au_mfaRequired"))
      } else {
        toast.success(t("au_welcomeToast"))
        // Navigates to the safe ?next path (or the overview)
        await initializeAuth(true)
      }
    },
    onError: (error: unknown) => {
      toast.error(apiErrorMessage(error, t("loginFailed")))
    },
  })

  const onSubmit = (values: LoginFormValues) => {
    clearIdleNotice()
    mutate(values)
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mx-auto flex w-full max-w-sm flex-col gap-6"
    >
      <div className="flex flex-col gap-1 text-left">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t("au_welcomeBack")}
        </h1>
        <p className="text-xs text-muted-foreground">
          {t("au_signInHint")}
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-xs font-medium text-foreground"
          >
            {t("au_workEmail")}
          </label>
          <Input
            id="email"
            type="email"
            placeholder="rico@acme.com"
            className="h-10 rounded-md border-border/50 bg-muted/40 px-3.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 focus:bg-background"
            disabled={isPending}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-xs font-medium text-foreground"
            >
              {t("password")}
            </label>
            <button
              type="button"
              onClick={() => setAuthSections("forgot-password")}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {t("au_forgotShort")}
            </button>
          </div>
          <Input
            id="password"
            type="password"
            placeholder={t("enterPassword")}
            className="h-10 rounded-md border-border/50 bg-muted/40 px-3.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 focus:bg-background"
            disabled={isPending}
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 cursor-pointer mt-2"
        >
          {isPending && <Loader2 className="mr-2 size-3.5 animate-spin" />}
          {t("au_continue")}
        </button>

        {isDemoMode() && (
          <div className="flex flex-col gap-1">
            {(
              [
                { label: t("au_demoCompany"), user: null, welcome: t("au_demoCompanyWelcome") },
                { label: t("au_demoConsole"), user: DEMO_USERS["sophia.v@nexora.io"], welcome: t("au_demoConsoleWelcome") },
              ] as const
            ).map((demo) => (
              <button
                key={demo.label}
                type="button"
                onClick={async () => {
                  if (typeof window !== "undefined") {
                    sessionStorage.removeItem("saas_demo_logged_out")
                    // A previous employee or platform sign-in must not leak into this one
                    if (demo.user) sessionStorage.setItem("saas_demo_user", JSON.stringify(demo.user))
                    else sessionStorage.removeItem("saas_demo_user")
                    tokenStorage.set(DEMO_SESSION_TOKEN)
                  }
                  toast.success(demo.welcome)
                  // Full page load so the edge guard sees the new demo session cookie
                  // and no stale client redirect can keep the user on /auth.
                  // The Nexora team lands on its console, companies on their ERP
                  const path = demo.user?.platformOperator ? "/dashboard/console" : resolveAfterLoginPath(window.location.search)
                  const target = new URL(`/${locale}${path}`, window.location.origin)
                  window.location.replace(target.toString())
                }}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-1 cursor-pointer transition-colors"
              >
                {demo.label}
              </button>
            ))}
            <p className="text-center text-[11px] text-muted-foreground">
              {t("au_demoAccountsHint", { employee: "lina@atlas.example", client: "claire@orbit.example" })}
            </p>
          </div>
        )}

        <p className="pt-1 text-center text-xs text-muted-foreground">
          {t("au_noAccount")}{" "}
          <button
            type="button"
            onClick={() => setAuthSections("register")}
            className="font-medium text-info-foreground hover:underline cursor-pointer"
          >
            {t("au_signUp")}
          </button>
        </p>
      </div>
    </form>
  )
}
