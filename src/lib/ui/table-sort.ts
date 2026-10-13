/**
 * UX-05: sorting and pagination for the console's tables, as pure functions
 * so they are tested once and every table behaves the same way.
 */

export type SortDir = "asc" | "desc"
export type SortValue = string | number | null | undefined
export type Sorters<T> = Record<string, (row: T) => SortValue>

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" })

/** Empty values always go last, whatever the direction. */
export function compareValues(a: SortValue, b: SortValue, dir: SortDir) {
  const emptyA = a === null || a === undefined || a === ""
  const emptyB = b === null || b === undefined || b === ""
  if (emptyA || emptyB) return emptyA === emptyB ? 0 : emptyA ? 1 : -1
  const c = typeof a === "number" && typeof b === "number" ? a - b : collator.compare(String(a), String(b))
  return dir === "asc" ? c : -c
}

/** A stable sort: rows with equal values keep their original order. */
export function sortRows<T>(rows: readonly T[], by: ((row: T) => SortValue) | undefined, dir: SortDir) {
  if (!by) return [...rows]
  return rows.map((row, i) => ({ row, i, v: by(row) })).sort((x, y) => compareValues(x.v, y.v, dir) || x.i - y.i).map((x) => x.row)
}

export function pageOf<T>(rows: readonly T[], pageIndex: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const index = Math.min(Math.max(0, pageIndex), pageCount - 1)
  const start = index * pageSize
  return { rows: rows.slice(start, start + pageSize), pageIndex: index, pageCount, from: rows.length ? start + 1 : 0, to: Math.min(rows.length, start + pageSize), total: rows.length }
}
