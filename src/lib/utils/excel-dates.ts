/** An Excel day serial (e.g. 46300) as yyyy-mm-dd; null when it isn't one. */
export function excelSerialToIso(value: string): string | null {
  if (!/^\d{5}(\.\d+)?$/.test(value)) return null
  const n = Math.floor(Number(value))
  if (n < 20_000 || n > 80_000) return null
  return new Date(Date.UTC(1899, 11, 30) + n * 86_400_000).toISOString().slice(0, 10)
}
