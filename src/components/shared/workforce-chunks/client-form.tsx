"use client"

import { CURRENCIES } from "@/lib/workforce/currency"
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
import { Plus, Star, Trash2, Warning } from "@/components/ui/carbon/icons"
import { Switch } from "@/components/ui/switch"
import { findDuplicateClients } from "@/lib/workforce/client-relations"
import { createId } from "@/lib/workforce/demo-store"
import { clientNeedsIce } from "@/lib/workforce/tax-ids"
import { useWorkspaceSettings } from "@/hooks/workforce/use-settings"
import { cn } from "@/lib/utils"
import { ClientStatus, ClientType, type Client, type ClientInput, type Employee } from "@/types/workforce"
import { CLIENT_STATUS_LABEL, NONE } from "./workforce-labels"
import { CustomFieldInputs, useCustomFields } from "./custom-fields"

const LANGUAGES = ["en", "fr", "ar", "es", "de"]

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

const rateCardSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  jobTitle: z.string().trim(),
  rate: z.number({ error: "required" }).min(0).max(100000),
})

const schema = z.object({
  name: z.string().trim().min(2),
  legalName: z.string().trim().optional(),
  ice: z.union([z.literal(""), z.string().transform((v) => v.replace(/[\s.-]/g, "")).pipe(z.string().regex(/^\d{15}$/, "15 digits"))]).optional(),
  clientType: z.enum(ClientType),
  country: z.string(),
  billingAddress: z.string().trim().optional(),
  currency: z.string(),
  language: z.string(),
  rateCard: z.array(rateCardSchema),
  industry: z.string().trim().optional(),
  email: z.email(),
  phone: z.string().trim().optional(),
  website: z.union([z.literal(""), z.url()]).optional(),
  address: z.string().trim().optional(),
  taxId: z.string().trim().optional(),
  status: z.enum(ClientStatus),
  hourlyRate: z.number().min(0).max(100000).optional(),
  paymentTermsDays: z.number({ error: "required" }).int().min(0).max(365),
  creditLimit: z.number().min(0).max(1e9).optional(),
  remindersOff: z.boolean(),
  accountManagerId: z.string(),
  contacts: z.array(contactSchema),
  notes: z.string().optional(),
  customFields: z.record(z.string(), z.string().optional()),
})

type FormValues = z.infer<typeof schema>

function toFormValues(client?: Client): FormValues {
  return {
    name: client?.name ?? "",
    legalName: client?.legalName ?? "",
    ice: client?.ice ?? "",
    clientType: client?.clientType ?? ClientType.COMPANY,
    country: client?.country ?? NONE,
    billingAddress: client?.billingAddress ?? "",
    currency: client?.currency ?? NONE,
    language: client?.language ?? NONE,
    rateCard: (client?.rateCard ?? []).map((r) => ({ id: r.id, employeeId: r.employeeId ?? NONE, jobTitle: r.jobTitle ?? "", rate: r.rate })),
    industry: client?.industry ?? "",
    email: client?.email ?? "",
    phone: client?.phone ?? "",
    website: client?.website ?? "",
    address: client?.address ?? "",
    taxId: client?.taxId ?? "",
    status: client?.status ?? ClientStatus.LEAD,
    hourlyRate: client?.hourlyRate,
    paymentTermsDays: client?.paymentTermsDays ?? 30,
    creditLimit: client?.creditLimit,
    remindersOff: client?.remindersOff ?? false,
    accountManagerId: client?.accountManagerId ?? NONE,
    contacts: client?.contacts ?? [],
    notes: client?.notes ?? "",
    customFields: client?.customFields ?? {},
  }
}

const COUNTRIES = ["MA", "FR", "BE", "CH", "ES", "DE", "GB", "US", "CA", "AE", "SA", "TN", "DZ", "SN"]

const emptyToUndefined = (value?: string) => (value ? value : undefined)

function toInput(values: FormValues): ClientInput {
  return {
    ...values,
    // Checked and cleaned by useCustomFields when saving
    customFields: undefined,
    industry: emptyToUndefined(values.industry),
    phone: emptyToUndefined(values.phone),
    website: emptyToUndefined(values.website),
    address: emptyToUndefined(values.address),
    taxId: emptyToUndefined(values.taxId),
    legalName: emptyToUndefined(values.legalName),
    ice: emptyToUndefined(values.ice),
    billingAddress: emptyToUndefined(values.billingAddress),
    country: values.country === NONE ? undefined : values.country,
    currency: values.currency === NONE ? undefined : values.currency,
    language: values.language === NONE ? undefined : values.language,
    rateCard: values.rateCard.map((r) =>
      r.employeeId !== NONE ? { id: r.id, employeeId: r.employeeId, rate: r.rate } : { id: r.id, jobTitle: r.jobTitle, rate: r.rate }
    ),
    notes: emptyToUndefined(values.notes),
    creditLimit: values.creditLimit || undefined,
    remindersOff: values.remindersOff || undefined,
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
  /** Other clients of the workspace, to warn about duplicates (CRM-5) */
  existingClients?: Client[]
  employees: Employee[]
  currency: string
  onValid: (input: ClientInput) => void
}

export const ClientForm = forwardRef<ClientFormHandle, Props>(function ClientForm(
  { client, existingClients = [], employees, currency, onValid },
  ref
) {
  const t = useTranslations()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(client),
  })
  const contacts = useFieldArray({ control: form.control, name: "contacts", keyName: "key" })
  const rateCard = useFieldArray({ control: form.control, name: "rateCard", keyName: "key" })
  const titles = [...new Set(employees.map((e) => e.jobTitle))].sort()
  const [watchName, watchLegal, watchIce, watchTax, watchType, watchCountry] = form.watch(["name", "legalName", "ice", "taxId", "clientType", "country"])
  const companyCountry = useWorkspaceSettings().data?.company.country ?? "MA"
  const needsIce = clientNeedsIce({ clientType: watchType, country: watchCountry === NONE ? undefined : watchCountry }, companyCountry)
  const duplicates = findDuplicateClients(existingClients, { name: watchName, legalName: watchLegal, ice: watchIce, taxId: watchTax }, client?.id)

  useEffect(() => {
    form.reset(toFormValues(client))
  }, [client, form])

  const custom = useCustomFields("client")

  useImperativeHandle(ref, () => ({
    submit: () =>
      form.handleSubmit((values) => {
        const customFields = custom.check(form, values.customFields)
        if (customFields !== false) onValid({ ...toInput(values), customFields })
      })(),
  }))

  const text = (
    name: "name" | "industry" | "email" | "phone" | "website" | "address" | "taxId" | "legalName" | "ice" | "billingAddress",
    label: string,
    type = "text"
  ) => (
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
        {duplicates.length > 0 && (
          <div role="alert" className="flex gap-2 rounded-2xl bg-warning-soft p-3 text-sm text-warning-foreground">
            <Warning className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">{t("duplicateClientTitle")}</p>
              <ul className="mt-1 list-disc ps-4 text-xs">
                {duplicates.slice(0, 3).map((d) => (
                  <li key={d.client.id}>
                    {d.client.name} · {d.reasons.map((r) => t(`duplicateBy_${r}`)).join(", ")}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs">{t("duplicateClientHint")}</p>
            </div>
          </div>
        )}
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
        {text("legalName", t("legalName"))}
        {text("address", t("address"))}
        {text("billingAddress", t("billingAddressOptional"))}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="clientType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("clientType")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full bg-card"><SelectValue>{t(field.value === ClientType.COMPANY ? "clientTypeCompany" : "clientTypeIndividual")}</SelectValue></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={ClientType.COMPANY}>{t("clientTypeCompany")}</SelectItem>
                    <SelectItem value={ClientType.INDIVIDUAL}>{t("clientTypeIndividual")}</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("country")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full min-w-0 bg-card"><SelectValue><span className="truncate">{field.value === NONE ? t("sameAsCompany", { country: companyCountry }) : field.value}</span></SelectValue></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE}>{t("sameAsCompany", { country: companyCountry })}</SelectItem>
                    {COUNTRIES.filter((c) => c !== companyCountry).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {text("ice", needsIce ? `${t("iceNumber")} *` : t("iceNumber"))}
          {text("taxId", t("taxId"))}
        </div>
        {needsIce && !watchIce && <p className="-mt-2 text-xs text-warning-foreground">{t("clientIceRequiredHint")}</p>}
        <div className="grid grid-cols-2 gap-4">
          {(["currency", "language"] as const).map((name) => (
            <FormField
              key={name}
              control={form.control}
              name={name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t(name === "currency" ? "invoiceCurrency" : "invoiceLanguage")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full bg-card">
                        <SelectValue>{field.value === NONE ? (name === "currency" ? currency : t("workspaceDefault")) : field.value.toUpperCase()}</SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>{name === "currency" ? currency : t("workspaceDefault")}</SelectItem>
                      {(name === "currency" ? CURRENCIES.filter((c) => c !== currency) : LANGUAGES).map((v) => (
                        <SelectItem key={v} value={v}>{v.toUpperCase()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          ))}
        </div>

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

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="creditLimit"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="truncate">{`${t("creditLimit")} (${currency})`}</FormLabel>
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
            name="remindersOff"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("paymentReminders")}</FormLabel>
                <div className="flex h-9 items-center gap-2">
                  <FormControl>
                    <Switch checked={!field.value} onCheckedChange={(on) => field.onChange(!on)} aria-label={t("paymentReminders")} />
                  </FormControl>
                  <span className="text-sm text-muted-foreground">{field.value ? t("remindersOffLabel") : t("remindersOnLabel")}</span>
                </div>
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
          <div className="flex items-center justify-between gap-3">
            <span>
              <legend className="text-sm font-medium">{t("rateCard")}</legend>
              <span className="block text-xs text-muted-foreground">{t("rateCardHint")}</span>
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => rateCard.append({ id: createId("rc"), employeeId: NONE, jobTitle: titles[0] ?? "", rate: form.getValues("hourlyRate") ?? 0 })}
            >
              <Plus className="size-4" />
              {t("addRate")}
            </Button>
          </div>
          {rateCard.fields.map((line, index) => {
            const byPerson = form.watch(`rateCard.${index}.employeeId`) !== NONE
            return (
              <div key={line.key} className="grid grid-cols-[1fr_1fr_6rem_auto] items-start gap-2">
                <FormField
                  control={form.control}
                  name={`rateCard.${index}.employeeId`}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="w-full bg-card" aria-label={t("person")}>
                        <SelectValue>{employees.find((e) => e.id === field.value)?.name ?? t("anyoneWithTitle")}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>{t("anyoneWithTitle")}</SelectItem>
                        {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`rateCard.${index}.jobTitle`}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={byPerson ? "" : field.value}>
                      <SelectTrigger className="w-full bg-card" aria-label={t("jobTitle")} disabled={byPerson}>
                        <SelectValue>{byPerson ? "—" : field.value || t("jobTitle")}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {titles.map((title) => <SelectItem key={title} value={title}>{title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`rateCard.${index}.rate`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          aria-label={`${t("rate")} (${currency})`}
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
                <Button type="button" variant="ghost" size="icon-sm" aria-label={t("delete")} onClick={() => rateCard.remove(index)}>
                  <Trash2 />
                </Button>
              </div>
            )
          })}
        </fieldset>

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

        <CustomFieldInputs entity="client" />

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
