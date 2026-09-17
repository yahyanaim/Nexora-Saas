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
import { verify2FaApi, requestVerificationApi } from "@/lib/api/auth-apis"
import { useMutation } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, ShieldCheck } from "@/components/ui/carbon/icons"
import {
  Dispatch,
  SetStateAction,
  useState,
} from "react"
import { useForm, Controller } from "react-hook-form"
import { z } from "zod"
import { AuthSections } from "./auth"
import { Highlighter } from "@/components/ui/highlighter"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { apiErrorMessage } from "@/lib/myapi/client"

interface Props {
  setAuthSections: Dispatch<SetStateAction<AuthSections>>
  mfaToken?: string
  email?: string
}

const verifyOtpSchema = (t: (key: string) => string) =>
  z.object({
    otp: z
      .string()
      .length(6, t("otpLength"))
      .regex(/^\d+$/, t("otpOnlyNumbers")),
  })

type VerifyOtpFormValues = z.infer<ReturnType<typeof verifyOtpSchema>>

export function VerifyAccount({ setAuthSections, mfaToken = "", email = "" }: Props) {
  const t = useTranslations()
  const { initializeAuth } = useAuthGuard()
  const [resending, setResending] = useState(false)

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

  const verify2FaMutation = useMutation({
    mutationFn: verify2FaApi,
    onSuccess: () => {
      toast.success("Verification successful!")
      initializeAuth(true)
    },
    onError: (error: unknown) => {
      toast.error(apiErrorMessage(error, "Invalid verification code"))
    },
  })

  const onSubmit = (values: VerifyOtpFormValues) => {
    if (mfaToken) {
      verify2FaMutation.mutate({
        mfaToken,
        code: values.otp,
      })
    } else {
      toast.info("Verifying code...")
      initializeAuth(true)
    }
  }

  const handleResend = async () => {
    if (!email) {
      toast.error("No email specified")
      return
    }
    setResending(true)
    try {
      await requestVerificationApi(email)
      toast.success("Verification code resent to your email")
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, "Could not resend code"))
    } finally {
      setResending(false)
    }
  }

  const isPending = verify2FaMutation.isPending || resending

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mx-auto flex w-full max-w-xl flex-col gap-6"
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center">
          <ShieldCheck className="size-25 text-primary md:size-30" />
          <h1 className="text-3xl font-bold md:min-h-[3.5rem] md:text-5xl">
            {t("verify")}{" "}
            <Highlighter action="highlight" className="text-white">
              {mfaToken ? "2FA Code" : t("account")}
            </Highlighter>
          </h1>
          <FieldDescription className="font-bold">
            {mfaToken
              ? "Enter the 6-digit code from your authenticator app"
              : t("enterOtpCode")}
          </FieldDescription>
        </div>

        <Field data-invalid={!!errors.otp}>
          <FieldLabel className="font-bold" htmlFor="otp">
            {t("otpCode")}
          </FieldLabel>
          <div className="flex justify-center">
            <Controller
              name="otp"
              control={control}
              render={({ field }) => (
                <InputOTP
                  maxLength={6}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isPending}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              )}
            />
          </div>
          {errors.otp?.message && (
            <FieldError className="font-bold text-center">
              {errors.otp.message}
            </FieldError>
          )}
        </Field>

        <Field>
          <Button
            type="submit"
            disabled={isPending}
            className="w-full"
            variant={"primary"}
          >
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isPending ? t("verifying") : t("verifyAccount")}
          </Button>
        </Field>

        {email && (
          <div className="text-center text-sm font-medium">
            Didn&apos;t receive a code?{" "}
            <button
              type="button"
              onClick={handleResend}
              disabled={isPending}
              className="cursor-pointer font-bold text-primary underline-offset-4 hover:underline"
            >
              Resend
            </button>
          </div>
        )}

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
