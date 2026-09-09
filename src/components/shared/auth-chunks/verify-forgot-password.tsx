"use client"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { sendOtpApi, verifyForgotPasswordApi } from "@/lib/api/auth-apis"
import { useMutation } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, RefreshCw, Rocket } from "lucide-react"
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useState,
} from "react"
import { useForm, Controller } from "react-hook-form"

import { z } from "zod"
import { AuthSections } from "./auth"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { Highlighter } from "@/components/ui/highlighter"
import { useTranslations } from "next-intl"
import { toast } from "@/lib/utils/toast"

interface Props {
  setAuthSections: Dispatch<SetStateAction<AuthSections>>
}

const verifyOtpSchema = (t: (key: string) => string) =>
  z.object({
    otp: z
      .string()
      .length(6, t("otpLength"))
      .regex(/^\d+$/, t("otpOnlyNumbers")),
  })

type VerifyOtpFormValues = z.infer<ReturnType<typeof verifyOtpSchema>>

export function VerifyForgotPassword({ setAuthSections }: Props) {
  const t = useTranslations()
  const otpId = localStorage.getItem("otpId") || ""
  const email = localStorage.getItem("email") || ""

  const [countdown, setCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true)
      return
    }

    setCanResend(false)
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [countdown])

  const startCountdown = useCallback(() => {
    setCountdown(60)
    setCanResend(false)
  }, [])

  const {
    control,
    handleSubmit,
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
      if (data?.resetToken) localStorage.setItem("resetToken", data?.resetToken)
      setAuthSections("reset-password")
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || error?.message || t("internalServer")
      toast.error(message)
    },
  })
  // Resend mutation
  const resendMutation = useMutation({
    mutationFn: sendOtpApi,
    onSuccess: (data) => {
      if (data?.otpId) localStorage.setItem("otpId", data?.otpId)
      startCountdown()
    },
  })
  const onSubmit = (values: VerifyOtpFormValues) => {
    verifyMutation.mutate({ otpId, otpCode: values.otp })
  }
  const handleResend = () => {
    if (!canResend || resendMutation.isPending) return
    resendMutation.mutate({ email, typeSend: "account-verification" })
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full max-w-xl flex-col gap-6"
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center">
          <Rocket className="size-25 text-primary md:size-30" />
          <h1 className="text-3xl font-bold md:min-h-[3.5rem] md:text-5xl">
            <Highlighter action="highlight" className="text-white">
              {t("verify")}
            </Highlighter>{" "}
            {t("otp")}
          </h1>
          <FieldDescription className="text-center font-bold">
            {t("enterOtpSentTo")}{" "}
            <span className="font-bold text-foreground">{email}</span>
          </FieldDescription>
        </div>

        <Field data-invalid={!!errors.otp}>
          <FieldLabel className="font-bold">{t("verificationCode")}</FieldLabel>
          <Controller
            name="otp"
            control={control}
            render={({ field }) => (
              <InputOTP
                maxLength={6}
                value={field.value}
                onChange={field.onChange}
                onComplete={handleSubmit(onSubmit)}
                disabled={verifyMutation.isPending}
              >
                <InputOTPGroup className="w-full gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="h-14 flex-1 rounded-md border bg-primary/20 text-2xl"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            )}
          />
          {errors.otp?.message ? (
            <FieldError className="font-bold">{errors.otp.message}</FieldError>
          ) : (
            <FieldDescription className="font-bold">
              {t("enter6DigitCode")}
            </FieldDescription>
          )}
        </Field>
        <Separator />
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-bold">{t("didntReceiveCode")}</div>
          <button
            type="button"
            onClick={handleResend}
            disabled={!canResend || resendMutation.isPending}
            className={cn(
              "flex items-center gap-1.5 text-sm font-bold transition-colors",
              canResend && !resendMutation.isPending
                ? "cursor-pointer text-primary hover:underline"
                : "cursor-not-allowed text-muted-foreground"
            )}
          >
            {resendMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t("sending")}
              </>
            ) : canResend ? (
              <>
                <RefreshCw className="size-4" />
                {t("resendCode")}
              </>
            ) : (
              <>
                <RefreshCw className="size-4" />
                {t("resendIn", { seconds: countdown })}
              </>
            )}
          </button>
        </div>

        <Field>
          <Button
            type="submit"
            disabled={verifyMutation.isPending}
            className="w-full"
            variant={"primary"}
          >
            {verifyMutation.isPending && (
              <Loader2 className="mr-2 size-4 animate-spin" />
            )}
            {verifyMutation.isPending ? t("verifying") : t("verify")}
          </Button>
        </Field>
        <div className="text-center">
          <button
            type="button"
            onClick={() => setAuthSections("login-by-email")}
            className="cursor-pointer font-bold text-primary underline-offset-4 hover:underline"
          >
            {t("backToSignIn")}
          </button>
        </div>
      </FieldGroup>
    </form>
  )
}
