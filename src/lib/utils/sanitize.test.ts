import { describe, it, expect } from "vitest"
import {
  sanitizeHtml,
  isValidCssColor,
  sanitizeCssIdentifier,
  ALLOWED_TAGS,
  ALLOWED_ATTR,
} from "./sanitize"

describe("sanitizeHtml", () => {
  it("removes executable <script> tags and payloads", () => {
    const malicious = "<div>Hello <script>alert('xss')</script>World</div>"
    const cleaned = sanitizeHtml(malicious)
    expect(cleaned).not.toContain("<script>")
    expect(cleaned).not.toContain("alert('xss')")
    expect(cleaned).toContain("Hello")
    expect(cleaned).toContain("World")
  })

  it("removes inline javascript event handlers", () => {
    const malicious = '<button onclick="stealCookies()">Click me</button>'
    const cleaned = sanitizeHtml(malicious)
    expect(cleaned).not.toContain("onclick")
    expect(cleaned).not.toContain("stealCookies")
  })

  it("removes javascript: pseudo-protocols from links", () => {
    const malicious = '<a href="javascript:alert(1)">Click for bonus</a>'
    const cleaned = sanitizeHtml(malicious)
    expect(cleaned).not.toContain("javascript:")
  })

  it("preserves safe formatting tags and safe attributes", () => {
    const safeHtml =
      '<p>Welcome to <strong>Nexora</strong>. Check our <a href="https://example.com" title="Docs">documentation</a>.</p>'
    const cleaned = sanitizeHtml(safeHtml)
    expect(cleaned).toContain("<strong>Nexora</strong>")
    expect(cleaned).toContain('href="https://example.com"')
    expect(cleaned).toContain('title="Docs"')
  })

  it("strips disallowed tags like <iframe>, <object>, and <style>", () => {
    const malicious =
      '<p>Safe text</p><iframe src="https://evil.com"></iframe><style>body{display:none}</style>'
    const cleaned = sanitizeHtml(malicious)
    expect(cleaned).not.toContain("<iframe")
    expect(cleaned).not.toContain("<style")
    expect(cleaned).toContain("<p>Safe text</p>")
  })

  it("handles empty or non-string inputs gracefully", () => {
    expect(sanitizeHtml("")).toBe("")
    expect(sanitizeHtml(null as unknown as string)).toBe("")
    expect(sanitizeHtml(undefined as unknown as string)).toBe("")
  })

  it("supports custom allowedTags and allowedAttr options", () => {
    const html = "<p><em>Text</em><span class='highlight'>Span</span></p>"
    const cleaned = sanitizeHtml(html, {
      allowedTags: ["em"],
      allowedAttr: [],
    })
    expect(cleaned).toContain("<em>Text</em>")
    expect(cleaned).not.toContain("<p>")
    expect(cleaned).not.toContain("<span")
  })

  it("sanitizes correctly during SSR when window is undefined", () => {
    const originalWindow = global.window
    try {
      // @ts-expect-error simulating SSR
      delete global.window
      const malicious = "<div>Safe <script>alert(1)</script><a href='javascript:alert(2)' onclick='bad()'>click</a></div>"
      const cleaned = sanitizeHtml(malicious)
      expect(cleaned).not.toContain("<script>")
      expect(cleaned).not.toContain("onclick")
      expect(cleaned).not.toContain("javascript:")
      expect(cleaned).toContain("Safe")
    } finally {
      global.window = originalWindow
    }
  })
})

describe("isValidCssColor", () => {
  it("validates standard hex colors", () => {
    expect(isValidCssColor("#fff")).toBe(true)
    expect(isValidCssColor("#ffffff")).toBe(true)
    expect(isValidCssColor("#12345678")).toBe(true)
    expect(isValidCssColor("#aBcDeF")).toBe(true)
  })

  it("validates hsl and hsla colors", () => {
    expect(isValidCssColor("hsl(210, 100%, 50%)")).toBe(true)
    expect(isValidCssColor("hsla(210, 100%, 50%, 0.8)")).toBe(true)
    expect(isValidCssColor("hsl(210deg, 100%, 50%)")).toBe(true)
  })

  it("validates rgb and rgba colors", () => {
    expect(isValidCssColor("rgb(255, 0, 128)")).toBe(true)
    expect(isValidCssColor("rgba(255, 0, 128, 0.5)")).toBe(true)
  })

  it("validates safe CSS variables", () => {
    expect(isValidCssColor("var(--chart-1)")).toBe(true)
    expect(isValidCssColor("var(--primary)")).toBe(true)
    expect(isValidCssColor("hsl(var(--chart-2))")).toBe(true)
  })

  it("validates standard color names", () => {
    expect(isValidCssColor("red")).toBe(true)
    expect(isValidCssColor("transparent")).toBe(true)
    expect(isValidCssColor("currentColor")).toBe(true)
  })

  it("rejects malicious injection attempts and invalid characters", () => {
    expect(isValidCssColor("red; } </style><script>alert(1)</script>")).toBe(false)
    expect(isValidCssColor("blue;")).toBe(false)
    expect(isValidCssColor("url(javascript:alert(1))")).toBe(false)
    expect(isValidCssColor("expression(alert(1))")).toBe(false)
    expect(isValidCssColor("#123; color: red")).toBe(false)
    expect(isValidCssColor("")).toBe(false)
    expect(isValidCssColor(null as unknown as string)).toBe(false)
  })
})

describe("sanitizeCssIdentifier", () => {
  it("preserves alphanumeric identifiers with hyphens and underscores", () => {
    expect(sanitizeCssIdentifier("chart-desktop_123")).toBe("chart-desktop_123")
  })

  it("strips selector breakout characters and HTML tags", () => {
    expect(sanitizeCssIdentifier("chart-1] { color: red }")).toBe("chart-1colorred")
    expect(sanitizeCssIdentifier("<script>alert(1)</script>")).toBe("scriptalert1script")
  })

  it("handles empty or non-string inputs", () => {
    expect(sanitizeCssIdentifier("")).toBe("")
    expect(sanitizeCssIdentifier(null as unknown as string)).toBe("")
  })
})

describe("ALLOWED_TAGS and ALLOWED_ATTR", () => {
  it("exports strictly allowed tags and attributes", () => {
    expect(ALLOWED_TAGS).toContain("b")
    expect(ALLOWED_ATTR).toContain("href")
  })
})
