import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const messagesDir = path.join(rootDir, "src", "messages");

function getAllKeys(obj, prefix = "") {
  let keys = [];
  for (const k of Object.keys(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === "object" && obj[k] !== null && !Array.isArray(obj[k])) {
      keys = keys.concat(getAllKeys(obj[k], full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

const enPath = path.join(messagesDir, "en.json");
if (!fs.existsSync(enPath)) {
  console.error("❌ Base locale file en.json not found at:", enPath);
  process.exit(1);
}

const enData = JSON.parse(fs.readFileSync(enPath, "utf8"));
const enKeys = new Set(getAllKeys(enData));

const files = fs.readdirSync(messagesDir).filter(
  (f) => f.endsWith(".json") && f !== "en.json"
);

let hasError = false;

for (const file of files) {
  const filePath = path.join(messagesDir, file);
  const locale = path.basename(file, ".json");
  const locData = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const locKeys = new Set(getAllKeys(locData));

  const missingKeys = [...enKeys].filter((k) => !locKeys.has(k));
  const extraKeys = [...locKeys].filter((k) => !enKeys.has(k));

  if (missingKeys.length > 0 || extraKeys.length > 0) {
    hasError = true;
    console.error(`\n❌ [i18n Desync] Locale "${locale}" (${file}) is out of sync with en.json:`);
    if (missingKeys.length > 0) {
      console.error(`  - Missing ${missingKeys.length} key(s):`);
      for (const k of missingKeys.slice(0, 20)) {
        console.error(`      • ${k}`);
      }
      if (missingKeys.length > 20) {
        console.error(`      ... and ${missingKeys.length - 20} more`);
      }
    }
    if (extraKeys.length > 0) {
      console.error(`  - Extra ${extraKeys.length} key(s):`);
      for (const k of extraKeys.slice(0, 20)) {
        console.error(`      • ${k}`);
      }
      if (extraKeys.length > 20) {
        console.error(`      ... and ${extraKeys.length - 20} more`);
      }
    }
  } else {
    console.log(`✓ Locale "${locale}" is fully in sync with en.json (${locKeys.size} keys).`);
  }
}

if (hasError) {
  console.error("\n❌ i18n key synchronization check failed! Run translation sync before committing.");
  process.exit(1);
} else {
  console.log("\n✅ All locale files are perfectly synchronized with en.json.");
  process.exit(0);
}
