"use client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, UserRoundKey } from "lucide-react"
import { Dispatch, SetStateAction } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { AuthSections } from "./auth"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Highlighter } from "@/components/ui/highlighter"
import { useTranslations } from "next-intl"
import { useMutation } from "@tanstack/react-query"
import { loginApi } from "@/lib/api/auth-apis"
import { toast } from "@/lib/utils/toast"

interface Props {
  setAuthSections: Dispatch<SetStateAction<AuthSections>>
}

const loginSchema = (t: (key: string) => string) =>
  z.object({
    email: z.string().min(1, t("emailRequired")).email(t("validEmail")),
    password: z
      .string()
      .min(1, t("passwordRequired"))
      .min(6, t("passwordMinLength")),
  })

type LoginFormValues = z.infer<ReturnType<typeof loginSchema>>

export function LoginByEmail({ setAuthSections }: Props) {
  const t = useTranslations()
  const { initializeAuth } = useAuthGuard()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema(t)),
    defaultValues: {
      email: "admin@volix.saas.com",
      password: "Aa123456",
    },
  })
  const { mutate, isPending } = useMutation({
    mutationFn: loginApi,
  })

  const onSubmit = async (values: LoginFormValues) => {
    mutate(values, {
      onSuccess: (data) => {
        if (data?.otpId) {
          if (data?.otpId) localStorage.setItem("otpId", data?.otpId)
          if (data?.email) localStorage.setItem("email", data?.email)
          setAuthSections("very-account")
        } else {
          initializeAuth(true)
        }
      },
      onError: (error: any) => {
        const message =
          error?.response?.data?.message || error?.message || t("loginFailed")
        toast.error(message)
      },
    })
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mx-auto flex w-full max-w-xl flex-col gap-6"
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center">
          <UserRoundKey className="size-25 text-primary md:size-30" />
          <h1 className="text-3xl font-bold md:min-h-[3.5rem] md:text-5xl">
            {t("signIn")}{" "}
            <Highlighter action="highlight" className="text-white">
              {t("admin")}
            </Highlighter>
          </h1>
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
            disabled={isPending}
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

        <Field data-invalid={!!errors.password}>
          <div className="flex items-center justify-between">
            <FieldLabel className="font-bold" htmlFor="password">
              {t("password")}
            </FieldLabel>
            <button
              type="button"
              onClick={() => setAuthSections("forgot-password")}
              className="cursor-pointer text-sm font-bold text-primary underline-offset-4 hover:underline"
            >
              {t("forgotPassword")}
            </button>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            aria-invalid={!!errors.password}
            disabled={isPending}
            {...register("password")}
          />
          {errors.password?.message ? (
            <FieldError className="font-bold">
              {errors.password.message}
            </FieldError>
          ) : (
            <FieldDescription className="font-bold">
              {t("enterPassword")}{" "}
              <Highlighter action="underline">
                {t("passwordMinChars")}
              </Highlighter>
            </FieldDescription>
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
            {isPending ? t("waiting") : t("signIn")}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
