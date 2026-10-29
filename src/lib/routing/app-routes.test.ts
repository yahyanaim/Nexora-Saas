import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { APP_ROUTES, isKnownRoute } from "./app-routes"

const ROOT = path.join(process.cwd(), "src/app/[locale]")

function pages(dir: string, prefix = ""): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return entry.name === "[...rest]" ? [] : pages(path.join(dir, entry.name), `${prefix}/${entry.name}`)
    return entry.name === "page.tsx" ? [prefix || "/"] : []
  })
}

describe("app routes (real 404 for unknown addresses)", () => {
  it("lists exactly the pages under src/app/[locale]", () => {
    expect([...APP_ROUTES].sort()).toEqual(pages(ROOT).sort())
  })

  it("knows pages, page ids and the home page, and nothing else", () => {
    expect(isKnownRoute("/")).toBe(true)
    expect(isKnownRoute("")).toBe(true)
    expect(isKnownRoute("/dashboard/clients")).toBe(true)
    expect(isKnownRoute("/dashboard/clients/cli_medica")).toBe(true)
    expect(isKnownRoute("/dashboard/clients/")).toBe(true)
    expect(isKnownRoute("/dashboard/not-a-page")).toBe(false)
    expect(isKnownRoute("/dashboard/clients/a/b")).toBe(false)
    expect(isKnownRoute("/nope")).toBe(false)
  })

  it("keeps the Developer page to demo mode (decision B9)", () => {
    expect(isKnownRoute("/dashboard/developer", true)).toBe(true)
    expect(isKnownRoute("/dashboard/developer", false)).toBe(false)
    expect(isKnownRoute("/dashboard/clients", false)).toBe(true)
  })
})
