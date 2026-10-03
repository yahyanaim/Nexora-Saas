"use client"

import { Input } from "@/components/ui/input"
import { resolveAfterLoginPath } from "@/lib/auth/safe-redirect"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "@/components/ui/carbon/icons"
import { Dispatch, SetStateAction } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { AuthSections } from "./auth"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useTranslations, useLocale } from "next-intl"
import { useMutation } from "@tanstack/react-query"
import { loginApi, isDemoMode } from "@/lib/api/auth-apis"
import { tokenStorage } from "@/lib/myapi/token-storage"
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
        toast.info("Two-factor authentication required. Enter your 6-digit code.")
      } else {
        toast.success("Welcome back!")
        // Navigates to the safe ?next path (or the overview)
        await initializeAuth(true)
      }
    },
    onError: (error: unknown) => {
      toast.error(apiErrorMessage(error, t("loginFailed")))
    },
  })

  const onSubmit = (values: LoginFormValues) => {
    mutate(values)
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mx-auto flex w-full max-w-sm flex-col gap-6"
    >
      <div className="flex flex-col gap-1 text-left">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="text-xs text-muted-foreground">
          Enter your credentials to access your account
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-xs font-medium text-foreground"
          >
            Work email
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
              Password
            </label>
            <button
              type="button"
              onClick={() => setAuthSections("forgot-password")}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Forgot?
            </button>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
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
          Continue
        </button>

        {isDemoMode() && (
          <button
            type="button"
            onClick={async () => {
              if (typeof window !== "undefined") {
                sessionStorage.removeItem("saas_demo_logged_out")
                tokenStorage.set("demo-session-token")
              }
              toast.success("Welcome! Exploring SaaS as Demo Administrator.")
              // Full page load so the edge guard sees the new demo session cookie
              // and no stale client redirect can keep the user on /auth.
              const target = new URL(
                `/${locale}${resolveAfterLoginPath(window.location.search)}`,
                window.location.origin
              )
              window.location.replace(target.toString())
            }}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-1 cursor-pointer transition-colors"
          >
            Or continue with Instant Demo Preview →
          </button>
        )}

        <p className="pt-1 text-center text-xs text-muted-foreground">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            onClick={() => setAuthSections("register")}
            className="font-medium text-info-foreground hover:underline cursor-pointer"
          >
            Sign up
          </button>
        </p>
      </div>
    </form>
  )
}
