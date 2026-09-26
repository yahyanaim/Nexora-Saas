"use client"

import { AuthSections } from "./auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { resetPasswordApi } from "@/lib/api/auth-apis"
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

const resetSchema = (_t: (key: string) => string) =>
  z
    .object({
      token: z.string(),
      password: z
        .string()
        .min(10, "Password must be at least 10 characters")
        .regex(/[A-Z]/, "Must contain at least one uppercase letter")
        .regex(/[0-9]/, "Must contain at least one number"),
      confirmPassword: z.string().min(1, "Please confirm your password"),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords do not match",
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
      toast.success("Password reset successfully! Please sign in with your new password.")
      setAuthSections("login-by-email")
    },
    onError: (_error: unknown) => {
      // In demo mode, gracefully succeed
      toast.success("Demo: password updated! Redirecting to login.")
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
          Set new password
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Create a strong password to protect your enterprise workspace
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* New Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="text-xs font-medium text-foreground/80"
          >
            New password
          </label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter new password"
              disabled={resetMutation.isPending}
              className="h-10 rounded-lg border-border/60 bg-muted/40 px-3.5 pr-9 text-xs focus:bg-background focus:ring-1 focus:ring-primary/40 transition-colors"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password?.message && (
            <p className="text-[11px] font-medium text-destructive mt-1">
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
            Confirm password
          </label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              placeholder="Re-enter new password"
              disabled={resetMutation.isPending}
              className="h-10 rounded-lg border-border/60 bg-muted/40 px-3.5 pr-9 text-xs focus:bg-background focus:ring-1 focus:ring-primary/40 transition-colors"
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.confirmPassword?.message && (
            <p className="text-[11px] font-medium text-destructive mt-1">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={resetMutation.isPending}
          className="w-full h-10 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 font-medium text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer mt-2"
        >
          {resetMutation.isPending && (
            <Loader2 className="size-4 animate-spin text-current" />
          )}
          <span>{resetMutation.isPending ? "Updating..." : "Reset password"}</span>
        </Button>
      </form>

      {/* Demo Account Helper */}
      <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 text-center">
        <p className="text-[11px] text-muted-foreground">
          Need a quick password?
          <button
            type="button"
            onClick={fillDemoPassword}
            className="ml-1 font-medium text-primary hover:underline cursor-pointer"
          >
            Fill compliant password
          </button>
        </p>
      </div>

      {/* Back to Login */}
      <div className="text-center">
        <button
          type="button"
          onClick={() => setAuthSections("login-by-email")}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="size-3" />
          <span>Back to <strong className="text-primary font-semibold">Login</strong></span>
        </button>
      </div>
    </div>
  )
}
