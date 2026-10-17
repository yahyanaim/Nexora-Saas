#!/usr/bin/env node
/**
 * Renders nexora-teaser.html to an MP4, one frame at a time.
 *
 *   node marketing/video/render.mjs              → marketing/video/nexora-teaser.mp4 (1920×1080, 30 fps)
 *   node marketing/video/render.mjs --fps 60     → smoother camera moves, twice the frames
 *   node marketing/video/render.mjs --from 8 --to 12 --out clip.mp4   → part of it
 *
 * Needs ffmpeg with libx264, the captures in assets/ (capture.mjs) and network
 * access for the Google Fonts.
 */
import fs from "node:fs"
import http from "node:http"
import path from "node:path"
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import { chromium } from "@playwright/test"

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.dirname(here) // marketing/, so the page can reach ../social/assets
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : fallback
}
const fps = Number(arg("fps", 30))
const out = path.resolve(arg("out", path.join(here, "nexora-teaser.mp4")))

const TYPES = { ".html": "text/html", ".json": "application/json", ".webp": "image/webp", ".png": "image/png", ".woff2": "font/woff2" }
const server = http
  .createServer((req, res) => {
    const file = path.join(root, decodeURIComponent(req.url.split("?")[0]))
    if (!file.startsWith(root)) return res.writeHead(403).end()
    fs.readFile(file, (err, data) => {
      if (err) return res.writeHead(404).end()
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream" }).end(data)
    })
  })
  .listen(0)
const port = server.address().port

const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  page.on("pageerror", (e) => console.error("page error:", e.message))
  await page.goto(`http://localhost:${port}/video/nexora-teaser.html`, { waitUntil: "networkidle" })
  await page.waitForFunction(() => window.ready === true)
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all([...document.images].map((img) => img.decode().catch(() => {})))
  })
  const duration = await page.evaluate(() => window.DURATION)
  const from = Number(arg("from", 0))
  const to = Math.min(duration, Number(arg("to", duration)))
  const frames = Math.round((to - from) * fps)

  const ffmpeg = spawn("ffmpeg", ["-v", "error", "-y", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
    "-c:v", "libx264", "-preset", "slow", "-crf", "21", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out], { stdio: ["pipe", "inherit", "inherit"] })
  const done = new Promise((resolve, reject) => ffmpeg.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`)))))

  const started = Date.now()
  for (let i = 0; i < frames; i++) {
    await page.evaluate((t) => window.render(t), from + i / fps)
    const jpeg = await page.screenshot({ type: "jpeg", quality: 95 })
    if (!ffmpeg.stdin.write(jpeg)) await new Promise((r) => ffmpeg.stdin.once("drain", r))
    if (i % fps === 0) process.stdout.write(`\r${(from + i / fps).toFixed(0)}s / ${to.toFixed(0)}s`)
  }
  ffmpeg.stdin.end()
  await done
  console.log(`\n${path.relative(process.cwd(), out)}: ${frames} frames in ${((Date.now() - started) / 1000).toFixed(0)} s`)
} finally {
  await browser.close()
  server.close()
}
