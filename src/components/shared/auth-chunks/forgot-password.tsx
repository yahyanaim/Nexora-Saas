"use client"

import { AuthSections } from "./auth"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { forgotPasswordApi } from "@/lib/api/auth-apis"
import { useMutation } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, RotateCcwKey } from "lucide-react"
import { Dispatch, SetStateAction } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Highlighter } from "@/components/ui/highlighter"
import { useTranslations } from "next-intl"
import { toast } from "@/lib/utils/toast"

interface Props {
  setAuthSections: Dispatch<SetStateAction<AuthSections>>
}

const forgotSchema = (t: (key: string) => string) =>
  z.object({
    email: z.string().min(1, t("emailRequired")).email(t("validEmail")),
  })

type ForgotFormValues = z.infer<ReturnType<typeof forgotSchema>>

export function ForgotPassword({ setAuthSections }: Props) {
  const t = useTranslations()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema(t)),
    defaultValues: {
      email: "",
    },
  })

  const sendOtpMutation = useMutation({
    mutationFn: forgotPasswordApi,
    onSuccess: (data) => {
      const otpId = data?.otpId
      const email = data?.email

      if (otpId) localStorage.setItem("otpId", otpId)
      if (email) localStorage.setItem("email", email)

      setAuthSections("very-forgot-password")
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || error?.message || t("internalServer")
      toast.error(message)
    },
  })

  const onSubmit = (values: ForgotFormValues) => {
    sendOtpMutation.mutate({
      email: values.email,
    })
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mx-auto flex w-full max-w-xl flex-col gap-6"
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center">
          <RotateCcwKey className="size-25 text-primary md:size-28" />
          <h1 className="text-3xl font-bold md:min-h-[3.5rem] md:text-5xl">
            <Highlighter action="highlight" className="text-white">
              {t("forgot")}
            </Highlighter>{" "}
            {t("passwordQuestion")}
          </h1>
          <FieldDescription className="font-bold">
            {t("forgotPasswordDescription")}
          </FieldDescription>
        </div>

        <Field data-invalid={!!errors.email}>
          <FieldLabel className="font-bold" htmlFor="email">
            {t("email")}
          </FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            aria-invalid={!!errors.email}
            disabled={sendOtpMutation.isPending}
            {...register("email")}
          />
          {errors.email?.message ? (
            <FieldError className="font-bold">
              {errors.email.message}
            </FieldError>
          ) : (
            <FieldDescription className="font-bold">
              {t("enterRegisteredEmail")}
            </FieldDescription>
          )}
        </Field>

        <Field>
          <Button
            type="submit"
            disabled={sendOtpMutation.isPending}
            className="w-full"
            variant={"primary"}
          >
            {sendOtpMutation.isPending && (
              <Loader2 className="mr-2 size-4 animate-spin" />
            )}
            {sendOtpMutation.isPending ? t("sending") : t("sendOtp")}
          </Button>
        </Field>
      </FieldGroup>

      <div className="text-center">
        <button
          type="button"
          onClick={() => setAuthSections("login-by-email")}
          className="cursor-pointer font-bold text-primary underline-offset-4 hover:underline"
        >
          {t("backToSignIn")}
        </button>
      </div>
    </form>
  )
}
