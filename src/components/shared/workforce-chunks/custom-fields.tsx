"use client"

import { useLocale, useTranslations } from "next-intl"
import { useFormContext, type FieldValues, type Path, type UseFormReturn } from "react-hook-form"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useWorkspaceSettings } from "@/hooks/workforce/use-settings"
import { cleanCustomValues, customFieldErrors, fieldsFor } from "@/lib/workforce/custom-fields"
import type { CustomFieldDef, CustomFieldEntity, CustomFieldValues } from "@/types/work-settings"

const NONE = "__none__"
const ERROR_KEY = { required: "fieldRequired", number: "fieldMustBeNumber", date: "fieldMustBeDate", option: "fieldPickChoice" } as const

/**
 * The workspace's custom fields for one kind of record (PLT-12). `check` runs
 * before saving: it marks invalid fields on the form and returns the cleaned
 * values, or false when something is wrong.
 */
export function useCustomFields(entity: CustomFieldEntity) {
  const t = useTranslations()
  const { data: settings } = useWorkspaceSettings()
  const defs = fieldsFor(settings?.customFields, entity)
  const check = <T extends FieldValues>(form: UseFormReturn<T>, values: Partial<CustomFieldValues> | undefined) => {
    const errors = customFieldErrors(defs, values)
    for (const [id, kind] of Object.entries(errors)) {
      form.setError(`customFields.${id}` as Path<T>, { message: t(ERROR_KEY[kind]) })
    }
    return Object.keys(errors).length ? (false as const) : cleanCustomValues(defs, values)
  }
  return { defs, check }
}

/** Inputs for the custom fields, inside a react-hook-form form with a `customFields` record. */
export function CustomFieldInputs({ entity }: { entity: CustomFieldEntity }) {
  const t = useTranslations()
  const form = useFormContext<{ customFields: CustomFieldValues }>()
  const { defs } = useCustomFields(entity)
  if (defs.length === 0) return null
  return (
    <fieldset className="flex flex-col gap-3 rounded-2xl border border-border p-3">
      <legend className="px-1 text-sm font-medium">{t("customFields")}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {defs.map((d) => (
          <FormField
            key={d.id}
            control={form.control}
            name={`customFields.${d.id}`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {d.label}
                  {d.required && <span className="text-destructive" aria-hidden> *</span>}
                </FormLabel>
                {d.type === "select" ? (
                  <Select value={field.value || NONE} onValueChange={(v) => field.onChange(v === NONE ? "" : v)}>
                    <FormControl>
                      <SelectTrigger className="w-full"><SelectValue>{field.value || "—"}</SelectValue></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
                      {(d.options ?? []).map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <FormControl>
                    <Input type={d.type === "text" ? "text" : d.type} {...field} value={field.value ?? ""} />
                  </FormControl>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
      </div>
    </fieldset>
  )
}

/** Read-only list of a record's custom field values, for profiles and detail pages. */
export function CustomFieldValuesList({ entity, values }: { entity: CustomFieldEntity; values?: CustomFieldValues }) {
  const { defs } = useCustomFields(entity)
  const locale = useLocale()
  const shown = defs.filter((d) => values?.[d.id])
  if (shown.length === 0) return null
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
      {shown.map((d) => (
        <div key={d.id} className="contents">
          <dt className="text-muted-foreground">{d.label}</dt>
          <dd className="min-w-0 break-words">{formatValue(d, values![d.id]!, locale)}</dd>
        </div>
      ))}
    </dl>
  )
}

function formatValue(d: CustomFieldDef, v: string, locale: string) {
  if (d.type === "date") return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(`${v}T00:00:00`))
  if (d.type === "number" && Number.isFinite(Number(v))) return new Intl.NumberFormat(locale).format(Number(v))
  return v
}
