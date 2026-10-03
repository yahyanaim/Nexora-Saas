"use client"

import { forwardRef, useEffect, useImperativeHandle } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslations } from "next-intl"
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
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Star, Trash2 } from "@/components/ui/carbon/icons"
import { createId } from "@/lib/workforce/demo-store"
import { cn } from "@/lib/utils"
import { ClientStatus, type Client, type ClientInput, type Employee } from "@/types/workforce"
import { CLIENT_STATUS_LABEL, NONE } from "./workforce-labels"

export interface ClientFormHandle {
  submit: () => void
}

const contactSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(2),
  email: z.email(),
  phone: z.string().trim().optional(),
  position: z.string().trim().optional(),
  isPrimary: z.boolean(),
})

const schema = z.object({
  name: z.string().trim().min(2),
  industry: z.string().trim().optional(),
  email: z.email(),
  phone: z.string().trim().optional(),
  website: z.union([z.literal(""), z.url()]).optional(),
  address: z.string().trim().optional(),
  taxId: z.string().trim().optional(),
  status: z.enum(ClientStatus),
  hourlyRate: z.number().min(0).max(100000).optional(),
  paymentTermsDays: z.number({ error: "required" }).int().min(0).max(365),
  accountManagerId: z.string(),
  contacts: z.array(contactSchema),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

function toFormValues(client?: Client): FormValues {
  return {
    name: client?.name ?? "",
    industry: client?.industry ?? "",
    email: client?.email ?? "",
    phone: client?.phone ?? "",
    website: client?.website ?? "",
    address: client?.address ?? "",
    taxId: client?.taxId ?? "",
    status: client?.status ?? ClientStatus.LEAD,
    hourlyRate: client?.hourlyRate,
    paymentTermsDays: client?.paymentTermsDays ?? 30,
    accountManagerId: client?.accountManagerId ?? NONE,
    contacts: client?.contacts ?? [],
    notes: client?.notes ?? "",
  }
}

const emptyToUndefined = (value?: string) => (value ? value : undefined)

function toInput(values: FormValues): ClientInput {
  return {
    ...values,
    industry: emptyToUndefined(values.industry),
    phone: emptyToUndefined(values.phone),
    website: emptyToUndefined(values.website),
    address: emptyToUndefined(values.address),
    taxId: emptyToUndefined(values.taxId),
    notes: emptyToUndefined(values.notes),
    accountManagerId: values.accountManagerId === NONE ? undefined : values.accountManagerId,
    contacts: values.contacts.map((c) => ({
      ...c,
      phone: emptyToUndefined(c.phone),
      position: emptyToUndefined(c.position),
    })),
  }
}

interface Props {
  client?: Client
  employees: Employee[]
  currency: string
  onValid: (input: ClientInput) => void
}

export const ClientForm = forwardRef<ClientFormHandle, Props>(function ClientForm(
  { client, employees, currency, onValid },
  ref
) {
  const t = useTranslations()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(client),
  })
  const contacts = useFieldArray({ control: form.control, name: "contacts", keyName: "key" })

  useEffect(() => {
    form.reset(toFormValues(client))
  }, [client, form])

  useImperativeHandle(ref, () => ({
    submit: () => form.handleSubmit((values) => onValid(toInput(values)))(),
  }))

  const text = (name: "name" | "industry" | "email" | "phone" | "website" | "address" | "taxId", label: string, type = "text") => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type={type} placeholder={label} {...field} value={field.value ?? ""} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  const setPrimary = (index: number) =>
    form.setValue(
      "contacts",
      form.getValues("contacts").map((c, i) => ({ ...c, isPrimary: i === index })),
      { shouldDirty: true }
    )

  return (
    <Form {...form}>
      <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
        {text("name", t("companyName"))}
        <div className="grid grid-cols-2 gap-4">
          {text("industry", t("industry"))}
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("status")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full bg-card">
                      <SelectValue>{t(CLIENT_STATUS_LABEL[field.value])}</SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(ClientStatus).map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(CLIENT_STATUS_LABEL[s])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {text("email", t("billingEmail"), "email")}
          {text("phone", t("phone"))}
        </div>
        {text("website", t("website"), "url")}
        {text("address", t("address"))}
        {text("taxId", t("taxId"))}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="hourlyRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="truncate">{`${t("agreedHourlyRate")} (${currency})`}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    placeholder={t("optional")}
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="paymentTermsDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("paymentTermsDays")}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={Number.isFinite(field.value) ? field.value : ""}
                    onChange={(e) => field.onChange(e.target.value === "" ? Number.NaN : Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="accountManagerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("accountManager")}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full bg-card">
                    <SelectValue>
                      {employees.find((e) => e.id === field.value)?.name ?? t("none")}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NONE}>{t("none")}</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <fieldset className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <legend className="text-sm font-medium">{t("contacts")}</legend>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                contacts.append({
                  id: createId("con"),
                  name: "",
                  email: "",
                  phone: "",
                  position: "",
                  isPrimary: contacts.fields.length === 0,
                })
              }
            >
              <Plus className="size-4" />
              {t("addContact")}
            </Button>
          </div>
          {contacts.fields.length === 0 && (
            <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              {t("noContactsYet")}
            </p>
          )}
          {contacts.fields.map((contact, index) => (
            <div key={contact.key} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3">
              <div className="grid grid-cols-2 gap-3">
                {(["name", "email", "position", "phone"] as const).map((key) => (
                  <FormField
                    key={key}
                    control={form.control}
                    name={`contacts.${index}.${key}`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            aria-label={t(key === "name" ? "fullName" : key)}
                            placeholder={t(key === "name" ? "fullName" : key)}
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setPrimary(index)}
                  aria-pressed={form.watch(`contacts.${index}.isPrimary`)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-2 py-1 text-xs transition-colors",
                    form.watch(`contacts.${index}.isPrimary`)
                      ? "bg-info-soft text-info-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Star className="size-3.5" />
                  {t("primaryContact")}
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={t("removeContact")}
                  onClick={() => contacts.remove(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </fieldset>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("notes")}</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} value={field.value ?? ""} />
              </FormControl>
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
})
