"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { BadgeCheck, Flag, Plus, Trash2 } from "@/components/ui/carbon/icons"
import { MilestoneState, milestoneState, taskProgress, todayIso } from "@/lib/workforce/project-metrics"
import { TaskStatus, type Milestone, type MilestoneInput, type WorkTask } from "@/types/work-projects"
import { MILESTONE_STATE_CLASS, MILESTONE_STATE_LABEL, formatShortDate } from "./project-labels"

interface Props {
  projectId: string
  milestones: Milestone[]
  tasks: WorkTask[]
  canEdit: boolean
  onCreate: (input: MilestoneInput, done: () => void) => void
  onApprove: (id: string, approved: boolean) => void
  onDelete: (id: string) => void
  isSaving?: boolean
}

/** Milestones in date order, with their task progress and the client's sign-off. */
export function MilestonesPanel({ projectId, milestones, tasks, canEdit, onCreate, onApprove, onDelete, isSaving }: Props) {
  const t = useTranslations()
  const locale = useLocale()
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState<Milestone | null>(null)
  const [title, setTitle] = useState("")
  const [dueDate, setDueDate] = useState(todayIso())
  const [requiresApproval, setRequiresApproval] = useState(true)

  const openAdd = () => {
    setTitle("")
    setDueDate(todayIso())
    setRequiresApproval(true)
    setAdding(true)
  }

  const submit = () => {
    if (title.trim().length < 2 || !dueDate) return
    onCreate({ projectId, title: title.trim(), dueDate, requiresApproval }, () => setAdding(false))
  }

  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
      <header className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{t("milestones")}</h2>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={openAdd}>
            <Plus className="size-4" />
            {t("addMilestone")}
          </Button>
        )}
      </header>

      {milestones.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-10 text-center">
          <Flag className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("noMilestonesYet")}</p>
        </div>
      ) : (
        <ol className="flex flex-col gap-3">
          {milestones.map((milestone) => {
            const own = tasks.filter((task) => task.milestoneId === milestone.id)
            const state = milestoneState(milestone, tasks)
            const done = own.filter((task) => task.status === TaskStatus.DONE).length
            return (
              <li key={milestone.id} className="flex flex-col gap-3 rounded-2xl border border-border p-4 md:flex-row md:items-center md:gap-6">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{milestone.title}</h3>
                    <Badge variant="outline" className={MILESTONE_STATE_CLASS[state]}>
                      {t(MILESTONE_STATE_LABEL[state])}
                    </Badge>
                    {milestone.requiresApproval && state !== MilestoneState.AWAITING_APPROVAL && (
                      <span className="text-xs text-muted-foreground">
                        {milestone.approvedAt ? t("approvedByClient") : t("needsClientApproval")}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("dueOn", { date: formatShortDate(milestone.dueDate, locale) })} ·{" "}
                    {t("tasksDone", { done, total: own.length })}
                  </p>
                </div>
                <div className="flex items-center gap-3 md:w-72">
                  <Progress value={taskProgress(own)} aria-label={t("progress")} className="h-2 flex-1" />
                  <span className="w-10 text-right text-sm font-medium tabular-nums">{taskProgress(own)}%</span>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1">
                    {milestone.requiresApproval && (
                      <Button
                        variant={milestone.approvedAt ? "outline" : "default"}
                        size="sm"
                        disabled={!milestone.approvedAt && state !== MilestoneState.AWAITING_APPROVAL}
                        title={!milestone.approvedAt && state !== MilestoneState.AWAITING_APPROVAL ? t("finishTasksFirst") : undefined}
                        onClick={() => onApprove(milestone.id, !milestone.approvedAt)}
                      >
                        <BadgeCheck className="size-4" />
                        {milestone.approvedAt ? t("withdrawApproval") : t("markApproved")}
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" aria-label={t("deleteMilestone")} onClick={() => setDeleting(milestone)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      )}

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addMilestone")}</DialogTitle>
            <DialogDescription>{t("addMilestoneDescription")}</DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="milestone-title">{t("milestoneTitle")}</Label>
              <Input id="milestone-title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="milestone-date">{t("dueDate")}</Label>
              <Input id="milestone-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <label className="flex items-center justify-between gap-4 rounded-xl border border-border p-3 text-sm">
              {t("requiresClientApproval")}
              <Switch checked={requiresApproval} onChange={setRequiresApproval} />
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAdding(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isSaving || title.trim().length < 2}>
                {t("create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmAlertDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("deleteMilestone")}
        description={t("deleteMilestoneConfirmation", { name: deleting?.title ?? "" })}
        confirmLabel={t("delete")}
        destructive
        onConfirm={() => {
          if (deleting) onDelete(deleting.id)
          setDeleting(null)
        }}
      />
    </section>
  )
}
