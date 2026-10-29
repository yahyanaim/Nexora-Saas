/**
 * Reads the first sheet of an Excel .xlsx file into rows of text (CRM step 7),
 * with the browser's own unzip (DecompressionStream), so no spreadsheet
 * library ships to the page. Old .xls files are not read: save them as .xlsx or .csv.
 */

interface ZipEntry {
  name: string
  method: number
  compressedSize: number
  offset: number
}

const decoder = new TextDecoder()

function zipEntries(bytes: Uint8Array): ZipEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  // end of central directory: last record with the 0x06054b50 signature
  let eocd = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error("This file is not a valid Excel file")
  const count = view.getUint16(eocd + 10, true)
  let p = view.getUint32(eocd + 16, true)
  const entries: ZipEntry[] = []
  for (let n = 0; n < count; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) throw new Error("This file is not a valid Excel file")
    const method = view.getUint16(p + 10, true)
    const compressedSize = view.getUint32(p + 20, true)
    const nameLength = view.getUint16(p + 28, true)
    const extraLength = view.getUint16(p + 30, true)
    const commentLength = view.getUint16(p + 32, true)
    const offset = view.getUint32(p + 42, true)
    entries.push({ name: decoder.decode(bytes.subarray(p + 46, p + 46 + nameLength)), method, compressedSize, offset })
    p += 46 + nameLength + extraLength + commentLength
  }
  return entries
}

async function readEntry(bytes: Uint8Array, entry: ZipEntry): Promise<string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const start = entry.offset + 30 + view.getUint16(entry.offset + 26, true) + view.getUint16(entry.offset + 28, true)
  const data = bytes.slice(start, start + entry.compressedSize)
  if (entry.method === 0) return decoder.decode(data)
  if (entry.method !== 8) throw new Error("This file is not a valid Excel file")
  const stream = new Response(data).body!.pipeThrough(new DecompressionStream("deflate-raw"))
  return new Response(stream).text()
}

/** "C12" → 2 (zero-based column). */
function columnIndex(ref: string) {
  let n = 0
  for (const ch of ref.replace(/\d+$/, "")) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

const text = (el: Element | null | undefined) => Array.from(el?.getElementsByTagName("t") ?? []).map((t) => t.textContent ?? "").join("")

/** The first sheet's cells as text; numbers stay as Excel writes them (dates are day serials). */
export async function readXlsx(buffer: ArrayBuffer): Promise<string[][]> {
  const bytes = new Uint8Array(buffer)
  const entries = zipEntries(bytes)
  const find = (name: string) => entries.find((e) => e.name === name)
  const parse = async (name: string) => {
    const entry = find(name)
    return entry ? new DOMParser().parseFromString(await readEntry(bytes, entry), "application/xml") : null
  }

  // the first sheet in the workbook's order
  let sheetPath = "xl/worksheets/sheet1.xml"
  const workbook = await parse("xl/workbook.xml")
  const rels = await parse("xl/_rels/workbook.xml.rels")
  const firstSheet = workbook?.getElementsByTagName("sheet")[0]
  const relId = firstSheet?.getAttribute("r:id") ?? firstSheet?.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id")
  const target = relId ? Array.from(rels?.getElementsByTagName("Relationship") ?? []).find((r) => r.getAttribute("Id") === relId)?.getAttribute("Target") : null
  if (target) sheetPath = target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`
  if (!find(sheetPath)) sheetPath = entries.find((e) => /^xl\/worksheets\/[^/]+\.xml$/.test(e.name))?.name ?? sheetPath

  const sharedDoc = await parse("xl/sharedStrings.xml")
  const shared = Array.from(sharedDoc?.getElementsByTagName("si") ?? []).map((si) => text(si))
  const sheet = await parse(sheetPath)
  if (!sheet) throw new Error("This file is not a valid Excel file")

  const rows: string[][] = []
  for (const row of Array.from(sheet.getElementsByTagName("row"))) {
    const out: string[] = []
    Array.from(row.getElementsByTagName("c")).forEach((c, i) => {
      const ref = c.getAttribute("r")
      const col = ref ? columnIndex(ref) : i
      const type = c.getAttribute("t")
      const v = c.getElementsByTagName("v")[0]?.textContent ?? ""
      const value = type === "s" ? (shared[Number(v)] ?? "") : type === "inlineStr" ? text(c.getElementsByTagName("is")[0]) : type === "b" ? (v === "1" ? "TRUE" : "FALSE") : v
      while (out.length < col) out.push("")
      out[col] = value.trim()
    })
    rows.push(out)
  }
  return rows.filter((r) => r.some((c) => c !== ""))
}

export { excelSerialToIso } from "./excel-dates"
