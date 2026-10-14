#!/usr/bin/env node
/**
 * Renders the Arabic social carousel to one PNG per slide.
 *
 *   node marketing/social/render.mjs            → png/nexora-ar-01.png … (1080×1350)
 *   node marketing/social/render.mjs --scale 2  → same files at 2160×2700
 *
 * Needs network access for the Google Fonts (IBM Plex Sans Arabic, Inter).
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { chromium } from "@playwright/test"

const here = path.dirname(fileURLToPath(import.meta.url))
const source = path.join(here, "nexora-carousel-ar.html")
const outDir = path.join(here, "png")
const scaleArg = process.argv.indexOf("--scale")
const scale = scaleArg > -1 ? Number(process.argv[scaleArg + 1]) || 1 : 1

fs.mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1400 }, deviceScaleFactor: scale })
  await page.goto(pathToFileURL(source).href, { waitUntil: "networkidle" })
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all([...document.images].map((img) => img.decode().catch(() => {})))
  })
  const missing = await page.evaluate(() =>
    ["IBM Plex Sans Arabic", "Inter", "Roboto Mono"].filter((f) => !document.fonts.check(`700 32px "${f}"`))
  )
  if (missing.length) throw new Error(`Fonts not loaded: ${missing.join(", ")}`)

  const slides = await page.locator(".slide").all()
  for (const slide of slides) {
    const id = await slide.getAttribute("data-slide")
    const file = path.join(outDir, `nexora-ar-${id}.png`)
    await slide.screenshot({ path: file })
    console.log(path.relative(process.cwd(), file))
  }
} finally {
  await browser.close()
}
