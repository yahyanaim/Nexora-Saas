"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { ListFilter as Filter, Plus, Tag, X } from "@/components/ui/carbon/icons"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { cleanTags } from "@/lib/workforce/client-figures"
import {
  CHOICE_FIELDS,
  GROUP_FIELDS,
  MONEY_FIELDS,
  NUMBER_FIELDS,
  isComplete,
  isNumberField,
  opsFor,
  type AdvancedFilter,
  type ChoiceField,
  type FilterCondition,
  type FilterField,
  type GroupField,
} from "@/lib/workforce/client-filters"
import { cn } from "@/lib/utils"
import { ClientStatus, type Client, type ClientInput, type Employee } from "@/types/workforce"
import { CLIENT_STATUS_CLASS, CLIENT_STATUS_LABEL, NONE } from "./workforce-labels"

/*
 * Tools of the clients list (CRM step 10): edit status, account manager and
 * tags right in the table, group the rows, and filter with AND / OR conditions.
 */

type Update = (client: Client, input: Partial<ClientInput>) => void

/** The status as a small menu; a lead made active gets today as its conversion date. */
export function StatusCell({ client, onUpdate }: { client: Client; onUpdate: Update }) {
  const t = useTranslations()
  return (
    <Select
      value={client.status}
      onValueChange={(v) => {
        const status = v as ClientStatus
        if (status === client.status) return
        onUpdate(client, { status, ...(client.status === ClientStatus.LEAD && status === ClientStatus.ACTIVE ? { convertedAt: new Date().toISOString().slice(0, 10) } : {}) })
      }}
    >
      <SelectTrigger aria-label={t("clChangeStatus", { name: client.name })} className={cn("h-7 w-auto gap-1 rounded-full border-transparent px-2.5 text-xs font-medium shadow-none", CLIENT_STATUS_CLASS[client.status])}>
        <SelectValue>{t(CLIENT_STATUS_LABEL[client.status])}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.values(ClientStatus).map((s) => <SelectItem key={s} value={s}>{t(CLIENT_STATUS_LABEL[s])}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

/** The account manager as a menu of the team. */
export function OwnerCell({ client, employees, canEdit, onUpdate }: { client: Client; employees: Employee[]; canEdit: boolean; onUpdate: Update }) {
  const t = useTranslations()
  const owner = employees.find((e) => e.id === client.accountManagerId)
  const shown = (
    <span className="flex min-w-0 items-center gap-2">
      {owner ? <SpaceAvatar name={owner.name} size="xs" /> : null}
      <span className={cn("truncate text-sm", !owner && "text-muted-foreground")}>{owner?.name ?? t("clNoManager")}</span>
    </span>
  )
  if (!canEdit) return shown
  return (
    <Select value={client.accountManagerId ?? NONE} onValueChange={(v) => v !== (client.accountManagerId ?? NONE) && onUpdate(client, { accountManagerId: v === NONE ? undefined : v })}>
      <SelectTrigger aria-label={t("clChangeManager", { name: client.name })} className="h-8 w-40 border-transparent bg-transparent px-2 shadow-none hover:bg-muted">
        <SelectValue>{shown}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{t("clNoManager")}</SelectItem>
        {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

/** Tags as chips, with a small editor to tick tags in use or add a new one. */
export function TagsCell({ client, allTags, canEdit, onUpdate }: { client: Client; allTags: string[]; canEdit: boolean; onUpdate: Update }) {
  const t = useTranslations()
  const [draft, setDraft] = React.useState("")
  const tags = client.tags ?? []
  const set = (next: string[]) => onUpdate(client, { tags: cleanTags(next) })
  const chips = (
    <span className="flex min-w-0 flex-wrap items-center gap-1">
      {tags.length === 0 && <span className="text-sm text-muted-foreground">—</span>}
      {tags.slice(0, 2).map((x) => <span key={x} className="max-w-24 truncate rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{x}</span>)}
      {tags.length > 2 && <span className="text-xs text-muted-foreground" title={tags.slice(2).join(", ")}>+{tags.length - 2}</span>}
    </span>
  )
  if (!canEdit) return chips
  const choices = [...new Set([...allTags, ...tags])].sort((a, b) => a.localeCompare(b))
  return (
    <span className="flex items-center gap-1">
      {chips}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="size-7 shrink-0 text-muted-foreground" aria-label={t("clEditTags", { name: client.name })}>
            <Tag className="size-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-60 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">{t("clTags")}</p>
          <ul className="max-h-48 space-y-1.5 overflow-y-auto">
            {choices.map((x) => (
              <li key={x}>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={tags.includes(x)} onCheckedChange={(v) => set(v ? [...tags, x] : tags.filter((y) => y !== x))} />
                  <span className="truncate">{x}</span>
                </label>
              </li>
            ))}
          </ul>
          <form
            className="mt-3 flex gap-1.5"
            onSubmit={(e) => {
              e.preventDefault()
              if (!draft.trim()) return
              set([...tags, draft])
              setDraft("")
            }}
          >
            <Input value={draft} maxLength={30} onChange={(e) => setDraft(e.target.value)} placeholder={t("clNewTag")} aria-label={t("clNewTag")} className="h-8" />
            <Button type="submit" size="icon" variant="outline" className="size-8 shrink-0" disabled={!draft.trim() || tags.length >= 10} aria-label={t("clAddTag")}>
              <Plus className="size-4" />
            </Button>
          </form>
        </PopoverContent>
      </Popover>
    </span>
  )
}

/** Choices a condition can pick from, as [value, label] pairs. */
export type ChoiceOptions = Record<ChoiceField, [string, string][]>

/**
 * Group by, and conditions joined by AND (all) or OR (any), under the table's
 * toolbar. Unfinished conditions are kept but not applied until complete.
 */
export function ClientFilterBar({
  filter,
  onFilter,
  groupBy,
  onGroupBy,
  options,
  canSeeMoney,
  newId,
}: {
  filter: AdvancedFilter
  onFilter: (f: AdvancedFilter) => void
  groupBy: GroupField | ""
  onGroupBy: (g: GroupField | "") => void
  options: ChoiceOptions
  canSeeMoney: boolean
  newId: () => string
}) {
  const t = useTranslations()
  const [open, setOpen] = React.useState(filter.conditions.length > 0)
  const fields: FilterField[] = [...CHOICE_FIELDS, ...NUMBER_FIELDS.filter((f) => canSeeMoney || !MONEY_FIELDS.includes(f))]
  const active = filter.conditions.filter(isComplete).length
  const setCond = (id: string, patch: Partial<FilterCondition>) => onFilter({ ...filter, conditions: filter.conditions.map((c) => (c.id === id ? { ...c, ...patch } : c)) })
  const add = () => {
    setOpen(true)
    onFilter({ ...filter, conditions: [...filter.conditions, { id: newId(), field: "status", op: "is" }] })
  }

  return (
    <div className="border-b border-border px-3 pb-3 sm:px-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="cl-group" className="text-xs text-muted-foreground">{t("clGroupBy")}</Label>
          <Select value={groupBy || NONE} onValueChange={(v) => onGroupBy(v === NONE ? "" : (v as GroupField))}>
            <SelectTrigger id="cl-group" className="h-8 w-40 bg-card text-xs"><SelectValue>{groupBy ? t(`clField_${groupBy}`) : t("clGroupNone")}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{t("clGroupNone")}</SelectItem>
              {GROUP_FIELDS.map((g) => <SelectItem key={g} value={g}>{t(`clField_${g}`)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" aria-expanded={open} aria-controls="cl-conditions" onClick={() => (filter.conditions.length ? setOpen(!open) : add())}>
          <Filter className="size-4" />
          {t("clConditions")}
          {active > 0 && <span className="rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground tabular-nums">{active}</span>}
        </Button>
        {filter.conditions.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => onFilter({ ...filter, conditions: [] })}>
            <X className="size-4" />
            {t("clClearConditions")}
          </Button>
        )}
      </div>

      {open && filter.conditions.length > 0 && (
        <fieldset id="cl-conditions" className="mt-3 rounded-2xl border border-border p-3">
          <legend className="sr-only">{t("clConditions")}</legend>
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm" role="radiogroup" aria-label={t("clMatch")}>
            <span className="text-muted-foreground">{t("clMatch")}</span>
            {(["all", "any"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={filter.mode === m}
                onClick={() => onFilter({ ...filter, mode: m })}
                className={cn("rounded-full border px-3 py-0.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", filter.mode === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}
              >
                {t(m === "all" ? "clMatchAll" : "clMatchAny")}
              </button>
            ))}
          </div>
          <ul className="flex flex-col gap-2">
            {filter.conditions.map((c, i) => {
              const ops = opsFor(c.field)
              const n = i + 1
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-2">
                  <span className="w-10 text-xs font-medium text-muted-foreground">{i === 0 ? t("clWhere") : t(filter.mode === "all" ? "clAnd" : "clOr")}</span>
                  <Select value={c.field} onValueChange={(v) => setCond(c.id, { field: v as FilterField, op: opsFor(v as FilterField)[0]!, value: undefined })}>
                    <SelectTrigger aria-label={t("clCondField", { n })} className="h-8 w-44 bg-card text-xs"><SelectValue>{t(`clField_${c.field}`)}</SelectValue></SelectTrigger>
                    <SelectContent>{fields.map((f) => <SelectItem key={f} value={f}>{t(`clField_${f}`)}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={c.op} onValueChange={(v) => setCond(c.id, { op: v as FilterCondition["op"] })}>
                    <SelectTrigger aria-label={t("clCondOp", { n })} className="h-8 w-36 bg-card text-xs"><SelectValue>{t(`clOp_${c.op}`)}</SelectValue></SelectTrigger>
                    <SelectContent>{ops.map((o) => <SelectItem key={o} value={o}>{t(`clOp_${o}`)}</SelectItem>)}</SelectContent>
                  </Select>
                  {c.op !== "isEmpty" && c.op !== "isNotEmpty" &&
                    (isNumberField(c.field) ? (
                      <Input type="number" min={0} value={c.value ?? ""} onChange={(e) => setCond(c.id, { value: e.target.value })} aria-label={t("clCondValue", { n })} className="h-8 w-32 bg-card text-xs tabular-nums" />
                    ) : (
                      <Select value={c.value ?? ""} onValueChange={(v) => setCond(c.id, { value: v })}>
                        <SelectTrigger aria-label={t("clCondValue", { n })} className="h-8 w-44 bg-card text-xs"><SelectValue placeholder={t("clPickValue")}>{c.value ? options[c.field as ChoiceField].find(([v]) => v === c.value)?.[1] : undefined}</SelectValue></SelectTrigger>
                        <SelectContent>{options[c.field as ChoiceField].map(([v, label]) => <SelectItem key={v} value={v}>{label}</SelectItem>)}</SelectContent>
                      </Select>
                    ))}
                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label={t("clRemoveCond", { n })} onClick={() => onFilter({ ...filter, conditions: filter.conditions.filter((x) => x.id !== c.id) })}>
                    <X className="size-4" />
                  </Button>
                </li>
              )
            })}
          </ul>
          <Button variant="ghost" size="sm" className="mt-2" onClick={add} disabled={filter.conditions.length >= 8}>
            <Plus className="size-4" />
            {t("clAddCond")}
          </Button>
        </fieldset>
      )}
    </div>
  )
}
