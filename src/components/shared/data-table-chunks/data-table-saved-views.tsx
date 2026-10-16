"use client"

import * as React from "react"
import type { Table } from "@tanstack/react-table"
import { useTranslations } from "next-intl"
import { toast } from "@/lib/utils/toast"
import { Bookmark, Checkmark, Plus, Trash2 } from "@/components/ui/carbon/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useGetDirection } from "@/hooks/use-get-direction"
import { isCurrentView, readTableViews, removeView, saveView, writeTableViews, type TableView, type TableViewState } from "@/lib/ui/saved-views"

/**
 * The Views menu of a list (A11 step 5): save the current filters, search,
 * sort and rows per page under a name, reopen a view in one click, delete it.
 */
export function DataTableSavedViews<TData>({ table, list }: { table: Table<TData>; list: string }) {
  const t = useTranslations()
  const { dir } = useGetDirection()
  const { authedUser } = useAuthGuard()
  const userId = authedUser?.id ?? "me"
  // read when the menu first shows, as the projects' saved views do (storage is absent while prerendering)
  const [views, setViews] = React.useState<TableView[]>(() => (typeof window === "undefined" ? [] : readTableViews(list, userId)))
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState("")

  const s = table.getState()
  const current: TableViewState = { sorting: s.sorting, columnFilters: s.columnFilters, pageSize: s.pagination.pageSize }
  const active = views.find((v) => isCurrentView(v, current))

  const update = (next: TableView[]) => {
    setViews(next)
    writeTableViews(list, userId, next)
  }
  const apply = (v: TableView) => {
    table.setSorting(v.sorting)
    table.setColumnFilters(v.columnFilters)
    table.setPageSize(v.pageSize)
    table.setPageIndex(0)
  }
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    update(saveView(views, name, current, crypto.randomUUID()))
    toast.success(t("tvSaved", { name: name.trim() }))
    setName("")
    setOpen(false)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" aria-label={active ? `${t("tvViews")}: ${active.name}` : t("tvViews")} className="px-4 max-sm:size-10 max-sm:px-0">
            <Bookmark />
            <span className="hidden max-w-32 truncate sm:inline">{active ? active.name : t("tvViews")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={dir === "rtl" ? "start" : "end"} className="w-64">
          {views.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">{t("tvNone")}</p>
          ) : (
            views.map((v) => (
              <DropdownMenuItem key={v.id} className="group cursor-pointer gap-2 text-xs" onClick={() => apply(v)}>
                <Checkmark className={`size-3.5 shrink-0 text-primary ${active?.id === v.id ? "" : "invisible"}`} aria-hidden />
                <span className="min-w-0 flex-1 truncate">{v.name}</span>
                <button
                  type="button"
                  aria-label={t("tvDelete", { name: v.name })}
                  className="rounded p-0.5 text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={(e) => {
                    e.stopPropagation()
                    update(removeView(views, v.id))
                  }}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </DropdownMenuItem>
            ))
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
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
              <Button type="submit" disabled={!name.trim()}>{t("save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
