#!/usr/bin/env node
/**
 * Captures the real app for the teaser (nexora-teaser.html): each screen 1600 px
 * wide at ×2, filled and with its content hidden, and the boxes the teaser
 * reveals, clicks or zooms on. Writes assets/*.webp and assets/shots.json.
 *
 *   NEXT_PUBLIC_DEMO_MODE=true npm run dev     # in another terminal
 *   node marketing/video/capture.mjs
 *
 * BASE_URL changes the app address (default http://localhost:3000).
 */
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { chromium } from "@playwright/test"

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "")
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "assets")
const VW = 1600
const DPR = 2
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nexora-teaser-"))
fs.mkdirSync(OUT, { recursive: true })

const shots = { width: VW, dpr: DPR, images: {}, boxes: {} }
const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: VW, height: 1000 }, deviceScaleFactor: DPR })
await context.addInitScript(() => {
  try {
    localStorage.setItem("theme", "light")
  } catch {}
})
const page = await context.newPage()

// The demo company administrator
await page.goto(`${BASE}/ar`, { waitUntil: "networkidle", timeout: 180_000 })
await page.getByText("Instant Demo Preview").click()
await page.waitForURL(/dashboard/, { timeout: 180_000 })

async function open(route, height) {
  await page.setViewportSize({ width: VW, height })
  await page.goto(`${BASE}/ar/dashboard/${route}`, { waitUntil: "networkidle", timeout: 180_000 })
  await page.waitForTimeout(1500)
  // the platform notices at the top are closed once
  for (let i = 0; i < 4; i++) {
    const close = await page.locator("[role=status] button").all()
    if (!close.length) break
    await close[close.length - 1].click().catch(() => {})
    await page.waitForTimeout(300)
  }
  await page.addStyleTag({ content: "[data-teaser-hide]{visibility:hidden!important} *{caret-color:transparent!important}" })
  await page.mouse.move(VW - 2, 2)
}

async function shot(name) {
  const png = path.join(tmp, `${name}.png`)
  await page.screenshot({ path: png })
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", png, "-c:v", "libwebp", "-quality", "88", path.join(OUT, `${name}.webp`)])
  const { width, height } = page.viewportSize()
  shots.images[name] = { w: width, h: height }
  console.log("shot", name)
}

// Boxes in CSS pixels; `card` climbs to the bordered card around an element
const boxes = (selector, { card = false } = {}) =>
  page.evaluate(
    ({ selector, card }) => {
      const isCard = (el) => {
        const cs = getComputedStyle(el)
        return parseFloat(cs.borderTopWidth) >= 1 && parseFloat(cs.borderTopLeftRadius) >= 12
      }
      return [...document.querySelectorAll(selector)].map((el) => {
        let e = el
        if (card) while (e.parentElement && !isCard(e)) e = e.parentElement
        const r = e.getBoundingClientRect()
        return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
      })
    },
    { selector, card }
  )
const box = async (locator) => {
  const b = await locator.boundingBox()
  return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }
}
// the outermost bordered cards of the page (KPI tiles, chart cards), marked data-teaser-card
const cardsOf = () =>
  page.evaluate(() => {
    const isCard = (el) => {
      const cs = getComputedStyle(el)
      return parseFloat(cs.borderTopWidth) >= 1 && parseFloat(cs.borderTopLeftRadius) >= 12
    }
    const found = [...document.querySelectorAll("main div")].filter((el) => {
      const r = el.getBoundingClientRect()
      return isCard(el) && r.width > 300 && r.height > 70 && r.width < 1400
    })
    return found
      .filter((el) => !found.some((o) => o !== el && o.contains(el)))
      .map((el) => {
        el.setAttribute("data-teaser-card", "")
        const r = el.getBoundingClientRect()
        const chart = el.querySelector(".recharts-wrapper")
        const c = chart?.getBoundingClientRect()
        return {
          x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
          chart: c ? { x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height) } : null,
          kpi: r.height < 260,
        }
      })
  })
const hide = (selector) => page.evaluate((s) => document.querySelectorAll(s).forEach((e) => e.setAttribute("data-teaser-hide", "")), selector)
const showAll = () => page.evaluate(() => document.querySelectorAll("[data-teaser-hide]").forEach((e) => e.removeAttribute("data-teaser-hide")))
const toastGone = () => page.waitForFunction(() => !document.querySelector("[data-sonner-toast]"), null, { timeout: 15_000 }).catch(() => {})

/* 1. Client invoices: the opening shot and the "ready to bill" card */
await open("client-invoices", 1000)
await shot("invoices")
const ready = page.getByRole("button", { name: /إنشاء فاتورة/ }).first()
await ready.evaluate((el) => el.setAttribute("data-teaser-ready", ""))
shots.boxes.invoices = { ready: await box(ready), readyCard: (await boxes("[data-teaser-ready]", { card: true }))[0], cards: await cardsOf() }

/* 2. "Create invoice": the approved hours and expenses ticked one by one */
await ready.click()
await page.waitForTimeout(1200)
const dialog = page.locator("[role=dialog]").last()
// each line is a <label> row: a click on the row's text ticks it (a click on the
// square itself does not toggle, see the create-invoice sheet)
const rowsOf = dialog.locator("label:has([role=checkbox])")
const n = await rowsOf.count()
const tick = (i) => rowsOf.nth(i).locator("span").last().click()
for (let i = 0; i < n; i++) if ((await rowsOf.nth(i).getByRole("checkbox").getAttribute("aria-checked")) === "true") await tick(i)
await page.mouse.move(VW - 2, 2)
await page.waitForTimeout(400)
await shot("sheet-0")
const create = dialog.getByRole("button", { name: /إنشاء مسودة/ })
shots.boxes.sheet = { dialog: await box(dialog), checks: [], rows: [], create: null }
for (let i = 0; i < n; i++) {
  shots.boxes.sheet.checks.push(await box(rowsOf.nth(i).getByRole("checkbox")))
  shots.boxes.sheet.rows.push(await box(rowsOf.nth(i).locator("span").last()))
  await tick(i)
  await page.mouse.move(VW - 2, 2)
  await page.waitForTimeout(350)
  await shot(`sheet-${i + 1}`)
}
shots.boxes.sheet.create = await box(create)

/* 3. The draft, its sections filling in */
await create.click()
await toastGone()
await page.waitForTimeout(400)
const draft = page.locator("[role=dialog]").last()
const sectionsOf = () =>
  page.evaluate(() => {
    const d = [...document.querySelectorAll("[role=dialog]")].pop()
    const scroller = [...d.querySelectorAll("*")].find((e) => e.scrollHeight > 0 && /overflow-y-auto/.test(e.className))
    return [...(scroller ?? d).children].map((c) => {
      c.setAttribute("data-teaser-section", "")
      const r = c.getBoundingClientRect()
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), text: c.innerText.slice(0, 40) }
    })
  })
await shot("draft")
shots.boxes.draft = { dialog: await box(draft), sections: await sectionsOf(), issue: await box(draft.getByRole("button", { name: /^إصدار$/ })) }
await hide("[data-teaser-section]")
await shot("draft-empty")
await showAll()

/* 4. Issued: number, toast, e-invoice (DGI) panel */
await draft.getByRole("button", { name: /^إصدار$/ }).click()
await page.waitForSelector("[data-sonner-toast]")
await page.waitForTimeout(900)
await page.mouse.move(VW - 2, 2)
await shot("issued-toast")
const issued = page.locator("[role=dialog]").last()
shots.boxes.issued = {
  dialog: await box(issued),
  toast: await box(page.locator("[data-sonner-toast]").first()),
  sections: await sectionsOf(),
  sendDgi: await box(issued.getByRole("button", { name: /DGI/ }).last()),
}
await hide("[data-sonner-toaster], [data-sonner-toast]")
await shot("issued")
await page.evaluate(() =>
  document.querySelectorAll("[data-teaser-section]").forEach((s) => {
    if (/DGI|دفعة/.test(s.innerText)) s.setAttribute("data-teaser-hide", "")
  })
)
await shot("issued-empty")
await showAll()

/* 5. Timeline: every project on one schedule */
await open("timeline", 1240)
const rows = "section ul > li"
const bars = "section ul > li div.relative > a"
const marks = "section ul > li div.relative > span.rotate-45"
shots.boxes.timeline = {
  rows: await boxes(rows),
  bars: await boxes(bars),
  marks: await boxes(marks),
  today: (await boxes("section span.border-dashed"))[0] ?? null,
  section: (await boxes("section.rounded-3xl"))[1] ?? (await boxes("section"))[0],
}
await shot("timeline")
await hide(`${bars}, ${marks}, section span.border-dashed`)
await shot("timeline-rows")
await hide(rows)
await shot("timeline-empty")
await showAll()

/* 6. Analytics: KPI tiles and charts */
await open("overview", 2740)
const cards = await cardsOf()
shots.boxes.overview = { cards, header: (await boxes("main section"))[0] }
await shot("overview")
await hide("[data-teaser-card] > *")
await shot("overview-empty")
await showAll()

fs.writeFileSync(path.join(OUT, "shots.json"), JSON.stringify(shots, null, 1))
fs.rmSync(tmp, { recursive: true, force: true })
await browser.close()
console.log("wrote", path.relative(process.cwd(), OUT))
