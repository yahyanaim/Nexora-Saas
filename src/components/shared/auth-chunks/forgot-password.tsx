"use client"

import { AuthSections } from "./auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { forgotPasswordApi } from "@/lib/api/auth-apis"
import { useMutation } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "@/components/ui/carbon/icons"
import { ArrowLeft } from "lucide-react"
import { Dispatch, SetStateAction } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

interface Props {
  setAuthSections: Dispatch<SetStateAction<AuthSections>>
  setEmailForReset?: (email: string) => void
}

const forgotSchema = (t: (key: string) => string) =>
  z.object({
    email: z.string().min(1, t("emailRequired")).email(t("validEmail")),
  })

type ForgotFormValues = z.infer<ReturnType<typeof forgotSchema>>

export function ForgotPassword({ setAuthSections, setEmailForReset }: Props) {
  const t = useTranslations()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema(t)),
    defaultValues: {
      email: "",
    },
  })

  const sendResetMutation = useMutation({
    mutationFn: forgotPasswordApi,
    onSuccess: (data, variables) => {
      const email = typeof variables === "string" ? variables : variables.email
      setEmailForReset?.(email)
      toast.success(
        data?.message || "If an account exists, a 6-digit reset code has been sent."
      )
      setAuthSections("very-forgot-password")
    },
    onError: (_error: unknown) => {
      // In demo mode, still allow seamless verification
      toast.info("Demo mode: verification code sent (code: 123456)")
      setAuthSections("very-forgot-password")
    },
  })

  const onSubmit = (values: ForgotFormValues) => {
    sendResetMutation.mutate(values.email)
  }

  const fillDemoEmail = () => {
    setValue("email", "alex.morgan@company.io", { shouldValidate: true })
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      {/* Header matching Register and Login */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Reset password
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Enter your work email to receive password reset instructions
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Work Email Field */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-medium text-foreground/80">
            Work email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="rico@acme.com"
            disabled={sendResetMutation.isPending}
            className="h-10 rounded-lg border-border/60 bg-muted/40 px-3.5 text-xs focus:bg-background focus:ring-1 focus:ring-primary/40 transition-colors"
            {...register("email")}
          />
          {errors.email?.message && (
            <p className="text-[11px] font-medium text-destructive mt-1">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Continue / Submit Button */}
        <Button
          type="submit"
          disabled={sendResetMutation.isPending}
          className="w-full h-10 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 font-medium text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer mt-2"
        >
          {sendResetMutation.isPending && (
            <Loader2 className="size-4 animate-spin text-current" />
          )}
          <span>{sendResetMutation.isPending ? "Sending..." : "Continue"}</span>
        </Button>
      </form>

      {/* Demo Account Quick-Fill */}
      <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 text-center">
        <p className="text-[11px] text-muted-foreground">
          Demo environment active.
          <button
            type="button"
            onClick={fillDemoEmail}
            className="ml-1 font-medium text-primary hover:underline cursor-pointer"
          >
            Fill demo email
          </button>
        </p>
      </div>

      {/* Back to Login Link */}
      <div className="text-center">
        <button
          type="button"
          onClick={() => setAuthSections("login-by-email")}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="size-3" />
          <span>Remember your password? <strong className="text-primary font-semibold">Login</strong></span>
        </button>
      </div>
    </div>
  )
}
