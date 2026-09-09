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
import { resetPasswordApi } from "@/lib/api/auth-apis"
import { useMutation } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Rocket } from "lucide-react"
import { Dispatch, SetStateAction } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Highlighter } from "@/components/ui/highlighter"
import { useTranslations } from "next-intl"
import { toast } from "@/lib/utils/toast"

interface Props {
  setAuthSections: Dispatch<SetStateAction<AuthSections>>
}

const resetSchema = (t: (key: string) => string) =>
  z
    .object({
      password: z
        .string()
        .min(1, t("passwordRequired"))
        .min(6, t("passwordMinLength")),
      confirmPassword: z.string().min(1, t("confirmPasswordRequired")),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("passwordsDoNotMatch"),
      path: ["confirmPassword"],
    })

type ResetFormValues = z.infer<ReturnType<typeof resetSchema>>

export function ResetPassword({ setAuthSections }: Props) {
  const t = useTranslations()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema(t)),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  const resetMutation = useMutation({
    mutationFn: resetPasswordApi,
    onSuccess: () => {
      localStorage.removeItem("otpId")
      localStorage.removeItem("email")
      localStorage.removeItem("resetToken")
      toast.success(t("passwordResetSuccessfully"))
      setAuthSections("login-by-email")
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || error?.message || t("internalServer")
      toast.error(message)
    },
  })

  const onSubmit = (values: ResetFormValues) => {
    const resetToken = localStorage.getItem("resetToken") || ""

    if (!resetToken) {
      setAuthSections("forgot-password")
      return
    }

    resetMutation.mutate({
      resetToken,
      newPassword: values.password,
    })
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
              {t("reset")}
            </Highlighter>{" "}
            {t("password")}
          </h1>
          <FieldDescription className="text-center font-bold">
            {t("enterNewPassword")}
          </FieldDescription>
        </div>

        <Field data-invalid={!!errors.password}>
          <FieldLabel className="font-bold" htmlFor="password">
            {t("newPassword")}
          </FieldLabel>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            aria-invalid={!!errors.password}
            disabled={resetMutation.isPending}
            {...register("password")}
          />
          {errors.password?.message ? (
            <FieldError className="font-bold">
              {errors.password.message}
            </FieldError>
          ) : (
            <FieldDescription className="font-bold">
              {t("minimum6Characters")}
            </FieldDescription>
          )}
        </Field>

        <Field data-invalid={!!errors.confirmPassword}>
          <FieldLabel className="font-bold" htmlFor="confirmPassword">
            {t("confirmPassword")}
          </FieldLabel>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            aria-invalid={!!errors.confirmPassword}
            disabled={resetMutation.isPending}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword?.message ? (
            <FieldError className="font-bold">
              {errors.confirmPassword.message}
            </FieldError>
          ) : (
            <FieldDescription className="font-bold">
              {t("reEnterPassword")}
            </FieldDescription>
          )}
        </Field>

        <Field>
          <Button
            type="submit"
            disabled={resetMutation.isPending}
            className="w-full"
            variant={"primary"}
          >
            {resetMutation.isPending && (
              <Loader2 className="mr-2 size-4 animate-spin" />
            )}
            {resetMutation.isPending ? t("resetting") : t("resetPassword")}
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
