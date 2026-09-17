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
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { X, Plus } from "@/components/ui/carbon/icons"
import { useTranslations } from "next-intl"
import {
  getSubscriptionFormSchema,
  SubscriptionFormValues,
} from "@/hooks/subscriptions/subscription-form-schema"
import { SubscriptionStatus } from "@/types/subscriptions"
import { SelectPlan } from "../plans-chunks/select-plan"
import { SelectUser } from "../users-chunks/select-user"

export interface SubscriptionFormHandle {
  submit: () => void
}

interface SubscriptionFormProps {
  mode: "create" | "edit"
  defaultValues?: Partial<SubscriptionFormValues>
  onValid: (values: SubscriptionFormValues) => void
}

export const SubscriptionForm = forwardRef<
  SubscriptionFormHandle,
  SubscriptionFormProps
>(function SubscriptionForm({ mode, defaultValues, onValid }, ref) {
  const t = useTranslations()

  const form = useForm<SubscriptionFormValues>({
    resolver: zodResolver(getSubscriptionFormSchema(mode)),
    defaultValues: {
      name: defaultValues?.name ?? "",
      description: defaultValues?.description ?? "",
      price: defaultValues?.price ?? "",
      period: defaultValues?.period ?? "month",
      status: defaultValues?.status ?? SubscriptionStatus.ACTIVE,
      features: defaultValues?.features?.length ? defaultValues.features : [""],
      user: defaultValues?.user ?? "",
      plan: defaultValues?.plan ?? "",
    },
  })

  useEffect(() => {
    form.reset({
      name: defaultValues?.name ?? "",
      description: defaultValues?.description ?? "",
      price: defaultValues?.price ?? "",
      period: defaultValues?.period ?? "month",
      status: defaultValues?.status ?? SubscriptionStatus.ACTIVE,
      features: defaultValues?.features?.length ? defaultValues.features : [""],
      user: defaultValues?.user ?? "",
      plan: defaultValues?.plan ?? "",
    })
  }, [defaultValues, form])

  useImperativeHandle(ref, () => ({
    submit: () => form.handleSubmit(onValid)(),
  }))

  const features = form.watch("features")

  const addFeature = () => {
    form.setValue("features", [...features, ""])
  }

  const removeFeature = (index: number) => {
    const newFeatures = features.filter((_, i) => i !== index)
    form.setValue("features", newFeatures)
  }

  const updateFeature = (index: number, value: string) => {
    const newFeatures = [...features]
    newFeatures[index] = value
    form.setValue("features", newFeatures)
  }

  return (
    <Form {...form}>
      <form className="flex flex-col gap-4">
        {/* Select User */}
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

        {/* Select Plan */}
        <FormField
          control={form.control}
          name="plan"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("plan")}</FormLabel>
              <FormControl>
                <SelectPlan
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={t("selectPlan")}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Plan Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("planName")}</FormLabel>
              <FormControl>
                <Input placeholder={t("enterPlanName")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("description")}</FormLabel>
              <FormControl>
                <Textarea
                  rows={2}
                  placeholder={t("shortDescription")}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Price & Period */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("price")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("enterPrice")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="period"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("period")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("enterPeriod")}
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Status Switch */}
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border bg-card p-3 shadow-md">
              <div className="space-y-0.5">
                <FormLabel>{t("active")}</FormLabel>
              </div>
              <FormControl>
                <Switch
                  checked={field.value === SubscriptionStatus.ACTIVE}
                  onChange={(checked) =>
                    field.onChange(
                      checked
                        ? SubscriptionStatus.ACTIVE
                        : SubscriptionStatus.INACTIVE
                    )
                  }
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Features */}
        <div className="space-y-2">
          <FormLabel>{t("features")}</FormLabel>
          <div className="space-y-2">
            {features.map((feature, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder={t("enterFeature")}
                  value={feature}
                  onChange={(e) => updateFeature(index, e.target.value)}
                />
                {features.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFeature(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 w-full p-6"
            onClick={addFeature}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            {t("addFeature")}
          </Button>
        </div>
      </form>
    </Form>
  )
})
