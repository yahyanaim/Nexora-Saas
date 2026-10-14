#!/usr/bin/env node
/**
 * Renders one module video: narration (Kokoro, offline), a screen recording of
 * the demo app with a spotlight and a cursor, burned-in captions, 1920×1080 MP4.
 *
 *   NEXT_PUBLIC_DEMO_MODE=true npm run dev            # in another terminal
 *   VIDEO_VOICES=~/kokoro VIDEO_PYTHON=~/kokoro/venv/bin/python \
 *     node scripts/videos/make-video.mjs 1
 *
 * Writes videos/NN-slug.mp4 and NN-slug.srt. See scripts/videos/README.md.
 */
import fs from "node:fs"
import path from "node:path"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { chromium } from "@playwright/test"
import { MODULES } from "./modules.mjs"

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "")
const VOICES = process.env.VIDEO_VOICES
const PYTHON = process.env.VIDEO_PYTHON ?? "python3"
const OUT = path.resolve(process.env.VIDEO_OUT ?? "videos")
const FPS = 30
const GAP = 0.3 // seconds of silence after each line
const END_CARD = 1.8 // seconds

const arg = process.argv[2] ?? "1"
const mod = MODULES.find((m) => String(m.n) === arg || m.slug === arg)
if (!mod?.scenes) throw new Error(`No scenes written yet for module "${arg}"`)
if (!VOICES) throw new Error("Set VIDEO_VOICES to the folder holding kokoro-v1.0.onnx and voices-v1.0.bin")
const next = MODULES.find((m) => m.n === mod.n + 1)
const id = `${String(mod.n).padStart(2, "0")}-${mod.slug}`
const work = path.join(OUT, `.work-${id}`)
fs.rmSync(work, { recursive: true, force: true })
fs.mkdirSync(path.join(work, "frames"), { recursive: true })

// 1. Narration, one file per scene
const lines = mod.scenes.map((s, i) => ({ id: `s${i}`, text: s.say }))
fs.writeFileSync(path.join(work, "lines.json"), JSON.stringify(lines))
const spoken = JSON.parse(execFileSync(PYTHON, ["-I", fileURLToPath(new URL("tts.py", import.meta.url)), VOICES, path.join(work, "lines.json"), work], { encoding: "utf8" }).trim().split("\n").pop())
console.log("narration", spoken)

// 2. Screen recording
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
const context = await browser.newContext({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 4 / 3, reducedMotion: "no-preference" })
const page = await context.newPage()
await signIn(page, mod.login)
// Pages the video opens are compiled first, so the dev server answers at once
for (const p of [...(mod.warm ?? []), mod.path]) {
  await page.goto(`${BASE}/en${p}`, { timeout: 180_000 })
  await page.locator("main#main-content").waitFor({ timeout: 60_000 })
  await page.waitForLoadState("networkidle")
}
// Platform notices load after the shell; hidden ones stay hidden
const notice = page.getByRole("button", { name: "Hide this notice" })
await notice.first().waitFor({ timeout: 5000 }).catch(() => {})
for (let i = 0; i < 5 && (await notice.count()); i++) await notice.first().click()
await page.waitForTimeout(1500)
await page.evaluate(installOverlay)
await page.evaluate(showCard, { kind: "title", number: mod.n, name: mod.name, tagline: mod.tagline })

const cdp = await context.newCDPSession(page)
const frames = []
cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
  const file = `f${String(frames.length).padStart(5, "0")}.jpg`
  fs.writeFileSync(path.join(work, "frames", file), Buffer.from(data, "base64"))
  frames.push({ file, t: metadata.timestamp })
  cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {})
})
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1920, maxHeight: 1080 })
await page.waitForTimeout(300)

const now = () => Date.now() / 1000
const t0 = now()
const marks = []
for (const [i, scene] of mod.scenes.entries()) {
  const start = now()
  const length = spoken[`s${i}`]
  marks.push({ start: start - t0, length, text: scene.say })
  await Promise.all([scene.run?.(helpers(page, scene.say, start, length)), sleep((length + GAP) * 1000)])
}
await page.evaluate(installOverlay)
await page.evaluate(showCard, { kind: "end", number: next?.n, name: next?.name, tagline: next?.tagline })
await sleep(END_CARD * 1000)
const total = now() - t0
await cdp.send("Page.stopScreencast")
await browser.close()

// 3. Video: frames held until the next one, resampled to a constant frame rate
const list = []
const kept = frames.filter((f, i) => f.t >= t0 || frames[i + 1]?.t > t0)
kept.forEach((f, i) => {
  const from = Math.max(f.t, t0)
  const to = kept[i + 1]?.t ?? t0 + total
  list.push(`file 'frames/${f.file}'`, `duration ${Math.max(to - from, 0.001).toFixed(4)}`)
})
list.push(`file 'frames/${kept.at(-1).file}'`)
fs.writeFileSync(path.join(work, "frames.txt"), list.join("\n"))

// 4. Audio: each line placed where its scene started
const inputs = marks.flatMap((_, i) => ["-i", path.join(work, `s${i}.wav`)])
const delays = marks.map((m, i) => `[${i}]adelay=${Math.round(m.start * 1000)}:all=1[a${i}]`).join(";")
const mix = `${delays};${marks.map((_, i) => `[a${i}]`).join("")}amix=inputs=${marks.length}:normalize=0,apad,atrim=0:${total.toFixed(3)},loudnorm=I=-16:TP=-1.5[out]`
ffmpeg([...inputs, "-filter_complex", mix, "-map", "[out]", "-ar", "48000", path.join(work, "narration.wav")])

// 5. Captions: each line split into short chunks timed by their length
const cues = marks.flatMap((m) => chunk(m.text).map((c, _, all) => ({ ...c, from: m.start + m.length * c.from / all.at(-1).to, to: m.start + m.length * c.to / all.at(-1).to })))
fs.writeFileSync(path.join(work, "captions.ass"), ass(cues))
fs.mkdirSync(OUT, { recursive: true })
fs.writeFileSync(path.join(OUT, `${id}.srt`), srt(cues))

ffmpeg([
  "-f", "concat", "-safe", "0", "-i", path.join(work, "frames.txt"),
  "-i", path.join(work, "narration.wav"),
  "-vf", `fps=${FPS},scale=1920:1080:flags=lanczos,format=yuv420p,subtitles=${path.join(work, "captions.ass")}`,
  "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-c:a", "aac", "-b:a", "160k",
  "-movflags", "+faststart", "-t", total.toFixed(3), path.join(OUT, `${id}.mp4`),
])
if (!process.env.VIDEO_KEEP_WORK) fs.rmSync(work, { recursive: true, force: true })
console.log(`${path.join(OUT, `${id}.mp4`)}: ${total.toFixed(1)} s, ${frames.length} frames`)

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function ffmpeg(args) {
  execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args], { stdio: "inherit" })
}

async function signIn(page, email) {
  await page.goto(`${BASE}/en/auth`, { timeout: 180_000 })
  // The form is pre-filled once hydrated; typing earlier would be appended to it
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(1000)
  if (!email) await page.getByText("Or continue with Instant Demo Preview").click()
  else if (email === "console") await page.getByText("Platform console demo (Nexora team)").click()
  else {
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[type="password"]').fill("demo")
    await page.getByRole("button", { name: "Continue", exact: true }).click()
  }
  await page.waitForURL(/\/dashboard/, { timeout: 120_000 })
}

/** What a scene's `run` can do. */
function helpers(page, say, start, length) {
  const at = (word) => {
    const i = say.toLowerCase().indexOf(word.toLowerCase())
    if (i < 0) throw new Error(`"${word}" is not in: ${say}`)
    return start + length * (i / say.length)
  }
  return {
    wait: (ms) => sleep(ms),
    until: (word) => sleep(Math.max(0, (at(word) - Date.now() / 1000) * 1000)),
    spot: async (target) => {
      await page.evaluate(installOverlay)
      await page.evaluate((t) => window.__vid.spot(t), target)
      await sleep(250)
    },
    clearSpot: () => page.evaluate(() => window.__vid?.spot(null)),
    hideCard: () => page.evaluate(() => window.__vid?.hideCard()),
    hideCursor: async () => {
      await page.evaluate(() => window.__vid?.hideCursor())
      await page.mouse.move(0, 0)
    },
    scrollTo: async (target) => {
      await page.evaluate((t) => window.__vid.scrollTo(t), target)
      await sleep(900)
    },
    waitForHeading: (name) => page.getByRole("heading", { level: 1, name }).waitFor({ timeout: 15_000 }),
    click: async (target) => {
      await page.evaluate(installOverlay)
      const b = await page.evaluate((t) => window.__vid.rect(t), target)
      const x = b.x + b.w / 2
      const y = b.y + b.h / 2
      await page.evaluate(([x, y]) => window.__vid.cursorTo(x, y), [x, y])
      await sleep(900)
      await page.mouse.move(x, y)
      await sleep(250)
      await page.evaluate(() => window.__vid.clickFx())
      await page.mouse.click(x, y)
    },
  }
}

/** Splits a line into balanced caption chunks of at most about 52 characters, preferring punctuation. */
function chunk(text, max = 52) {
  const words = text.split(" ")
  const n = Math.ceil(text.length / max)
  const out = []
  let first = 0
  for (let k = 1; k < n; k++) {
    const ideal = (text.length * k) / n
    let best = first
    let bestScore = Infinity
    for (let i = first; i < words.length - 1; i++) {
      const score = Math.abs(words.slice(0, i + 1).join(" ").length - ideal) - (/[,:;.]$/.test(words[i]) ? 8 : 0)
      if (score < bestScore) [best, bestScore] = [i, score]
    }
    out.push(words.slice(first, best + 1).join(" "))
    first = best + 1
  }
  out.push(words.slice(first).join(" "))
  let pos = 0
  return out.map((t) => ({ text: t, from: pos, to: (pos += t.length + 1) }))
}

function stamp(s, sep) {
  const ms = Math.round(s * 1000)
  const p = (n, w = 2) => String(n).padStart(w, "0")
  const hms = `${p(Math.floor(ms / 3_600_000))}:${p(Math.floor(ms / 60_000) % 60)}:${p(Math.floor(ms / 1000) % 60)}`
  return sep === "," ? `${hms},${p(ms % 1000, 3)}` : `${hms.slice(1)}.${p(Math.floor(ms / 10) % 100)}`
}

function srt(cues) {
  return cues.map((c, i) => `${i + 1}\n${stamp(c.from, ",")} --> ${stamp(c.to, ",")}\n${c.text}\n`).join("\n")
}

function ass(cues) {
  return `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Inter,46,&H00FFFFFF,&H00FFFFFF,&H30180F0B,&H30180F0B,-1,0,0,0,100,100,0,0,3,16,0,2,160,160,54,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${cues.map((c) => `Dialogue: 0,${stamp(c.from)},${stamp(c.to)},Cap,,0,0,0,,${c.text}`).join("\n")}
`
}

/* ---- Runs in the page ---------------------------------------------------- */

/** Spotlight, cursor and title cards, drawn above the app. */
function installOverlay() {
  if (document.getElementById("vid-root")) return
  const root = document.createElement("div")
  root.id = "vid-root"
  root.innerHTML = `<style>
    #vid-root{position:fixed;inset:0;pointer-events:none;z-index:2147483647;font-family:Inter,var(--font-sans),system-ui,sans-serif}
    #vid-spot{position:absolute;left:0;top:0;border-radius:24px;opacity:0;box-shadow:0 0 0 3px #2684ff,0 0 0 9px rgba(38,132,255,.22),0 0 0 200vmax rgba(9,16,32,.34)}
    #vid-cursor{position:absolute;left:0;top:0;width:26px;height:26px;opacity:0;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35));transition:opacity .3s}
    #vid-ring{position:absolute;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:3px solid #2684ff;opacity:0}
    #vid-ring.on{animation:vidring .55s ease-out}
    @keyframes vidring{from{transform:scale(.3);opacity:1}to{transform:scale(1.6);opacity:0}}
    .vid-card{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:0 120px;color:#fff;
      background:radial-gradient(1200px 700px at 85% 15%,rgba(38,132,255,.55),transparent 60%),radial-gradient(900px 600px at 0% 100%,rgba(38,132,255,.25),transparent 60%),#07122b;transition:opacity .6s ease}
    .vid-card>*{opacity:0;transform:translateY(18px);animation:vidup .7s cubic-bezier(.2,.7,.2,1) forwards}
    .vid-card>:nth-child(2){animation-delay:.12s}.vid-card>:nth-child(3){animation-delay:.24s}.vid-card>:nth-child(4){animation-delay:.36s}
    @keyframes vidup{to{opacity:1;transform:none}}
    .vid-brand{display:flex;align-items:center;gap:14px;font-size:22px;font-weight:600;letter-spacing:.02em;color:#cfe0ff}
    .vid-brand img{width:44px;height:44px;border-radius:12px;background:#fff;padding:6px}
    .vid-pill{margin-top:56px;align-self:flex-start;padding:8px 16px;border-radius:999px;background:rgba(38,132,255,.22);border:1px solid rgba(38,132,255,.6);font-size:20px;font-weight:600;color:#9cc4ff;letter-spacing:.08em;text-transform:uppercase}
    .vid-name{margin-top:22px;font-size:104px;line-height:1;font-weight:700;letter-spacing:-.03em}
    .vid-tag{margin-top:22px;font-size:34px;color:#b9c6e4}
  </style><div id="vid-spot"></div><div id="vid-ring"></div>
  <svg id="vid-cursor" viewBox="0 0 24 24"><path d="M4 2l15 11.2-6.6 1.1 3.9 7.4-3 1.5-3.9-7.5L4 20z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>`
  document.body.appendChild(root)
  const spot = root.querySelector("#vid-spot")
  const cursor = root.querySelector("#vid-cursor")
  const ring = root.querySelector("#vid-ring")
  const s = { el: null, x: 0, y: 0, w: 0, h: 0, o: 0, cx: 1500, cy: 900, tx: 1500, ty: 900 }
  const tick = () => {
    if (s.el) {
      const r = s.el.getBoundingClientRect()
      const pad = 8
      const k = s.o < 0.05 ? 1 : 0.16
      s.x += (r.x - pad - s.x) * k
      s.y += (r.y - pad - s.y) * k
      s.w += (r.width + pad * 2 - s.w) * k
      s.h += (r.height + pad * 2 - s.h) * k
      const radius = parseFloat(getComputedStyle(s.el).borderTopLeftRadius) || 8
      spot.style.borderRadius = `${radius + pad}px`
    }
    s.o += ((s.el ? 1 : 0) - s.o) * 0.14
    Object.assign(spot.style, { transform: `translate(${s.x}px,${s.y}px)`, width: `${s.w}px`, height: `${s.h}px`, opacity: s.o.toFixed(3) })
    s.cx += (s.tx - s.cx) * 0.11
    s.cy += (s.ty - s.cy) * 0.11
    cursor.style.transform = `translate(${s.cx - 4}px,${s.cy - 2}px)`
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
  // "box:<text>" is the bordered panel around the text, "text:<text>" the element showing it
  const resolve = (t, quiet) => {
    if (!t) return null
    const [kind, text] = [t.slice(0, t.indexOf(":")), t.slice(t.indexOf(":") + 1)]
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (n.textContent.trim() !== text || n.parentElement.closest("#vid-root")) continue
      let el = n.parentElement
      if (!el.getBoundingClientRect().width) continue
      if (kind === "box") {
        for (let p = el; p && p !== document.body; p = p.parentElement) {
          const cs = getComputedStyle(p)
          if (parseFloat(cs.borderTopWidth) >= 1 && parseFloat(cs.borderTopLeftRadius) >= 12 && p.getBoundingClientRect().width >= 200) {
            el = p
            break
          }
        }
      }
      return el
    }
    if (quiet) return null
    throw new Error(`Not on the page: ${t}`)
  }
  window.__vid = {
    find: resolve,
    rect: (t) => {
      const r = resolve(t).getBoundingClientRect()
      return { x: r.x, y: r.y, w: r.width, h: r.height }
    },
    spot: (t) => {
      s.el = resolve(t)
    },
    scrollTo: (t) => resolve(t).scrollIntoView({ behavior: "smooth", block: "center" }),
    cursorTo: (x, y) => {
      if (cursor.style.opacity !== "1") {
        s.cx = x + 260
        s.cy = y + 220
        cursor.style.opacity = "1"
      }
      s.tx = x
      s.ty = y
    },
    hideCursor: () => {
      cursor.style.opacity = "0"
    },
    clickFx: () => {
      Object.assign(ring.style, { left: `${s.tx}px`, top: `${s.ty}px` })
      ring.classList.remove("on")
      void ring.offsetWidth
      ring.classList.add("on")
    },
    hideCard: () => {
      const card = root.querySelector(".vid-card")
      if (!card) return
      card.style.opacity = "0"
      setTimeout(() => card.remove(), 700)
    },
  }
}

/** Title card (module number, name, tagline) or end card (what comes next). */
function showCard({ kind, number, name, tagline }) {
  const card = document.createElement("div")
  card.className = "vid-card"
  const pill = kind === "title" ? `Module ${String(number).padStart(2, "0")}` : name ? `Next · Module ${String(number).padStart(2, "0")}` : "Nexora ERP"
  card.innerHTML = `<div class="vid-brand"><img src="/app-logo.png" alt="">Nexora ERP</div>
    <div class="vid-pill">${pill}</div>
    <div class="vid-name">${name ?? "Thanks for watching"}</div>
    <div class="vid-tag">${tagline ?? "people → clients → projects → hours → invoices → cash → profit"}</div>`
  document.getElementById("vid-root").appendChild(card)
}
