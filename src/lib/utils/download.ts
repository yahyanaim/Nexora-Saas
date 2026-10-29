/** Browser downloads. Kept out of the rule files so they stay free of browser APIs (shared with the server). */

/** Starts a download of a text file in the browser. */
export function downloadText(content: string, filename: string, type = "application/xml") {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Saves an object as a JSON file in the browser. */
export function downloadJson(data: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" }))
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
