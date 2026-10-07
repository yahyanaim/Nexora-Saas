/**
 * Shrinks a receipt photo to a small JPEG kept with the expense (Phase 6h.3).
 * Until the server stores files, only this preview travels with the expense,
 * so a 12-megapixel phone photo becomes about 50–100 KB.
 */
export async function receiptPreview(file: File, maxSide = 900, quality = 0.7): Promise<string | undefined> {
  if (!file.type.startsWith("image/") || typeof document === "undefined") return undefined
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = reject
      el.src = url
    })
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL("image/jpeg", quality)
  } catch {
    return undefined
  } finally {
    URL.revokeObjectURL(url)
  }
}
