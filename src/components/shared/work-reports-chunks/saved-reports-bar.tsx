"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Star, Users, X } from "@/components/ui/carbon/icons"
import { cn } from "@/lib/utils"
import { toast } from "@/lib/utils/toast"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useEmployees } from "@/hooks/workforce/use-workforce"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { deleteSavedReportApi, listSavedReportsApi, saveReportApi, type SavedReport } from "@/lib/api/saved-reports-api"
import { WORK_ROLES, WorkRole } from "@/types/workforce"
import { WORK_ROLE_LABEL } from "../workforce-chunks/workforce-labels"

const PRIVATE = "__private__"
type Filters = SavedReport["filters"]

/** Saved reports: one click reapplies a report with its filters; shared ones show for a role (RPT-5). */
export function SavedReportsBar({ reportId, filters, reportName, onApply }: { reportId: string; filters: Filters; reportName: string; onApply: (reportId: string, filters: Filters) => void }) {
  const t = useTranslations()
  const { id: ws } = useCurrentWorkspace()
  const qc = useQueryClient()
  const { authedUser } = useAuthGuard()
  const { data: employees = [] } = useEmployees()
  const me = employees.find((e) => e.id === (authedUser as { employeeId?: string } | undefined)?.employeeId || e.email === authedUser?.email)
  const viewer = { id: authedUser?.id ?? "me", role: me?.role ?? (authedUser?.role === "admin" ? WorkRole.ADMIN : undefined) }
  const { data: saved = [] } = useQuery({ queryKey: ["saved-reports", ws, viewer.id, viewer.role], queryFn: () => listSavedReportsApi(ws, viewer) })
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [share, setShare] = useState<string>(PRIVATE)
  const onError = (e: unknown) => toast.error(e instanceof Error ? e.message : t("somethingWentWrong"))
  const refresh = () => qc.invalidateQueries({ queryKey: ["saved-reports", ws] })

  const save = useMutation({
    mutationFn: () =>
      saveReportApi(ws, { name, reportId, filters, ownerId: viewer.id, ownerName: authedUser?.name ?? "", sharedWith: share === PRIVATE ? undefined : (share as WorkRole | "all") }),
    onSuccess: () => {
      toast.success(t("reportSaved"))
      refresh()
      setOpen(false)
    },
    onError,
  })
  const remove = useMutation({ mutationFn: (id: string) => deleteSavedReportApi(ws, id, viewer.id), onSuccess: refresh, onError })

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setName(reportName)
          setShare(PRIVATE)
          setOpen(true)
        }}
      >
        <Star className="size-4" /> {t("saveReport")}
      </Button>
      {saved.map((r) => (
        <span key={r.id} className={cn("inline-flex items-center gap-1 rounded-full border border-border bg-card ps-3 text-xs", r.ownerId !== viewer.id && "border-dashed")}>
          <button type="button" className="py-1.5 font-medium hover:text-primary" onClick={() => onApply(r.reportId, r.filters)} title={r.ownerId !== viewer.id ? t("sharedBy", { name: r.ownerName }) : undefined}>
            {r.name}
          </button>
          {r.sharedWith && <Users className="size-3 text-muted-foreground" aria-label={t("shared")} />}
          {r.ownerId === viewer.id ? (
            <button type="button" aria-label={t("delete")} className="rounded-full p-1.5 text-muted-foreground hover:text-destructive" onClick={() => remove.mutate(r.id)}>
              <X className="size-3" />
            </button>
          ) : (
            <span className="pe-2" />
          )}
        </span>
      ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("saveReport")}</DialogTitle>
            <DialogDescription>{t("saveReportHint")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="sr-name">{t("name")}</Label>
              <Input id="sr-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("shareWith")}</Label>
              <Select value={share} onValueChange={setShare}>
                <SelectTrigger className="w-full bg-card">
                  <SelectValue>{share === PRIVATE ? t("onlyMe") : share === "all" ? t("everyone") : t(WORK_ROLE_LABEL[share as WorkRole])}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PRIVATE}>{t("onlyMe")}</SelectItem>
                  <SelectItem value="all">{t("everyone")}</SelectItem>
                  {WORK_ROLES.filter((r) => r !== WorkRole.CLIENT).map((r) => <SelectItem key={r} value={r}>{t(WORK_ROLE_LABEL[r])}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
            <Button disabled={!name.trim() || save.isPending} onClick={() => save.mutate()}>{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
