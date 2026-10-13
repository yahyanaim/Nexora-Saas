"use client"

import type { Column, FilterFn, Row } from "@tanstack/react-table"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { DataTableColumnHeader } from "@/components/shared/data-table-chunks/data-table-column-header"
import { Link } from "@/i18n/navigation"

/**
 * Small pieces the console lists share on the ERP's rich table
 * (data-table-chunks): a sortable header, the faceted-filter test, a search
 * over several fields, and the name cell with its initials avatar.
 */

export const sortHeader = (title: string) =>
  function Header<T>({ column }: { column: Column<T, unknown> }) {
    return <DataTableColumnHeader column={column} title={title} />
  }

/** Faceted filter: keep the row when its value is one of the ticked options (or none are ticked). */
export function inSelection<T>(row: Row<T>, id: string, selected: unknown) {
  return !Array.isArray(selected) || selected.length === 0 || selected.includes(String(row.getValue(id)))
}

/** Search: the typed words appear in one of the row's texts. */
export function searchIn<T>(fields: (row: T) => (string | undefined | null)[]): FilterFn<T> {
  return (row: Row<T>, _id, value) => {
    const q = String(value ?? "").trim().toLowerCase()
    return !q || fields(row.original).some((f) => (f ?? "").toLowerCase().includes(q))
  }
}

/** A person or company with initials, a main line and a muted second line. */
export function NameCell({ name, sub, href, onOpen, avatar }: { name: string; sub?: React.ReactNode; href?: string; onOpen?: () => void; avatar?: string }) {
  const inner = (
    <>
      <SpaceAvatar name={name} src={avatar} size="md" />
      <span className="flex min-w-0 flex-col text-start">
        <span className="truncate font-medium text-foreground">{name}</span>
        {sub && <span className="truncate text-xs text-muted-foreground">{sub}</span>}
      </span>
    </>
  )
  const cls = "flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  if (href) return <Link href={href} className={cls}>{inner}</Link>
  if (onOpen) return <button type="button" onClick={onOpen} className={cls}>{inner}</button>
  return <span className={cls}>{inner}</span>
}
