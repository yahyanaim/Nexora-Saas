"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useHealthOverride } from "@/hooks/workforce/use-task-collab"
import { ProjectHealth, type WorkProject } from "@/types/work-projects"
import { HEALTH_LABEL } from "./project-labels"

const CHOICES = [ProjectHealth.ON_TRACK, ProjectHealth.AT_RISK, ProjectHealth.LATE]

/** Lets a manager set the health by hand, with a required reason (PRJ-10). */
export function HealthOverrideDialog({
  project,
  automatic,
  open,
  onOpenChange,
}: {
  project: WorkProject
  automatic: ProjectHealth
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations()
  const mutation = useHealthOverride(project.id)
  const [health, setHealth] = useState(project.healthOverride?.health ?? automatic)
  const [reason, setReason] = useState(project.healthOverride?.reason ?? "")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("setProjectHealth")}</DialogTitle>
          <DialogDescription>{t("automaticHealthIs", { health: t(HEALTH_LABEL[automatic]) })}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>{t("health")}</Label>
            <Select value={health} onValueChange={(v) => setHealth(v as ProjectHealth)}>
              <SelectTrigger className="w-full bg-card"><SelectValue>{t(HEALTH_LABEL[health])}</SelectValue></SelectTrigger>
              <SelectContent>
                {CHOICES.map((h) => <SelectItem key={h} value={h}>{t(HEALTH_LABEL[h])}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="health-reason">{t("reason")}</Label>
            <Textarea id="health-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("healthReasonPlaceholder")} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          {project.healthOverride && (
            <Button variant="ghost" onClick={() => mutation.mutate(null, { onSuccess: () => onOpenChange(false) })}>
              {t("useAutomaticHealth")}
            </Button>
          )}
          <Button disabled={!reason.trim() || mutation.isPending} onClick={() => mutation.mutate({ health, reason }, { onSuccess: () => onOpenChange(false) })}>
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
