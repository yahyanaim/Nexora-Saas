import { toast } from "sonner"

export interface ExportColumn<T = Record<string, unknown>> {
  key: keyof T | string
  label: string
}

/**
 * Formats a single value safely for CSV export.
 * Handles quotes, commas, newlines, objects, and dates.
 */
function formatCsvValue(val: unknown): string {
  if (val === null || val === undefined) {
    return '""'
  }

  if (typeof val === "object") {
    if (val instanceof Date) {
      return `"${val.toISOString()}"`
    }
    // For nested objects (e.g. { name: "..." }), try reading name or title or stringify
    const obj = val as Record<string, unknown>
    if (obj.name) return `"${String(obj.name).replace(/"/g, '""')}"`
    if (obj.title) return `"${String(obj.title).replace(/"/g, '""')}"`
    if (obj.email) return `"${String(obj.email).replace(/"/g, '""')}"`
    return `"${JSON.stringify(val).replace(/"/g, '""')}"`
  }

  const str = String(val)
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`
  }

  return `"${str}"`
}

/**
 * Exports an array of records to an Excel-friendly CSV file with UTF-8 BOM.
 */
export function exportToCsv<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns?: ExportColumn<T>[]
): boolean {
  if (typeof window === "undefined") return false

  if (!data || data.length === 0) {
    toast.error("No data available to export")
    return false
  }

  try {
    // Determine headers
    const cols: ExportColumn<T>[] =
      columns && columns.length > 0
        ? columns
        : Object.keys(data[0] || {}).map((k) => ({ key: k, label: k }))

    const headerRow = cols.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(",")

    const rows = data.map((item) => {
      return cols
        .map((c) => {
          const val = (item as Record<string, unknown>)[c.key as string]
          return formatCsvValue(val)
        })
        .join(",")
    })

    // UTF-8 BOM (\uFEFF) ensures Excel properly renders non-ASCII characters (Arabic, Chinese, German, etc.)
    const csvContent = "\uFEFF" + [headerRow, ...rows].join("\r\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)

    const finalFilename = filename.endsWith(".csv") ? filename : `${filename}.csv`
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", finalFilename)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success(`Exported ${data.length} records to ${finalFilename}`)
    return true
  } catch (err) {
    console.error("CSV Export error:", err)
    toast.error("Failed to generate CSV export")
    return false
  }
}

/**
 * Exports an array of records to a formatted JSON file.
 */
export function exportToJson<T>(data: T[], filename: string): boolean {
  if (typeof window === "undefined") return false

  if (!data || data.length === 0) {
    toast.error("No data available to export")
    return false
  }

  try {
    const jsonContent = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" })
    const url = URL.createObjectURL(blob)

    const finalFilename = filename.endsWith(".json") ? filename : `${filename}.json`
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", finalFilename)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success(`Exported ${data.length} records to ${finalFilename}`)
    return true
  } catch (err) {
    console.error("JSON Export error:", err)
    toast.error("Failed to generate JSON export")
    return false
  }
}
