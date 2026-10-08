#!/usr/bin/env node
/**
 * PERF-04: the documentation copy step stays in the build and start scripts,
 * so the public copy of the docs is never older than documentation/.
 */
import fs from "node:fs"

const scripts = JSON.parse(fs.readFileSync("package.json", "utf8")).scripts ?? {}
const missing = ["prebuild", "prestart", "predev"].filter((k) => !(scripts[k] ?? "").includes("scripts/sync-docs.mjs"))
if (missing.length) {
  console.error(`package.json: ${missing.join(", ")} must run node scripts/sync-docs.mjs (PERF-04).`)
  process.exit(1)
}
console.log("Build scripts: the docs copy runs on build, start and dev (PERF-04).")
