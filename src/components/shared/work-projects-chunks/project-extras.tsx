"use client"

import * as React from "react"
import { useLocale, useTranslations } from "next-intl"
import { RotateCcw, Trash2 } from "@/components/ui/carbon/icons"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state"
import { useDeletedTasks, useTaskMutations } from "@/hooks/workforce/use-work-projects"
import { taskKey } from "@/lib/workforce/task-extras"
import { TASK_BIN_DAYS, taskBinDaysLeft } from "@/lib/workforce/task-repeat"
import { cn } from "@/lib/utils"
import type { WorkTask } from "@/types/work-projects"

/*
 * Project extras: the deleted tasks of a project, and keyboard shortcuts on
 * the project page.
 */

/** Deleted tasks wait here TASK_BIN_DAYS days: restore, or delete for good. */
export function DeletedTasksDialog({ projectId, projectCode, open, onOpenChange }: { projectId: string; projectCode: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations()
  const locale = useLocale()
  const { data: deleted = [], isLoading } = useDeletedTasks(projectId)
  const { restore, purge } = useTaskMutations()
  const [purging, setPurging] = React.useState<WorkTask | null>(null)
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso))

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("pxBinTitle")}</DialogTitle>
            <DialogDescription>{t("pxBinHint", { days: TASK_BIN_DAYS })}</DialogDescription>
          </DialogHeader>
          {isLoading ? (
            <ListSkeleton rows={3} />
          ) : deleted.length === 0 ? (
            <EmptyState icon={Trash2} title={t("pxBinEmpty")} hint={t("pxBinEmptyHint")} />
          ) : (
            <ul className="divide-y divide-border rounded-2xl border border-border">
              {deleted.map((task) => {
                const left = taskBinDaysLeft(task.deletedAt!)
                return (
                  <li key={task.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {task.number && <span className="me-1.5 font-mono text-xs font-normal text-muted-foreground">{taskKey(task, { code: projectCode })}</span>}
                        {task.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{t("pxDeletedLine", { date: date(task.deletedAt!), name: task.deletedBy ?? "—" })}</p>
                    </div>
                    <Badge variant="outline" className={cn("border-transparent", left <= 7 ? "bg-warning-soft text-warning-foreground" : "bg-muted text-muted-foreground")}>{t("csDaysLeft", { n: left })}</Badge>
                    <Button size="sm" variant="outline" disabled={restore.isPending} onClick={() => restore.mutate(task.id)} aria-label={t("csRestoreName", { name: task.title })}>
                      <RotateCcw className="size-4" />
                      {t("csRestore")}
                    </Button>
                    <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => setPurging(task)} aria-label={t("csPurgeName", { name: task.title })}>
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </DialogContent>
      </Dialog>
      <ConfirmAlertDialog
        open={!!purging}
        onOpenChange={(o) => !o && setPurging(null)}
        title={t("csPurgeTitle")}
        description={t("pxPurgeConfirm", { name: purging?.title ?? "" })}
        confirmLabel={t("csPurge")}
        destructive
        isLoading={purge.isPending}
        onConfirm={() => purging && purge.mutate(purging.id, { onSuccess: () => setPurging(null) })}
      />
    </>
  )
}

/** The keys of the project page; tab keys only when that tab is there. */
export const PROJECT_SHORTCUTS = [
  { key: "n", action: "new" },
  { key: "b", action: "board" },
  { key: "l", action: "list" },
  { key: "s", action: "spreadsheet" },
  { key: "c", action: "calendar" },
  { key: "g", action: "gantt" },
  { key: "?", action: "help" },
] as const
export type ShortcutAction = (typeof PROJECT_SHORTCUTS)[number]["action"]

/** Whether a key press should be left to the page: typing, menus, dialogs, modifier keys. */
export function ignoreShortcut(e: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey" | "defaultPrevented">, target: EventTarget | null) {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return true
  const el = target as HTMLElement | null
  if (!el || typeof el.closest !== "function") return false
  return !!el.closest("input, textarea, select, [contenteditable=''], [contenteditable='true'], [role='dialog'], [role='menu'], [role='listbox']")
}

/** Runs the project page's shortcuts while the page is open. */
export function useProjectShortcuts(run: (action: ShortcutAction) => void) {
  const ref = React.useRef(run)
  React.useEffect(() => {
    ref.current = run
  })
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (ignoreShortcut(e, e.target)) return
      const hit = PROJECT_SHORTCUTS.find((s) => s.key === e.key.toLowerCase() || s.key === e.key)
      if (!hit) return
      e.preventDefault()
      ref.current(hit.action)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])
}

/** The list of shortcuts, opened with "?". */
export function ShortcutsDialog({ open, onOpenChange, canEdit }: { open: boolean; onOpenChange: (open: boolean) => void; canEdit: boolean }) {
  const t = useTranslations()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("pxKeysTitle")}</DialogTitle>
          <DialogDescription>{t("pxKeysHint")}</DialogDescription>
        </DialogHeader>
        <dl className="divide-y divide-border rounded-2xl border border-border">
          {PROJECT_SHORTCUTS.filter((s) => canEdit || s.action !== "new").map((s) => (
            <div key={s.key} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <dt>{t(`pxKey_${s.action}`)}</dt>
              <dd><kbd className="rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-xs">{s.key === "?" ? "?" : s.key.toUpperCase()}</kbd></dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  )
}
