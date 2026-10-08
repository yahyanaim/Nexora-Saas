#!/usr/bin/env node
/**
 * PERF-02: JavaScript budget per page, enforced after `next build`.
 *
 * For every app page, adds the gzip size of the JavaScript a browser loads to
 * show it (the shared runtime plus the chunks of the page and its layouts, as
 * listed in the build's client reference manifest) and fails above the budget.
 * Charts and other code loaded later with next/dynamic are not counted
 * (PERF-01 asks for exactly that).
 *
 * Two limits, from scripts/js-budget.json:
 * - target (500 KB, PERF-02): pages above it are listed as work to do;
 * - ceiling: the build fails above it, so no page grows while the shared shell
 *   is brought under the target. Lower the ceiling as pages get lighter.
 *
 *   node scripts/check-js-budget.mjs [.next]
 */
import fs from "node:fs"
import path from "node:path"
import zlib from "node:zlib"
import vm from "node:vm"

const ROOT = path.resolve(process.argv[2] ?? ".next")
const LIMITS = JSON.parse(fs.readFileSync(new URL("./js-budget.json", import.meta.url), "utf8"))
const BUDGET_KB = Number(process.env.JS_BUDGET_KB ?? LIMITS.targetKb)
const CEILING_KB = Number(process.env.JS_CEILING_KB ?? LIMITS.ceilingKb)
const SKIP = /\/(error|not-found|global-error|loading)$/

if (!fs.existsSync(path.join(ROOT, "build-manifest.json"))) {
  console.error(`No build found in ${ROOT}; run next build first.`)
  process.exit(2)
}
const build = JSON.parse(fs.readFileSync(path.join(ROOT, "build-manifest.json"), "utf8"))
const shared = build.rootMainFiles ?? []
const sizes = new Map()
const gz = (file) => {
  if (!sizes.has(file)) {
    const p = path.join(ROOT, file.replace(/^\/?_next\//, ""))
    sizes.set(file, fs.existsSync(p) ? zlib.gzipSync(fs.readFileSync(p), { level: 9 }).length : 0)
  }
  return sizes.get(file)
}

const manifests = []
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p)
    else if (e.name === "page_client-reference-manifest.js") manifests.push(p)
  }
}
walk(path.join(ROOT, "server", "app"))

const rows = []
for (const file of manifests) {
  const ctx = { globalThis: {} }
  ctx.globalThis = ctx
  vm.runInNewContext(fs.readFileSync(file, "utf8"), ctx)
  const [route, m] = Object.entries(ctx.__RSC_MANIFEST)[0]
  const files = new Set(shared)
  for (const [entry, list] of Object.entries(m.entryJSFiles ?? {})) {
    if (SKIP.test(entry)) continue
    for (const f of list) files.add(f)
  }
  const bytes = [...files].reduce((s, f) => s + gz(f), 0)
  rows.push({ route: route.replace(/\/page$/, "") || "/", kb: Math.round(bytes / 102.4) / 10 })
}
rows.sort((a, b) => b.kb - a.kb)
const failing = rows.filter((r) => r.kb > CEILING_KB)
const toDo = rows.filter((r) => r.kb > BUDGET_KB && r.kb <= CEILING_KB)
console.log(`JavaScript per page (gzip) — ${rows.length} pages · target ${BUDGET_KB} KB · ceiling ${CEILING_KB} KB`)
for (const r of rows.slice(0, 15)) console.log(`${r.kb > CEILING_KB ? "✗" : r.kb > BUDGET_KB ? "!" : "✓"} ${String(r.kb).padStart(7)} KB  ${r.route}`)
if (toDo.length) console.log(`\n${toDo.length} page(s) above the ${BUDGET_KB} KB target (work to do, not failing).`)
if (failing.length) {
  console.error(`${failing.length} page(s) above the ${CEILING_KB} KB ceiling. Load heavy parts with next/dynamic, or split the page.`)
  process.exit(1)
}
console.log(`No page above the ${CEILING_KB} KB ceiling.`)
