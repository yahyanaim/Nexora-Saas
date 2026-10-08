#!/usr/bin/env node
/**
 * A11Y-03 to A11Y-05: opens every console page as a platform owner and runs
 * axe on it. Fails on any critical or serious finding, on a wrong heading
 * order, on a page without its "Skip to content" link, or on an unnamed
 * button (icon-only buttons included).
 *
 * Needs a running demo build (NEXT_PUBLIC_DEMO_MODE=true):
 *   BASE_URL=http://localhost:3200 node scripts/a11y-console.mjs
 *   node scripts/a11y-console.mjs --seed-violation   # must fail: proves the check blocks
 * CHROMIUM_PATH points to a local Chromium when Playwright's own is not installed.
 */
import fs from "node:fs"
import { createRequire } from "node:module"
import { chromium } from "@playwright/test"

const require = createRequire(import.meta.url)
const AXE = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8")
const BASE = (process.env.BASE_URL ?? "http://localhost:3200").replace(/\/$/, "")
const SEED = process.argv.includes("--seed-violation")
const BLOCKING = new Set(["critical", "serious"])
const ALWAYS = new Set(["heading-order", "button-name", "page-has-heading-one"])

// the console pages, read from the same list the guard uses
const listed = [...fs.readFileSync("src/lib/permissions/platform.ts", "utf8").matchAll(/"(\/dashboard\/[a-z-]+)"/g)].map((m) => m[1])
const pages = [...new Set([...listed, "/dashboard/platform/cus_atlas"])]

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
await page.goto(`${BASE}/en/auth`, { timeout: 120_000 })
await page.getByText("Platform console demo (Nexora team)").click()
await page.waitForURL(/\/dashboard\/platform/, { timeout: 60_000 })

const failures = []
for (const path of pages) {
  await page.goto(`${BASE}/en${path}`, { timeout: 120_000 })
  await page.locator("main#main-content").waitFor({ timeout: 30_000 })
  await page.waitForTimeout(1500)
  if (SEED) await page.evaluate(() => document.querySelector("main")?.appendChild(document.createElement("button")))
  const skip = await page.locator('a[href="#main-content"]').count()
  await page.addScriptTag({ content: AXE })
  const violations = await page.evaluate(async () => {
    const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] }, resultTypes: ["violations"] })
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, count: v.nodes.length, html: v.nodes[0]?.html.slice(0, 140) }))
  })
  const blocking = violations.filter((v) => BLOCKING.has(v.impact) || ALWAYS.has(v.id))
  if (!skip) blocking.push({ id: "skip-link-missing", impact: "serious", count: 1, html: "no a[href=#main-content]" })
  console.log(`${blocking.length ? "✗" : "✓"} ${path}${blocking.length ? `  ${blocking.map((v) => `${v.id}(${v.impact})×${v.count}`).join(", ")}` : ""}`)
  for (const v of blocking) failures.push(`${path}: ${v.id} (${v.impact}) ×${v.count} — ${v.html}`)
}
await browser.close()

if (failures.length) {
  console.error(`\n${failures.length} blocking accessibility finding(s):\n${failures.join("\n")}`)
  process.exit(1)
}
console.log(`\n${pages.length} console pages: no critical or serious finding, heading order and skip link OK.`)
