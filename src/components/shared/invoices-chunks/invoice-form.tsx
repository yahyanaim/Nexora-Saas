"use client"

import { useForm, useFieldArray } from "react-hook-form"
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
import { Button } from "@/components/ui/button"
import { X, Plus } from "@/components/ui/carbon/icons"
import { useTranslations } from "next-intl"
import {
  getInvoiceFormSchema,
  InvoiceFormValues,
} from "@/hooks/invoices/invoice-form-schema"
import { InvoiceStatus, InvoiceMethod } from "@/types/invoices"
import { SelectUser } from "../users-chunks/select-user"

export interface InvoiceFormHandle {
  submit: () => void
}

interface InvoiceFormProps {
  mode: "create" | "edit"
  defaultValues?: Partial<InvoiceFormValues>
  onValid: (values: InvoiceFormValues) => void
}

export const InvoiceForm = forwardRef<InvoiceFormHandle, InvoiceFormProps>(
  function InvoiceForm({ mode, defaultValues, onValid }, ref) {
    const t = useTranslations()

    const form = useForm<InvoiceFormValues>({
      resolver: zodResolver(getInvoiceFormSchema(mode)),
      defaultValues: {
        user: defaultValues?.user ?? "",
        items: defaultValues?.items ?? [
          { description: "", quantity: 1, unitPrice: 0 },
        ],
        status: defaultValues?.status ?? InvoiceStatus.DRAFT,
        method: defaultValues?.method ?? InvoiceMethod.STRIPE,
        taxRate: defaultValues?.taxRate ?? 0,
        dueDate: defaultValues?.dueDate ?? "",
        notes: defaultValues?.notes ?? "",
      },
    })

    const { fields, append, remove } = useFieldArray({
      control: form.control,
      name: "items",
    })

    useEffect(() => {
      form.reset({
        user: defaultValues?.user ?? "",
        items: defaultValues?.items ?? [
          { description: "", quantity: 1, unitPrice: 0 },
        ],
        status: defaultValues?.status ?? InvoiceStatus.DRAFT,
        method: defaultValues?.method ?? InvoiceMethod.STRIPE,
        taxRate: defaultValues?.taxRate ?? 0,
        dueDate: defaultValues?.dueDate ?? "",
        notes: defaultValues?.notes ?? "",
      })
    }, [defaultValues, form])

    useImperativeHandle(ref, () => ({
      submit: () => form.handleSubmit(onValid)(),
    }))

    const calculateTotal = (
      items: { quantity: number; unitPrice: number }[]
    ) => {
      return items.reduce(
        (sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0),
        0
      )
    }

    const subtotal = calculateTotal(form.watch("items") || [])
    const taxRate = form.watch("taxRate") || 0
    const tax = subtotal * taxRate
    const total = subtotal + tax

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

          <div>
            <FormLabel>{t("items")}</FormLabel>
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-2">
                  <div className="flex-1">
                    <FormField
                      control={form.control}
                      name={`items.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder={t("description")} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name={`items.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem className="w-20">
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder={t("qty")}
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.unitPrice`}
                    render={({ field }) => (
                      <FormItem className="w-20">
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder={t("unitPricePlaceholder")}
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => remove(index)}
                      className="my-auto"
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
              className="mt-2 w-full p-5"
              onClick={() =>
                append({ description: "", quantity: 1, unitPrice: 0 })
              }
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              {t("addItem")}
            </Button>
          </div>

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("status")}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full bg-card py-6 shadow-md">
                      <SelectValue placeholder={t("selectStatus")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(InvoiceStatus).map((status) => (
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
            name="method"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("method")}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full bg-card py-6 shadow-md">
                      <SelectValue placeholder={t("selectMethod")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(InvoiceMethod).map((method) => (
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
            name="taxRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("taxRate")}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    placeholder={t("taxRatePlaceholder")}
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseFloat(e.target.value) || 0)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("dueDate")}</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("notes")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("additionalNotes")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="rounded-lg border p-4">
            <h4 className="mb-2 text-sm font-medium">{t("summary")}</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("subtotal")}</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("tax")}</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-1 font-bold">
                <span>{t("total")}</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </form>
      </Form>
    )
  }
)
