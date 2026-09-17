import DOMPurify from "dompurify"

/**
 * Strict allowed HTML tags for user-generated content (invoices, project notes, file previews).
 */
export const ALLOWED_TAGS: string[] = [
  "b",
  "i",
  "em",
  "strong",
  "a",
  "p",
  "br",
  "ul",
  "ol",
  "li",
  "code",
  "pre",
  "span",
  "blockquote",
  "hr",
]

/**
 * Strict allowed HTML attributes for user-generated content.
 */
export const ALLOWED_ATTR: string[] = [
  "href",
  "title",
  "target",
  "rel",
  "class",
]

/**
 * Regex validating safe CSS color values:
 * - Hex colors: #fff, #123456, #12345678
 * - RGB/RGBA: rgb(...), rgba(...)
 * - HSL/HSLA: hsl(...), hsla(...)
 * - CSS Variables: var(--...), hsl(var(--...))
 * - Named standard colors: red, blue, currentColor, transparent
 *
 * Explicitly rejects control characters, semicolons, brackets, braces, quotes,
 * and style breakouts.
 */
export const SAFE_COLOR_REGEX =
  /^(#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|rgba?\(\s*[\d.]+\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*(?:,\s*[\d.]+%?\s*)?\)|hsla?\(\s*[\d.]+(?:deg|rad|turn)?\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*(?:,\s*[\d.]+%?\s*)?\)|var\(--[a-zA-Z0-9_-]+\)|hsl\(var\(--[a-zA-Z0-9_-]+\)\)|[a-zA-Z]+)$/

/**
 * Validates if a given string is a safe CSS color representation.
 */
export function isValidCssColor(color: string): boolean {
  if (!color || typeof color !== "string") return false
  const trimmed = color.trim()
  if (/[;<>{}"'`\\]/.test(trimmed)) return false
  return SAFE_COLOR_REGEX.test(trimmed)
}

/**
 * Strips unsafe characters from CSS identifiers (such as chart IDs or data keys)
 * to prevent selector breakout.
 */
export function sanitizeCssIdentifier(identifier: string): string {
  if (!identifier || typeof identifier !== "string") return ""
  return identifier.replace(/[^a-zA-Z0-9_-]/g, "")
}

export interface SanitizeOptions {
  allowedTags?: string[]
  allowedAttr?: string[]
}

/**
 * Sanitizes user-provided HTML content to protect against Cross-Site Scripting (XSS).
 * Uses DOMPurify with strict whitelist tags and attributes.
 */
export function sanitizeHtml(dirty: string, options?: SanitizeOptions): string {
  if (!dirty || typeof dirty !== "string") return ""

  if (typeof window !== "undefined") {
    const purifier =
      typeof DOMPurify.sanitize === "function"
        ? DOMPurify
        : (DOMPurify as unknown as (win: Window) => typeof DOMPurify)(window)

    return purifier.sanitize(dirty, {
      ALLOWED_TAGS: options?.allowedTags ?? ALLOWED_TAGS,
      ALLOWED_ATTR: options?.allowedAttr ?? ALLOWED_ATTR,
    })
  }

  // Server-side fallback: strip script tags and event handlers during SSR if invoked outside browser
  return dirty
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, "")
    .replace(/javascript\s*:/gi, "")
}

export default sanitizeHtml
