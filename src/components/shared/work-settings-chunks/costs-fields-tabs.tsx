"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2 } from "@/components/ui/carbon/icons"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { useEmployees } from "@/hooks/workforce/use-workforce"
import { useSettingsMutations } from "@/hooks/workforce/use-settings"
import { createId } from "@/lib/workforce/demo-store"
import { monthlyCapacityHours, monthlyOverhead, overheadRate } from "@/lib/workforce/overhead"
import type { CustomFieldDef, CustomFieldEntity, CustomFieldType, OverheadItem } from "@/types/work-settings"
import { formatMoney } from "../workforce-chunks/workforce-labels"

/** Hourly rates keep their cents, unlike totals. */
export function rateMoney(n: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

const ENTITY_LABEL: Record<CustomFieldEntity, string> = { client: "clients", project: "projects", employee: "employees" }
const TYPE_LABEL: Record<CustomFieldType, string> = { text: "fieldText", number: "fieldNumber", date: "fieldDate", select: "fieldSelect" }

/** Monthly running costs spread over logged hours (CST-4). */
export function OverheadsTab({ initial }: { initial: OverheadItem[] }) {
  const t = useTranslations()
  const locale = useLocale()
  const { currency } = useCurrentWorkspace()
  const { overheads } = useSettingsMutations()
  const { data: employees = [] } = useEmployees()
  const [rows, setRows] = useState(initial)
  const update = (i: number, patch: Partial<OverheadItem>) => setRows((list) => list.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const money = (n: number) => formatMoney(n, currency, locale)
  const hours = Math.round(monthlyCapacityHours(employees))
  const rate = overheadRate(rows, employees)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("overheadCosts")}</CardTitle>
        <CardDescription>{t("overheadCostsHint")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <li key={r.id} className="flex items-center gap-2 rounded-2xl border border-border p-2">
              <Input aria-label={t("name")} placeholder={t("overheadNamePlaceholder")} className="h-9 min-w-0 flex-1" value={r.name} onChange={(e) => update(i, { name: e.target.value })} />
              <Input
                type="number"
                min={0}
                aria-label={t("monthlyAmount")}
                className="h-9 w-36 text-right tabular-nums"
                value={r.monthlyAmount}
                onChange={(e) => update(i, { monthlyAmount: Number(e.target.value) })}
              />
              <span className="w-20 text-xs text-muted-foreground">{t("perMonth")}</span>
              <Button variant="ghost" size="icon-sm" aria-label={t("delete")} onClick={() => setRows((list) => list.filter((_, j) => j !== i))}>
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
        <div>
          <Button variant="outline" size="sm" onClick={() => setRows((list) => [...list, { id: createId("ovh"), name: "", monthlyAmount: 0 }])}>
            <Plus /> {t("addOverhead")}
          </Button>
        </div>
        <div className="grid gap-3 rounded-2xl bg-muted/50 p-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground">{t("totalPerMonth")}</p>
            <p className="text-lg font-semibold tabular-nums">{money(monthlyOverhead(rows))}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("teamCapacityMonth")}</p>
            <p className="text-lg font-semibold tabular-nums">{hours} h</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("overheadPerHour")}</p>
            <p className="text-lg font-semibold tabular-nums text-primary">{rateMoney(rate, currency, locale)}</p>
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-3">{t("overheadFormula")}</p>
        </div>
        <div className="flex justify-end border-t border-border pt-4">
          <Button onClick={() => overheads.mutate(rows)} disabled={overheads.isPending}>{t("saveChanges")}</Button>
        </div>
      </CardContent>
    </Card>
  )
}

/** Extra fields on clients, projects and employees (PLT-12). */
export function CustomFieldsTab({ initial }: { initial: CustomFieldDef[] }) {
  const t = useTranslations()
  const { customFields } = useSettingsMutations()
  const [defs, setDefs] = useState(initial)
  const update = (id: string, patch: Partial<CustomFieldDef>) => setDefs((list) => list.map((d) => (d.id === id ? { ...d, ...patch } : d)))
  const add = (entity: CustomFieldEntity) => setDefs((list) => [...list, { id: createId("cf"), entity, label: "", type: "text" }])

  return (
    <div className="flex flex-col gap-6">
      {(Object.keys(ENTITY_LABEL) as CustomFieldEntity[]).map((entity) => {
        const rows = defs.filter((d) => d.entity === entity)
        return (
          <Card key={entity}>
            <CardHeader>
              <CardTitle>{t(ENTITY_LABEL[entity])}</CardTitle>
              <CardDescription>{t("customFieldsHint")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {rows.length === 0 && <p className="text-sm text-muted-foreground">{t("noCustomFields")}</p>}
              <ul className="flex flex-col gap-2">
                {rows.map((d) => (
                  <li key={d.id} className="flex flex-col gap-2 rounded-2xl border border-border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Input aria-label={t("fieldName")} placeholder={t("fieldName")} className="h-9 min-w-40 flex-1" value={d.label} onChange={(e) => update(d.id, { label: e.target.value })} />
                      <Select value={d.type} onValueChange={(v) => update(d.id, { type: v as CustomFieldType, options: v === "select" ? (d.options ?? ["", ""]) : undefined })}>
                        <SelectTrigger className="h-9 w-36" aria-label={t("fieldType")}><SelectValue>{t(TYPE_LABEL[d.type])}</SelectValue></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(TYPE_LABEL) as CustomFieldType[]).map((k) => (
                            <SelectItem key={k} value={k}>{t(TYPE_LABEL[k])}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <label className="flex items-center gap-2 text-sm">
                        <Switch checked={!!d.required} aria-label={t("requiredField")} onChange={(on) => update(d.id, { required: on })} />
                        {t("requiredField")}
                      </label>
                      <Button variant="ghost" size="icon-sm" aria-label={t("delete")} onClick={() => setDefs((list) => list.filter((x) => x.id !== d.id))}>
                        <Trash2 />
                      </Button>
                    </div>
                    {d.type === "select" && (
                      <Input
                        aria-label={t("fieldChoices")}
                        placeholder={t("fieldChoicesHint")}
                        className="h-9"
                        value={(d.options ?? []).join(", ")}
                        onChange={(e) => update(d.id, { options: e.target.value.split(",").map((o) => o.trimStart()) })}
                      />
                    )}
                  </li>
                ))}
              </ul>
              <div>
                <Button variant="outline" size="sm" onClick={() => add(entity)}>
                  <Plus /> {t("addField")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
      <div className="flex justify-end">
        <Button onClick={() => customFields.mutate(defs)} disabled={customFields.isPending}>{t("saveChanges")}</Button>
      </div>
    </div>
  )
}
