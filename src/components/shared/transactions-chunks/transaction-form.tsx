// components/transactions/transaction-form.tsx

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTranslations } from "next-intl"
import {
  getTransactionFormSchema,
  TransactionFormValues,
} from "@/hooks/transactions/transaction-form-schema"
import { TransactionStatus, TransactionMethod } from "@/types/transactions"
import { SelectUser } from "../users-chunks/select-user"

export interface TransactionFormHandle {
  submit: () => void
}

interface TransactionFormProps {
  mode: "create" | "edit"
  defaultValues?: Partial<TransactionFormValues>
  onValid: (values: TransactionFormValues) => void
}

export const TransactionForm = forwardRef<
  TransactionFormHandle,
  TransactionFormProps
>(function TransactionForm({ mode, defaultValues, onValid }, ref) {
  const t = useTranslations()

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(getTransactionFormSchema(mode)),
    defaultValues: {
      user: defaultValues?.user ?? "",
      amount: defaultValues?.amount ?? "",
      method: defaultValues?.method ?? TransactionMethod.STRIPE,
      status: defaultValues?.status ?? TransactionStatus.PENDING,
      description: defaultValues?.description ?? "",
      reference: defaultValues?.reference ?? "",
    },
  })

  useEffect(() => {
    form.reset({
      user: defaultValues?.user ?? "",
      amount: defaultValues?.amount ?? "",
      method: defaultValues?.method ?? TransactionMethod.STRIPE,
      status: defaultValues?.status ?? TransactionStatus.PENDING,
      description: defaultValues?.description ?? "",
      reference: defaultValues?.reference ?? "",
    })
  }, [defaultValues, form])

  useImperativeHandle(ref, () => ({
    submit: () => form.handleSubmit(onValid)(),
  }))

  return (
    <Form {...form}>
      <form className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="user"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("user")}</FormLabel>
              <FormControl>
                <SelectUser
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={t("selectUser")}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("amount")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder={t("amountPlaceholder")}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("method")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full bg-card py-6 shadow-md">
                    <SelectValue placeholder={t("selectMethod")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.values(TransactionMethod).map((method) => (
                    <SelectItem key={method} value={method}>
                      {t(method.toLowerCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("status")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full bg-card py-6 shadow-md">
                    <SelectValue placeholder={t("selectStatus")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.values(TransactionStatus).map((status) => (
                    <SelectItem key={status} value={status}>
                      {t(status.toLowerCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("description")}</FormLabel>
              <FormControl>
                <Input placeholder={t("descriptionPlaceholder")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="reference"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1">
                {t("reference")}
                <span className="text-xs font-normal text-muted-foreground">
                  ({t("optional")})
                </span>
              </FormLabel>
              <FormControl>
                <Input placeholder={t("referencePlaceholder")} {...field} />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                {t("referenceDescription")}
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
})
