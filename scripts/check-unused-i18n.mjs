#!/usr/bin/env node
/**
 * Lists texts in src/messages/en.json that no code uses (audit C-01) and fails
 * when there are any. A key counts as used when its name appears in the code,
 * or when it starts with a prefix the code builds keys from (`t(\`imErr_${…}\`)`).
 *
 *   node scripts/check-unused-i18n.mjs
 */
import fs from "node:fs"
import path from "node:path"

const ROOTS = ["src", "scripts", "e2e"]
const files = []
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== "messages" && entry.name !== "node_modules") walk(full)
    } else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) files.push(full)
  }
}
for (const root of ROOTS) if (fs.existsSync(root)) walk(root)

const code = files.map((f) => fs.readFileSync(f, "utf8")).join("\n")
const tokens = new Set(code.match(/[A-Za-z_][\w.]*/g))
const prefixes = [
  ...[...code.matchAll(/`([A-Za-z][\w.]*?)\$\{/g)].map((m) => m[1]),
  ...[...code.matchAll(/["']([A-Za-z]\w*_)["']\s*\+/g)].map((m) => m[1]),
].filter((p) => p.length >= 3)

const keys = Object.keys(JSON.parse(fs.readFileSync("src/messages/en.json", "utf8")))
const unused = keys.filter((k) => !tokens.has(k) && !prefixes.some((p) => k.startsWith(p)))

if (unused.length) {
  console.error(`${unused.length} unused text(s) in src/messages/en.json:\n${unused.join("\n")}`)
  console.error("\nRemove them from the 9 language files, or use them.")
  process.exit(1)
}
console.log(`All ${keys.length} texts are used.`)
