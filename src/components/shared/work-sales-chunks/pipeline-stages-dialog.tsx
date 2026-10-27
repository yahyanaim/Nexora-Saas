"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowDown, ArrowUp, Plus, Trash2 } from "@/components/ui/carbon/icons"
import { createId } from "@/lib/workforce/demo-store"
import { DEFAULT_PIPELINE, MAX_STAGES } from "@/lib/workforce/deals"
import { OPEN_STAGES, type DealStageId, type PipelineSettings, type PipelineStage } from "@/types/work-sales"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  pipeline: PipelineSettings
  /** How many open deals sit in a stage */
  countOf: (stage: DealStageId) => number
  saving: boolean
  onSave: (pipeline: PipelineSettings, moves: Record<string, DealStageId>) => void
}

const isDefault = (id: string) => (OPEN_STAGES as readonly string[]).includes(id)

/**
 * Edits the company's sales pipeline (CRM step 8): rename, add, reorder and
 * remove open stages, set each stage's default chance and the stale limit.
 * Won and lost stay fixed. Deals of a removed stage move to a stage chosen here.
 * Mounted when opened, so each opening starts from the saved pipeline.
 */
export function PipelineStagesDialog({ open, onOpenChange, pipeline, countOf, saving, onSave }: Props) {
  const t = useTranslations()
  const [draft, setDraft] = useState<PipelineSettings>(pipeline)
  const [moves, setMoves] = useState<Record<string, DealStageId>>({})
  const [added, setAdded] = useState<string | null>(null)

  const labelOf = (s: PipelineStage) => s.name?.trim() || (isDefault(s.id) ? t(`dealStage_${s.id}`) : "")
  const set = (id: string, patch: Partial<PipelineStage>) => setDraft((d) => ({ ...d, stages: d.stages.map((s) => (s.id === id ? { ...s, ...patch } : s)) }))
  const move = (i: number, by: -1 | 1) =>
    setDraft((d) => {
      const next = [...d.stages]
      const j = i + by
      if (j < 0 || j >= next.length) return d
      ;[next[i], next[j]] = [next[j]!, next[i]!]
      return { ...d, stages: next }
    })
  const add = () => {
    const id = createId("stg")
    setAdded(id)
    setDraft((d) => ({ ...d, stages: [...d.stages, { id, name: "", probability: 50 }] }))
  }
  const remove = (id: string) => setDraft((d) => ({ ...d, stages: d.stages.filter((s) => s.id !== id) }))

  // stages removed while deals still sit in them need a destination
  const removed = pipeline.stages.filter((s) => !draft.stages.some((x) => x.id === s.id) && countOf(s.id) > 0)
  const problem = (s: PipelineStage) => {
    const key = labelOf(s).toLowerCase()
    if (!key) return t("dpsNeedsName")
    if (draft.stages.filter((x) => labelOf(x).toLowerCase() === key).length > 1) return t("dpsSameName")
    if (!(Number.isInteger(s.probability) && s.probability >= 0 && s.probability <= 100)) return t("dpsChanceRange")
    return ""
  }
  const staleOk = Number.isInteger(draft.staleDays) && draft.staleDays >= 1 && draft.staleDays <= 365
  const invalid = draft.stages.length === 0 || draft.stages.some((s) => problem(s)) || !staleOk || removed.some((s) => !moves[s.id])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("dpsTitle")}</DialogTitle>
          <DialogDescription>{t("dpsDescription")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-[1fr_5.5rem_auto] items-end gap-1.5 px-0.5 text-xs font-medium text-muted-foreground">
            <span>{t("dpsStage")}</span>
            <span>{t("dpsChance")}</span>
            <span className="w-[7.5rem]" />
          </div>
          <ul className="flex flex-col gap-2">
            {draft.stages.map((s, i) => {
              const error = problem(s)
              const label = labelOf(s) || t("dpsNewStage")
              const count = countOf(s.id)
              return (
                <li key={s.id} className="flex flex-col gap-1">
                  <div className="grid grid-cols-[1fr_5.5rem_auto] items-center gap-1.5">
                    <Input
                      autoFocus={s.id === added}
                      value={s.name ?? ""}
                      onChange={(e) => set(s.id, { name: e.target.value })}
                      placeholder={isDefault(s.id) ? t(`dealStage_${s.id}`) : t("dpsNamePlaceholder")}
                      maxLength={40}
                      aria-label={t("dpsStageName", { n: i + 1 })}
                      aria-invalid={!!error}
                      aria-describedby={error ? `dps-err-${s.id}` : undefined}
                      className="h-9"
                    />
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={Number.isNaN(s.probability) ? "" : s.probability}
                        onChange={(e) => set(s.id, { probability: e.target.value === "" ? NaN : Number(e.target.value) })}
                        aria-label={t("dpsChanceOf", { name: label })}
                        className="h-9 pe-7 tabular-nums"
                      />
                      <span aria-hidden className="pointer-events-none absolute inset-y-0 end-2.5 flex items-center text-xs text-muted-foreground">%</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-12 text-end text-xs text-muted-foreground tabular-nums">{t("dpsDealCount", { count })}</span>
                      <Button type="button" variant="ghost" size="icon" className="size-8" disabled={i === 0} aria-label={t("stMoveUp", { name: label })} onClick={() => move(i, -1)}><ArrowUp className="size-3.5" /></Button>
                      <Button type="button" variant="ghost" size="icon" className="size-8" disabled={i === draft.stages.length - 1} aria-label={t("stMoveDown", { name: label })} onClick={() => move(i, 1)}><ArrowDown className="size-3.5" /></Button>
                      <Button type="button" variant="ghost" size="icon" className="size-8" disabled={draft.stages.length === 1} aria-label={t("stRemove", { name: label })} onClick={() => remove(s.id)}><Trash2 className="size-3.5" /></Button>
                    </div>
                  </div>
                  {error && <p id={`dps-err-${s.id}`} className="text-xs text-destructive">{error}</p>}
                </li>
              )
            })}
          </ul>
          <Button type="button" variant="ghost" size="sm" className="self-start" disabled={draft.stages.length >= MAX_STAGES} onClick={add}>
            <Plus className="size-4" />
            {t("dpsAdd")}
          </Button>
          <p className="text-xs text-muted-foreground">{t("dpsFixedHint")}</p>

          {removed.length > 0 && (
            <section className="flex flex-col gap-2 rounded-xl border border-warning/40 bg-warning-soft p-3">
              <p className="text-sm font-medium text-warning-foreground">{t("dpsMoveTitle")}</p>
              {removed.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">{t("dpsMoveFrom", { name: labelOf(s), count: countOf(s.id) })}</span>
                  <Select value={moves[s.id]} onValueChange={(v) => setMoves((m) => ({ ...m, [s.id]: v }))}>
                    <SelectTrigger className="h-8 w-44 bg-card" aria-label={t("dpsMoveTo", { name: labelOf(s) })}><SelectValue placeholder={t("dpsChooseStage")} /></SelectTrigger>
                    <SelectContent>{draft.stages.filter((x) => labelOf(x)).map((x) => <SelectItem key={x.id} value={x.id}>{labelOf(x)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ))}
            </section>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dps-stale">{t("dpsStaleLabel")}</Label>
            <div className="flex items-center gap-2">
              <Input
                id="dps-stale"
                type="number"
                min={1}
                max={365}
                value={Number.isNaN(draft.staleDays) ? "" : draft.staleDays}
                onChange={(e) => setDraft((d) => ({ ...d, staleDays: e.target.value === "" ? NaN : Number(e.target.value) }))}
                aria-invalid={!staleOk}
                aria-describedby="dps-stale-hint"
                className="h-9 w-24 tabular-nums"
              />
              <span className="text-sm text-muted-foreground">{t("dpsDays")}</span>
            </div>
            <p id="dps-stale-hint" className={staleOk ? "text-xs text-muted-foreground" : "text-xs text-destructive"}>{staleOk ? t("dpsStaleHint") : t("dpsStaleRange")}</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => setDraft({ ...DEFAULT_PIPELINE, staleDays: draft.staleDays })}>{t("dpsReset")}</Button>
          <Button disabled={invalid || saving} onClick={() => onSave(draft, moves)}>{t("save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
