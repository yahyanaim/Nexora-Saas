import { ERROR_KEYS, ERROR_PATTERNS } from "./error-catalog"

/** The translation key (and values) for a business-rule message, if it is known. */
export function errorKey(message: string): { key: string; values?: Record<string, string> } | null {
  const key = ERROR_KEYS[message]
  if (key) return { key }
  for (const { pattern, key: k, names } of ERROR_PATTERNS) {
    const m = pattern.exec(message)
    if (m) return { key: k, values: Object.fromEntries(names.map((n, i) => [n, m[i + 1] ?? ""])) }
  }
  return null
}

type Translator = { (key: string, values?: Record<string, string | number>): string; has(key: string): boolean }

/**
 * What to show in a toast for a failed action: the message in the user's
 * language when it is a known rule, else the original message, else a generic
 * "something went wrong".
 */
export function translateError(err: unknown, t: Translator): string {
  if (!(err instanceof Error) || !err.message) return t("somethingWentWrong")
  const hit = errorKey(err.message)
  if (hit && t.has(hit.key)) return t(hit.key, hit.values)
  return err.message
}
