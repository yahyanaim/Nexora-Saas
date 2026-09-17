"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2 } from "@/components/ui/carbon/icons"
import type { PlanCardData } from "./plan-card"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useTranslations } from "next-intl"

const planSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(1, t("nameRequired")),
    description: z.string().min(1, t("descriptionRequired")),
    price: z.string().min(1, t("priceRequired")),
    period: z.string().nullable(),
    featured: z.boolean(),
    features: z
      .array(z.string().min(1, t("featureRequired")))
      .min(1, t("atLeastOneFeature")),
  })

type PlanFormValues = z.infer<ReturnType<typeof planSchema>>

interface PlanFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan?: PlanCardData | null
  onSubmit: (data: PlanFormValues) => void
  isSubmitting?: boolean
}

export function PlanForm({
  open,
  onOpenChange,
  plan,
  onSubmit,
  isSubmitting = false,
}: PlanFormProps) {
  const t = useTranslations()

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema(t)),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      period: "month",
      featured: false,
      features: [""],
    },
  })

  useEffect(() => {
    if (plan) {
      form.reset({
        name: plan.name,
        description: plan.description,
        price: plan.price,
        period: plan.period || "month",
        featured: plan.featured,
        features: plan.features.length > 0 ? plan.features : [""],
      })
    } else {
      form.reset({
        name: "",
        description: "",
        price: "",
        period: "month",
        featured: false,
        features: [""],
      })
    }
  }, [plan, form])

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

  const handleSubmit = (values: PlanFormValues) => {
    onSubmit(values)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        showCloseButton={false}
        className="flex flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b bg-card p-4">
          <SheetTitle>{plan ? t("updatePlan") : t("createPlan")}</SheetTitle>
          <SheetDescription>
            {plan ? t("updatePlanDescription") : t("createPlanDescription")}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4">
          <Form {...form}>
            <form
              className="space-y-7"
              onSubmit={form.handleSubmit(handleSubmit)}
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("planName")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("planNamePlaceholder")}
                        {...field}
                      />
                    </FormControl>
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
                      <Textarea
                        placeholder={t("descriptionPlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("price")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("pricePlaceholder")} {...field} />
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
                          placeholder={t("periodPlaceholder")}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="featured"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border bg-card p-3">
                    <div className="space-y-0.5">
                      <FormLabel>{t("featuredPlan")}</FormLabel>
                      <FormDescription>
                        {t("featuredPlanDescription")}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>{t("features")}</FormLabel>
                <FormDescription>{t("featuresDescription")}</FormDescription>
                <div className="space-y-2">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        placeholder={t("featurePlaceholder")}
                        value={feature}
                        onChange={(e) => updateFeature(index, e.target.value)}
                      />
                      {features.length > 1 && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => removeFeature(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                {form.formState.errors.features?.message && (
                  <p className="text-sm font-medium text-destructive">
                    {form.formState.errors.features.message}
                  </p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 h-12 w-full"
                  onClick={addFeature}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  {t("addFeature")}
                </Button>
              </div>
            </form>
          </Form>
        </div>
        <SheetFooter className="border-t bg-card p-4">
          <Button
            variant="primary"
            className="w-full sm:w-auto"
            disabled={isSubmitting}
            onClick={form.handleSubmit(handleSubmit)}
          >
            {isSubmitting
              ? t("saving")
              : plan
                ? t("updatePlan")
                : t("createPlan")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
