"use client"

import * as React from "react"
import type { Table } from "@tanstack/react-table"
import { useTranslations } from "next-intl"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "@/lib/utils/toast"
import { Bookmark, Checkmark, Plus, Trash2, Users } from "@/components/ui/carbon/icons"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useGetDirection } from "@/hooks/use-get-direction"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { can } from "@/lib/permissions/can"
import { AdminPermissionsPlatform } from "@/types/roles"
import { translateError } from "@/lib/errors/translate-error"
import { getAuditActor } from "@/lib/workforce/audit"
import { deleteSharedViewApi, listSharedViewsApi, saveSharedViewApi } from "@/lib/api/table-views-api"
import { isCurrentView, readTableViews, removeView, saveView, writeTableViews, type TableView, type TableViewState } from "@/lib/ui/saved-views"

/** A list's own settings kept in its views, beside filters and sort (CRM step 10) */
export interface ViewExtra {
  value: Record<string, unknown>
  apply: (extra: Record<string, unknown> | undefined) => void
}

/**
 * The Views menu of a list (A11 step 5): save the current filters, search,
 * sort and rows per page under a name, reopen a view in one click, delete it.
 * A view can be shared with the whole team (CRM step 10).
 */
export function DataTableSavedViews<TData>({ table, list, extra }: { table: Table<TData>; list: string; extra?: ViewExtra }) {
  const t = useTranslations()
  const { dir } = useGetDirection()
  const { authedUser } = useAuthGuard()
  const { id: workspaceId } = useCurrentWorkspace()
  const qc = useQueryClient()
  const userId = authedUser?.id ?? "me"
  const canManage = can(authedUser, AdminPermissionsPlatform.ROLES_READ)
  // read when the menu first shows, as the projects' saved views do (storage is absent while prerendering)
  const [views, setViews] = React.useState<TableView[]>(() => (typeof window === "undefined" ? [] : readTableViews(list, userId)))
  const { data: teamViews = [] } = useQuery({ queryKey: ["table-views", workspaceId, list], queryFn: () => listSharedViewsApi(workspaceId, list) })
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  const [share, setShare] = React.useState(false)

  const s = table.getState()
  const current: TableViewState = { sorting: s.sorting, columnFilters: s.columnFilters, pageSize: s.pagination.pageSize, ...(extra ? { extra: extra.value } : {}) }
  const active = [...views, ...teamViews].find((v) => isCurrentView(v, current))

  const refreshTeam = () => qc.invalidateQueries({ queryKey: ["table-views", workspaceId, list] })
  const shareView = useMutation({
    mutationFn: (viewName: string) => saveSharedViewApi(workspaceId, list, viewName, current),
    onSuccess: (v) => {
      toast.success(t("tvShared", { name: v.name }))
      refreshTeam()
      setName("")
      setShare(false)
      setOpen(false)
    },
    onError: (err) => toast.error(translateError(err, t)),
  })
  const unshare = useMutation({
    mutationFn: (id: string) => deleteSharedViewApi(workspaceId, id, canManage),
    onSuccess: refreshTeam,
    onError: (err) => toast.error(translateError(err, t)),
  })

  const update = (next: TableView[]) => {
    setViews(next)
    writeTableViews(list, userId, next)
  }
  const apply = (v: TableView) => {
    table.setSorting(v.sorting)
    table.setColumnFilters(v.columnFilters)
    table.setPageSize(v.pageSize)
    table.setPageIndex(0)
    extra?.apply(v.extra)
  }
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    if (share) return shareView.mutate(name)
    update(saveView(views, name, current, crypto.randomUUID()))
    toast.success(t("tvSaved", { name: name.trim() }))
    setName("")
    setOpen(false)
  }

  const me = getAuditActor().id
  const item = (v: TableView, onDelete?: () => void) => (
    <DropdownMenuItem key={v.id} className="group cursor-pointer gap-2 text-xs" onClick={() => apply(v)}>
      <Checkmark className={`size-3.5 shrink-0 text-primary ${active?.id === v.id ? "" : "invisible"}`} aria-hidden />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{v.name}</span>
        {v.shared && v.ownerName && <span className="truncate text-[11px] text-muted-foreground">{t("tvBy", { name: v.ownerName })}</span>}
      </span>
      {onDelete && (
        <button
          type="button"
          aria-label={t("tvDelete", { name: v.name })}
          className="rounded p-0.5 text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 className="size-3.5" />
        </button>
      )}
    </DropdownMenuItem>
  )

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" aria-label={active ? `${t("tvViews")}: ${active.name}` : t("tvViews")} className="px-4 max-sm:size-10 max-sm:px-0">
            {active?.shared ? <Users /> : <Bookmark />}
            <span className="hidden max-w-32 truncate sm:inline">{active ? active.name : t("tvViews")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={dir === "rtl" ? "start" : "end"} className="w-64">
          {views.length === 0 && teamViews.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">{t("tvNone")}</p>
          ) : (
            <>
              {views.length > 0 && (
                <>
                  <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground">{t("tvMine")}</DropdownMenuLabel>
                  {views.map((v) => item(v, () => update(removeView(views, v.id))))}
                </>
              )}
              {teamViews.length > 0 && (
                <>
                  {views.length > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground">{t("tvTeam")}</DropdownMenuLabel>
                  {teamViews.map((v) => item(v, v.ownerId === me || canManage ? () => unshare.mutate(v.id) : undefined))}
                </>
              )}
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer gap-2 text-xs" onClick={() => setOpen(true)}>
            <Plus className="size-3.5 text-muted-foreground" />
            <span>{t("tvSaveCurrent")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>{t("tvSaveTitle")}</DialogTitle>
              <DialogDescription>{t("tvSaveHint")}</DialogDescription>
            </DialogHeader>
            <Label htmlFor={`tv-name-${list}`}>{t("tvName")}</Label>
            <Input id={`tv-name-${list}`} className="mt-1.5" value={name} maxLength={60} autoFocus onChange={(e) => setName(e.target.value)} placeholder={t("tvNamePlaceholder")} />
            <label className="mt-3 flex items-start gap-2 text-sm">
              <Checkbox checked={share} onCheckedChange={(v) => setShare(!!v)} className="mt-0.5" />
              <span>
                <span className="font-medium">{t("tvShareLabel")}</span>
                <span className="block text-xs text-muted-foreground">{t("tvShareHint")}</span>
              </span>
            </label>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
              <Button type="submit" disabled={!name.trim() || shareView.isPending}>{t("save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
