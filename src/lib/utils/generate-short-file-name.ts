export function generateShortFileName(originalName: string): string {
  const ext = originalName.split(".").pop() || ""

  const randomId = Math.random().toString(36).substring(2, 8).toUpperCase()

  const prefix =
    originalName
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 3)
      .toUpperCase() || "DOC"

  return `${prefix}-${randomId}${ext ? "." + ext : ""}`
}
