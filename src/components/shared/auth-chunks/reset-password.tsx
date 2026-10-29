"use client"

import { AuthSections } from "./auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { isDemoMode, resetPasswordApi } from "@/lib/api/auth-apis"
import { apiErrorMessage } from "@/lib/myapi/client"
import { newPasswordField, PASSWORD_MIN } from "@/lib/auth/password"
import { useMutation } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "@/components/ui/carbon/icons"
import { ArrowLeft, Eye, EyeOff } from "lucide-react"
import { Dispatch, SetStateAction, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

interface Props {
  setAuthSections: Dispatch<SetStateAction<AuthSections>>
  token?: string
}

const resetSchema = (t: (key: string, values?: Record<string, string | number>) => string) =>
  z
    .object({
      token: z.string(),
      password: newPasswordField(t),
      confirmPassword: z.string().min(1, t("confirmPasswordRequired")),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("passwordsDoNotMatch"),
      path: ["confirmPassword"],
    })

type ResetFormValues = z.infer<ReturnType<typeof resetSchema>>

export function ResetPassword({ setAuthSections, token = "valid-reset-token" }: Props) {
  const t = useTranslations()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema(t)),
    defaultValues: {
      token: token || "valid-reset-token",
      password: "",
      confirmPassword: "",
    },
  })

  const resetMutation = useMutation({
    mutationFn: resetPasswordApi,
    onSuccess: () => {
      toast.success(t("au_resetDone"))
      setAuthSections("login-by-email")
    },
    onError: (error: unknown) => {
      // Only the demo carries on without a server; a real failure says so
      if (!isDemoMode()) {
        toast.error(apiErrorMessage(error, t("au_resetFailed")))
        return
      }
      toast.success(t("au_demoResetDone"))
      setAuthSections("login-by-email")
    },
  })

  const onSubmit = (values: ResetFormValues) => {
    resetMutation.mutate({
      token: values.token || token || "valid-reset-token",
      newPassword: values.password,
      confirmNewPassword: values.confirmPassword,
    })
  }

  const fillDemoPassword = () => {
    setValue("password", "Enterprise@2026", { shouldValidate: true })
    setValue("confirmPassword", "Enterprise@2026", { shouldValidate: true })
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t("au_setNewPassword")}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {t("au_setNewPasswordHint", { min: PASSWORD_MIN })}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* New Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="text-xs font-medium text-foreground/80"
          >
            {t("au_newPassword")}
          </label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder={t("au_newPasswordPlaceholder")}
              disabled={resetMutation.isPending}
              className="h-10 rounded-lg border-border/60 bg-muted/40 px-3.5 pr-9 text-xs focus:bg-background focus:ring-1 focus:ring-primary/40 transition-colors"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? t("au_hidePassword") : t("au_showPassword")}
              aria-pressed={showPassword}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password?.message && (
            <p className="text-xs font-medium text-destructive mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="confirmPassword"
            className="text-xs font-medium text-foreground/80"
          >
            {t("au_confirmPassword")}
          </label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              placeholder={t("au_reenterPlaceholder")}
              disabled={resetMutation.isPending}
              className="h-10 rounded-lg border-border/60 bg-muted/40 px-3.5 pr-9 text-xs focus:bg-background focus:ring-1 focus:ring-primary/40 transition-colors"
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              aria-label={showConfirm ? t("au_hidePassword") : t("au_showPassword")}
              aria-pressed={showConfirm}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.confirmPassword?.message && (
            <p className="text-xs font-medium text-destructive mt-1">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={resetMutation.isPending}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 cursor-pointer mt-2"
        >
          {resetMutation.isPending && (
            <Loader2 className="size-4 animate-spin text-current" />
          )}
          <span>{resetMutation.isPending ? t("au_updating") : t("au_resetTitle")}</span>
        </Button>
      </form>

      {/* Demo Account Helper */}
      {isDemoMode() && (
        <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 text-center">
          <p className="text-xs text-muted-foreground">
            {t("au_quickPassword")}
            <button
              type="button"
              onClick={fillDemoPassword}
              className="ms-1 font-medium text-primary hover:underline cursor-pointer"
            >
              {t("au_fillPassword")}
            </button>
          </p>
        </div>
      )}

      {/* Back to Login */}
      <div className="text-center">
        <button
          type="button"
          onClick={() => setAuthSections("login-by-email")}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="size-3 rtl:rotate-180" />
          <span>{t.rich("au_backToLogin", { b: (chunks) => <strong className="text-primary font-semibold">{chunks}</strong> })}</span>
        </button>
      </div>
    </div>
  )
}
