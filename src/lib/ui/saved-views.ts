import type { ColumnFiltersState, SortingState } from "@tanstack/react-table"

/**
 * Named views of a list (A11 step 5): its filters (the search box included),
 * sort and rows per page. They live per person in this browser, like the
 * projects' saved views; the server will store them per account (Lot B).
 */
export interface TableView {
  id: string
  name: string
  sorting: SortingState
  columnFilters: ColumnFiltersState
  pageSize: number
  /** A list's own settings kept with the view, e.g. the clients' AND/OR filter and grouping (CRM step 10) */
  extra?: Record<string, unknown>
  /** Shared with the whole team instead of kept for one person (CRM step 10) */
  shared?: boolean
  ownerId?: string
  ownerName?: string
}

export type TableViewState = Pick<TableView, "sorting" | "columnFilters" | "pageSize" | "extra">

/** At most this many views per list and person */
export const MAX_VIEWS = 20

export function viewsStorageKey(list: string, userId: string) {
  return `nexora:table-views:${list}:${userId}`
}

function isView(v: unknown): v is TableView {
  if (!v || typeof v !== "object") return false
  const x = v as Record<string, unknown>
  return (
    typeof x.id === "string" &&
    typeof x.name === "string" &&
    Array.isArray(x.sorting) &&
    x.sorting.every((s) => s && typeof s === "object" && typeof (s as { id?: unknown }).id === "string" && typeof (s as { desc?: unknown }).desc === "boolean") &&
    Array.isArray(x.columnFilters) &&
    x.columnFilters.every((f) => f && typeof f === "object" && typeof (f as { id?: unknown }).id === "string") &&
    typeof x.pageSize === "number" &&
    x.pageSize > 0 &&
    (x.extra === undefined || (typeof x.extra === "object" && x.extra !== null))
  )
}

/** The saved views, ignoring anything in storage that is not a view. */
export function readTableViews(list: string, userId: string): TableView[] {
  try {
    const raw = localStorage.getItem(viewsStorageKey(list, userId))
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter(isView).slice(0, MAX_VIEWS) : []
  } catch {
    return []
  }
}

export function writeTableViews(list: string, userId: string, views: TableView[]) {
  try {
    localStorage.setItem(viewsStorageKey(list, userId), JSON.stringify(views))
  } catch {
    // Views are a convenience: blocked storage only means they are not kept
  }
}

/** Empty searches and empty selections are not part of a view. */
function cleanFilters(filters: ColumnFiltersState): ColumnFiltersState {
  return filters.filter((f) => !(f.value === undefined || f.value === "" || (Array.isArray(f.value) && f.value.length === 0)))
}

/**
 * Adds a view, or replaces the one with the same name (any case); the newest
 * comes first and the list keeps at most MAX_VIEWS.
 */
export function saveView(views: TableView[], name: string, state: TableViewState, id: string): TableView[] {
  const clean = name.trim()
  if (!clean) return views
  const view: TableView = { id, name: clean, sorting: state.sorting, columnFilters: cleanFilters(state.columnFilters), pageSize: state.pageSize, ...(state.extra ? { extra: state.extra } : {}) }
  return [view, ...views.filter((v) => v.name.toLocaleLowerCase() !== clean.toLocaleLowerCase())].slice(0, MAX_VIEWS)
}

export function removeView(views: TableView[], id: string): TableView[] {
  return views.filter((v) => v.id !== id)
}

const canonical = (s: TableViewState) =>
  JSON.stringify({
    sorting: s.sorting.map((x) => [x.id, x.desc]),
    filters: cleanFilters(s.columnFilters)
      .map((f) => [f.id, Array.isArray(f.value) ? [...(f.value as unknown[])].map(String).sort() : f.value])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    pageSize: s.pageSize,
    extra: s.extra ?? {},
  })

/** True when the list currently shows exactly this view (to tick it in the menu). */
export function isCurrentView(view: TableViewState, state: TableViewState) {
  return canonical(view) === canonical(state)
}
