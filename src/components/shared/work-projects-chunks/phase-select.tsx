"use client"

import { useTranslations } from "next-intl"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useMilestones } from "@/hooks/workforce/use-work-projects"

const NO_PHASE = "__no_phase__"

/** Picks the project phase (milestone) a cost counts against; hidden until a project with phases is chosen (Phase 6h.5). */
export function PhaseSelect({ projectId, value, onChange, className }: { projectId?: string; value?: string; onChange: (milestoneId: string | undefined) => void; className?: string }) {
  const t = useTranslations()
  const { data: milestones = [] } = useMilestones(projectId)
  if (!projectId || milestones.length === 0) return null
  return (
    <div className={className ?? "flex flex-col gap-2"}>
      <Label>{t("phaseLabel")}</Label>
      <Select value={value || NO_PHASE} onValueChange={(v) => onChange(v === NO_PHASE ? undefined : v)}>
        <SelectTrigger className="w-full bg-card" aria-label={t("phaseLabel")}><SelectValue>{milestones.find((m) => m.id === value)?.title ?? t("phaseNone")}</SelectValue></SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_PHASE}>{t("phaseNone")}</SelectItem>
          {milestones.map((m) => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}
