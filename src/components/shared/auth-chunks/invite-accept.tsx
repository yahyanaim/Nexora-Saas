"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, MailCheck } from "@/components/ui/carbon/icons"
import { Dispatch, SetStateAction } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { AuthSections } from "./auth"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Highlighter } from "@/components/ui/highlighter"
import { useMutation } from "@tanstack/react-query"
import { acceptInviteApi } from "@/lib/api/auth-apis"
import { toast } from "sonner"
import { apiErrorMessage } from "@/lib/myapi/client"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useTranslations } from "next-intl"
import { newPasswordField } from "@/lib/auth/password"

interface Props {
  setAuthSections: Dispatch<SetStateAction<AuthSections>>
  token?: string
}

const inviteSchema = (t: (key: string, values?: Record<string, string | number>) => string) =>
  z
    .object({
      token: z.string().min(1, t("au_tokenRequired")),
      name: z.string().optional(),
      password: newPasswordField(t),
      confirmPassword: z.string().min(1, t("confirmPasswordRequired")),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("passwordsDoNotMatch"),
      path: ["confirmPassword"],
    })

type InviteFormValues = z.infer<ReturnType<typeof inviteSchema>>

export function InviteAcceptForm({ setAuthSections, token = "" }: Props) {
  const t = useTranslations()
  const { initializeAuth } = useAuthGuard()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema(t)),
    defaultValues: {
      token,
      name: "",
      password: "",
      confirmPassword: "",
    },
  })

  const { mutate, isPending } = useMutation({
    mutationFn: acceptInviteApi,
    onSuccess: () => {
      toast.success(t("au_welcomeAboard"))
      initializeAuth(true)
    },
    onError: (error: unknown) => {
      toast.error(apiErrorMessage(error, t("au_inviteFailed")))
    },
  })

  const onSubmit = (values: InviteFormValues) => {
    mutate({
      token: values.token,
      name: values.name?.trim() || undefined,
      password: values.password,
      confirmPassword: values.confirmPassword,
    })
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mx-auto flex w-full max-w-xl flex-col gap-6"
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center">
          <MailCheck className="size-20 text-primary md:size-24" />
          <h1 className="text-3xl font-bold md:min-h-[3.5rem] md:text-5xl">
            {t.rich("au_acceptInvitation", {
              hl: (chunks) => (
                <Highlighter action="highlight" className="text-white">
                  {chunks}
                </Highlighter>
              ),
            })}
          </h1>
          <FieldDescription className="font-bold">
            {t("au_inviteHint")}
          </FieldDescription>
        </div>

        {!token && (
          <Field data-invalid={!!errors.token}>
            <FieldLabel className="font-bold" htmlFor="token">
              {t("au_inviteToken")}
            </FieldLabel>
            <Input
              id="token"
              type="text"
              placeholder={t("au_inviteTokenPlaceholder")}
              disabled={isPending}
              {...register("token")}
            />
            {errors.token && (
              <FieldError className="font-bold">
                {errors.token.message}
              </FieldError>
            )}
          </Field>
        )}

        <Field data-invalid={!!errors.name}>
          <FieldLabel className="font-bold" htmlFor="name">
            {t("au_fullName")} <span className="text-muted-foreground font-normal">{t("au_optional")}</span>
          </FieldLabel>
          <Input
            id="name"
            type="text"
            placeholder="Jane Doe"
            disabled={isPending}
            {...register("name")}
          />
        </Field>

        <Field data-invalid={!!errors.password}>
          <FieldLabel className="font-bold" htmlFor="password">
            {t("password")}
          </FieldLabel>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            disabled={isPending}
            {...register("password")}
          />
          {errors.password && (
            <FieldError className="font-bold">
              {errors.password.message}
            </FieldError>
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
            disabled={isPending}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <FieldError className="font-bold">
              {errors.confirmPassword.message}
            </FieldError>
          )}
        </Field>

        <Field>
          <Button
            type="submit"
            variant={"primary"}
            disabled={isPending}
            className="w-full"
          >
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isPending ? t("au_joining") : t("au_joinWorkspace")}
          </Button>
        </Field>

        <div className="text-center text-sm font-medium">
          {t("au_haveAccount")}{" "}
          <button
            type="button"
            onClick={() => setAuthSections("login-by-email")}
            className="cursor-pointer font-bold text-primary underline-offset-4 hover:underline"
          >
            {t("au_signInLink")}
          </button>
        </div>
      </FieldGroup>
    </form>
  )
}
