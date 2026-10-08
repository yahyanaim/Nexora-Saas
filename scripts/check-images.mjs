#!/usr/bin/env node
/**
 * PERF-03: new images use WebP or AVIF, with explicit sizes.
 *
 * - A PNG, JPEG or GIF added to public/ fails, unless it is in the list of
 *   files that must stay in those formats (app icons for phones, the logo
 *   printed in PDFs) or that predate the rule.
 * - Every next/image <Image> has width and height (or fill); every <img> has
 *   width and height or a fixed size class (size-*, or h-* with w-*), except
 *   pictures the user uploads, whose size is only known in the browser.
 */
import fs from "node:fs"
import path from "node:path"

const ALLOWED = new Set([
  // phone and browser icons must be PNG
  "public/icons/apple-touch-icon.png", "public/icons/icon-192.png", "public/icons/icon-512.png", "public/icons/maskable-192.png", "public/icons/maskable-512.png",
  // embedded in PDFs (jsPDF reads PNG), and its copy in the documentation
  "public/app-logo.png", "public/documentation/app-logo.png",
  // before the rule (to convert)
  "public/auth-skyline-blue.png",
  ...["alex-morgan", "david-kim", "elena-rostova", "james-wilson", "liam-oconnor", "lucas-dubois", "marcus-vance", "maya-patel", "rachel-thorne", "sarah-chen", "sophia-vance", "viktor-reznov"].map((n) => `public/avatars/${n}.jpg`),
])
const problems = []
const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else out.push(p.split(path.sep).join("/"))
  }
  return out
}
for (const f of walk("public")) {
  if (/\.(png|jpe?g|gif)$/i.test(f) && !ALLOWED.has(f)) problems.push(`${f}: use WebP or AVIF for new images`)
}
for (const f of walk("src").filter((x) => x.endsWith(".tsx"))) {
  const src = fs.readFileSync(f, "utf8")
  for (const m of src.matchAll(/<(Image|img)\b((?:=>|[^>])*?)\/?>/gs)) {
    const [, tag, attrs] = m
    if (tag === "Image" && !/from "next\/image"/.test(src)) continue
    const sized = /\bfill\b/.test(attrs) || (/\bwidth=/.test(attrs) && /\bheight=/.test(attrs)) || (tag === "img" && (/\bsize-/.test(attrs) || (/\bh-/.test(attrs) && /\bw-/.test(attrs))))
    const upload = tag === "img" && /src=\{[^}]*(DataUrl|dataUrl|receiptImage|fileUrl|imageUrl)/.test(attrs)
    if (!sized && !upload) problems.push(`${f}:${src.slice(0, m.index).split("\n").length}: <${tag}> needs width and height`)
  }
}
if (problems.length) {
  console.error(problems.join("\n"))
  console.error(`\n${problems.length} image problem(s) (PERF-03).`)
  process.exit(1)
}
console.log("Images: formats and sizes OK (PERF-03).")
