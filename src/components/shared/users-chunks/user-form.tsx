"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useImperativeHandle, forwardRef } from "react"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { User, UserStatus, UserType } from "@/types/users"
import {
  getUserFormSchema,
  UserFormValues,
} from "@/hooks/users/user-form-schema"
import { useTranslations } from "next-intl"

export interface UserFormHandle {
  submit: () => void
}

interface UserFormProps {
  mode: "create" | "edit"
  defaultValues?: Partial<User>
  onValid: (values: UserFormValues) => void
}

export const UserForm = forwardRef<UserFormHandle, UserFormProps>(
  function UserForm({ mode, defaultValues, onValid }, ref) {
    const t = useTranslations()

    const form = useForm<UserFormValues>({
      resolver: zodResolver(getUserFormSchema(mode)),
      defaultValues: {
        name: defaultValues?.name ?? "",
        username: defaultValues?.username ?? "",
        email: defaultValues?.email ?? "",
        password: "",
        userType: UserType.USER,
        status: defaultValues?.status ?? UserStatus.NOT_VERIFIED,
        is2FA: false,
        bio: defaultValues?.bio ?? "",
      },
    })

    useEffect(() => {
      form.reset({
        name: defaultValues?.name ?? "",
        username: defaultValues?.username ?? "",
        email: defaultValues?.email ?? "",
        password: "",
        userType: UserType.USER,
        status: defaultValues?.status ?? UserStatus.NOT_VERIFIED,
        is2FA: false,
        bio: defaultValues?.bio ?? "",
      })
    }, [
      defaultValues?.id,
      defaultValues?.name,
      defaultValues?.username,
      defaultValues?.email,
      defaultValues?.status,
      defaultValues?.bio,
      form,
    ])

    useImperativeHandle(ref, () => ({
      submit: () => form.handleSubmit(onValid)(),
    }))

    return (
      <Form {...form}>
        <form className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("fullName")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("fullName")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("username")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("username")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("email")}</FormLabel>
                <FormControl>
                  <Input type="email" placeholder={t("email")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {mode === "create" && (
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("password")}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("status")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full py-6">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={UserStatus.ACTIVE}>
                      {t("active")}
                    </SelectItem>
                    <SelectItem value={UserStatus.INACTIVE}>
                      {t("inactive")}
                    </SelectItem>
                    <SelectItem value={UserStatus.NOT_VERIFIED}>
                      {t("notVerified")}
                    </SelectItem>
                    <SelectItem value={UserStatus.BANNED}>
                      {t("banned")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("bio")}</FormLabel>
                <FormControl>
                  <Textarea
                    className="min-h-30"
                    rows={3}
                    placeholder={t("shortBio")}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    )
  }
)
