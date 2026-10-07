#!/usr/bin/env node
/**
 * Copies the user documentation (documentation/) to public/documentation,
 * where the app serves it at /documentation/doc.html. documentation/ is the
 * only copy to edit; this runs before every build and dev start so the
 * served copy never goes stale. `--check` only reports a difference.
 */
import { cpSync, readFileSync, readdirSync, existsSync } from "node:fs"
import { join } from "node:path"

const src = "documentation"
const dest = join("public", "documentation")
const files = readdirSync(src)
const stale = files.filter((f) => !existsSync(join(dest, f)) || !readFileSync(join(src, f)).equals(readFileSync(join(dest, f))))

if (process.argv.includes("--check")) {
  if (stale.length) {
    console.error(`public/documentation is out of date: ${stale.join(", ")}. Run: node scripts/sync-docs.mjs`)
    process.exit(1)
  }
  console.log("✅ public/documentation matches documentation/")
} else {
  for (const f of files) cpSync(join(src, f), join(dest, f))
  console.log(stale.length ? `📄 Docs copied to public/documentation (${stale.join(", ")})` : "📄 Docs already up to date")
}
