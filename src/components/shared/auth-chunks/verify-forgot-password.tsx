"use client"

import { Button } from "@/components/ui/button"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "@/components/ui/carbon/icons"
import { ArrowLeft } from "lucide-react"
import { Dispatch, SetStateAction } from "react"
import { useForm, Controller } from "react-hook-form"
import { z } from "zod"
import { AuthSections } from "./auth"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { useMutation } from "@tanstack/react-query"
import { isDemoMode, verifyForgotPasswordApi } from "@/lib/api/auth-apis"
import { apiErrorMessage } from "@/lib/myapi/client"

interface Props {
  setAuthSections: Dispatch<SetStateAction<AuthSections>>
  email?: string
  setResetToken?: (token: string) => void
}

const verifyOtpSchema = (t: (key: string) => string) =>
  z.object({
    otp: z
      .string()
      .length(6, t("au_codeLength"))
      .regex(/^\d+$/, t("au_codeDigits")),
  })

type VerifyOtpFormValues = z.infer<ReturnType<typeof verifyOtpSchema>>

export function VerifyForgotPassword({ setAuthSections, email, setResetToken }: Props) {
  const t = useTranslations()

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<VerifyOtpFormValues>({
    resolver: zodResolver(verifyOtpSchema(t)),
    defaultValues: {
      otp: "",
    },
  })

  const verifyMutation = useMutation({
    mutationFn: verifyForgotPasswordApi,
    onSuccess: (data) => {
      if (data?.resetToken) {
        setResetToken?.(data.resetToken)
      }
      toast.success(t("au_codeVerified"))
      setAuthSections("reset-password")
    },
    onError: (err: unknown) => {
      toast.error(apiErrorMessage(err, t("au_codeInvalidExpired")))
    },
  })

  const isVerifying = verifyMutation.isPending

  const onSubmit = (values: VerifyOtpFormValues) => {
    verifyMutation.mutate({
      otpCode: values.otp,
      otpId: email || "email",
    })
  }

  const fillDemoCode = () => {
    setValue("otp", "123456", { shouldValidate: true })
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t("au_enterCodeTitle")}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {t("au_enterCodeHint", { email: email || t("au_yourWorkEmail") })}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* OTP Input Field */}
        <div className="space-y-2">
          <label htmlFor="otp" className="text-xs font-medium text-foreground/80 block text-center">
            {t("au_codeLabel")}
          </label>
          <div className="flex justify-center py-1">
            <Controller
              name="otp"
              control={control}
              render={({ field }) => (
                <InputOTP
                  maxLength={6}
                  value={field.value}
                  onChange={field.onChange}
                >
                  <InputOTPGroup className="gap-1.5">
                    <InputOTPSlot index={0} className="h-10 w-10 rounded-md border-border/60 text-sm tabular-nums" />
                    <InputOTPSlot index={1} className="h-10 w-10 rounded-md border-border/60 text-sm tabular-nums" />
                    <InputOTPSlot index={2} className="h-10 w-10 rounded-md border-border/60 text-sm tabular-nums" />
                    <InputOTPSlot index={3} className="h-10 w-10 rounded-md border-border/60 text-sm tabular-nums" />
                    <InputOTPSlot index={4} className="h-10 w-10 rounded-md border-border/60 text-sm tabular-nums" />
                    <InputOTPSlot index={5} className="h-10 w-10 rounded-md border-border/60 text-sm tabular-nums" />
                  </InputOTPGroup>
                </InputOTP>
              )}
            />
          </div>
          {errors.otp?.message && (
            <p className="text-center text-xs font-medium text-destructive mt-1">
              {errors.otp.message}
            </p>
          )}
        </div>

        {/* Continue Button */}
        <Button
          type="submit"
          disabled={isVerifying}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 cursor-pointer"
        >
          {isVerifying && <Loader2 className="size-4 animate-spin text-current" />}
          <span>{isVerifying ? t("verifying") : t("au_continue")}</span>
        </Button>
      </form>

      {/* Demo Code Helper */}
      {isDemoMode() && (
        <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 text-center">
          <p className="text-xs text-muted-foreground">
            {t("au_testingLocally")}
            <button
              type="button"
              onClick={fillDemoCode}
              className="ms-1 font-medium text-primary hover:underline cursor-pointer"
            >
              {t("au_fillDemoCode")}
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
