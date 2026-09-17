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
import { PermissionsSelector } from "./permissions-selector"
import { Role } from "@/types/roles"
import {
  getRoleFormSchema,
  RoleFormValues,
} from "@/hooks/roles/role-form-schema"
import { useTranslations } from "next-intl"

export interface RoleFormHandle {
  submit: () => void
}

interface RoleFormProps {
  mode: "create" | "edit"
  defaultValues?: Partial<Role>
  onValid: (values: RoleFormValues) => void
}

export const RoleForm = forwardRef<RoleFormHandle, RoleFormProps>(
  function RoleForm({ mode: _mode, defaultValues, onValid }, ref) {
    const t = useTranslations()

    const form = useForm<RoleFormValues>({
      resolver: zodResolver(getRoleFormSchema()),
      defaultValues: {
        name: defaultValues?.name ?? "",
        permissions: defaultValues?.permissions ?? [],
      },
    })

    useEffect(() => {
      form.reset({
        name: defaultValues?.name ?? "",
        permissions: defaultValues?.permissions ?? [],
      })
    }, [defaultValues?.id, defaultValues?.name, defaultValues?.permissions, form])

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
                <FormLabel>{t("roleName")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("roleNamePlaceholder")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="permissions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("permissions")}</FormLabel>
                <FormControl>
                  <PermissionsSelector
                    value={field.value}
                    onChange={field.onChange}
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
