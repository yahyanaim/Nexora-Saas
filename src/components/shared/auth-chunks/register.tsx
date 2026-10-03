"use client"

import { Input } from "@/components/ui/input"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "@/components/ui/carbon/icons"
import { Dispatch, SetStateAction } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { AuthSections } from "./auth"
import { useTranslations } from "next-intl"
import { useMutation } from "@tanstack/react-query"
import { registerApi } from "@/lib/api/auth-apis"
import { toast } from "sonner"
import { apiErrorMessage } from "@/lib/myapi/client"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"

interface Props {
  setAuthSections: Dispatch<SetStateAction<AuthSections>>
}

const registerSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(2, "Username must be at least 2 characters"),
    email: z.string().min(1, t("emailRequired")).email(t("validEmail")),
    password: z.string().min(10, "Password must be at least 10 characters"),
  })

type RegisterFormValues = z.infer<ReturnType<typeof registerSchema>>

export function RegisterForm({ setAuthSections }: Props) {
  const t = useTranslations()
  const { initializeAuth } = useAuthGuard()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema(t)),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  })

  const { mutate, isPending } = useMutation({
    mutationFn: registerApi,
    onSuccess: () => {
      toast.success("Account created successfully!")
      initializeAuth(true)
    },
    onError: (error: unknown) => {
      toast.error(apiErrorMessage(error, "Registration failed"))
    },
  })

  const onSubmit = (values: RegisterFormValues) => {
    mutate({
      name: values.name,
      email: values.email,
      password: values.password,
    })
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mx-auto flex w-full max-w-sm flex-col gap-6"
    >
      <div className="flex flex-col gap-1 text-left">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Get started
        </h1>
        <p className="text-xs text-muted-foreground">
          Create an account to get started
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="username"
            className="block text-xs font-medium text-foreground"
          >
            Username
          </label>
          <Input
            id="username"
            type="text"
            placeholder="Enter your username"
            className="h-10 rounded-md border-border/50 bg-muted/40 px-3.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 focus:bg-background"
            disabled={isPending}
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-xs font-medium text-foreground"
          >
            Work email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="rico@acme.com"
            className="h-10 rounded-md border-border/50 bg-muted/40 px-3.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 focus:bg-background"
            disabled={isPending}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block text-xs font-medium text-foreground"
          >
            Password
          </label>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            className="h-10 rounded-md border-border/50 bg-muted/40 px-3.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 focus:bg-background"
            disabled={isPending}
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 cursor-pointer mt-2"
        >
          {isPending && <Loader2 className="mr-2 size-3.5 animate-spin" />}
          Continue
        </button>

        <p className="pt-1 text-center text-xs text-muted-foreground">
          Already have account?{" "}
          <button
            type="button"
            onClick={() => setAuthSections("login-by-email")}
            className="font-medium text-info-foreground hover:underline cursor-pointer"
          >
            Login
          </button>
        </p>
      </div>
    </form>
  )
}
