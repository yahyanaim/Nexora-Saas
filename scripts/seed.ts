import fs from "node:fs"
import path from "node:path"
import { MongoClient } from "mongodb"
import bcrypt from "bcryptjs"

const ENV_PATH = path.resolve(process.cwd(), ".env")

const DEFAULT_ENV_VARS: Record<string, string> = {
  MONGODB_URI: "mongodb://localhost:27017/volix-saas",

  JWT_SECRET: "replace-this-with-a-strong-random-secret",
  NODE_ENV: "development",

  CLOUDINARY_CLOUD_NAME: "your-cloud-name",
  CLOUDINARY_API_KEY: "your-api-key",
  CLOUDINARY_API_SECRET: "your-api-secret",
  CLOUDINARY_UPLOAD_PRESET: "your-upload-preset",

  SMTP_HOST: "smtp.example.com",
  SMTP_PORT: "587",
  SMTP_USER: "your-smtp-user",
  SMTP_PASS: "your-smtp-password",
  EMAIL_FROM: "no-reply@volix.saas.com",
}

function ensureEnvFile() {
  if (!fs.existsSync(ENV_PATH)) {
    const content =
      Object.entries(DEFAULT_ENV_VARS)
        .map(([key, value]) => `${key}=${value}`)
        .join("\n") + "\n"

    fs.writeFileSync(ENV_PATH, content, "utf-8")
    console.log(`Created .env file at ${ENV_PATH} with default values.`)
    return
  }

  const existing = fs.readFileSync(ENV_PATH, "utf-8")
  const missingLines: string[] = []

  for (const [key, value] of Object.entries(DEFAULT_ENV_VARS)) {
    const pattern = new RegExp(`^${key}=`, "m")
    if (!pattern.test(existing)) {
      missingLines.push(`${key}=${value}`)
    }
  }

  if (missingLines.length > 0) {
    const separator = existing.endsWith("\n") ? "" : "\n"
    fs.appendFileSync(ENV_PATH, `${separator}${missingLines.join("\n")}\n`)
    console.log(
      `Added ${missingLines.length} missing variable(s) to .env: ${missingLines
        .map((l) => l.split("=")[0])
        .join(", ")}`
    )
  }
}

function printRocket() {
  const rocket = `
                        ▲
                       ╱ ╲
                      ╱   ╲
                     ╱  ◉  ╲
                    │       │
                    │ VOLIX │
                    │       │
                   ╱│       │╲
                  ╱ │       │ ╲
                 ╱  │       │  ╲
                │   │       │   │
                │   └───────┘   │
                 ╲   ╱     ╲   ╱
                  ╲ ╱       ╲ ╱
                   ▼         ▼
                  ╱ ╲       ╱ ╲
                 ╱   ╲ ▓▓▓ ╱   ╲
                ╱     ╲▓▓▓╱     ╲
                        ▓
`
  console.log("\x1b[36m%s\x1b[0m", rocket)
  console.log(
    "\x1b[1m\x1b[32m%s\x1b[0m",
    "   Seed completed successfully — ready for launch!\n"
  )
}

ensureEnvFile()

const dotenv = await import("dotenv")
dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI
const ADMIN_EMAIL = "admin@volix.saas.com"
const ADMIN_USERNAME = "volixadmin"
const ADMIN_PASSWORD = "Aa123456"

async function seed() {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI is not set in the environment.")
    process.exit(1)
  }

  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    const db = client.db()
    const users = db.collection("users")

    const existingAdmin = await users.findOne({ email: ADMIN_EMAIL })

    if (existingAdmin) {
      console.log(`Admin already exists (${ADMIN_EMAIL}), skipping seed.`)
      printRocket()
      return
    }

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12)
    const now = new Date()

    await users.insertOne({
      name: "Owner",
      email: ADMIN_EMAIL,
      username: ADMIN_USERNAME,
      password: hashedPassword,
      is2FA: false,
      profileColor: "#10AC84",
      status: "active",
      userType: "admin",
      roles: [],
      bio: "",
      dateOfBirth: null,
      avatar:
        "https://api.dicebear.com/10.x/personas/svg?seed=James",
      lastSeenAt: null,
      lastLoginAt: null,
      isPasscodeLocked: false,
      passcodeLock: "",
      createdAt: now,
      updatedAt: now,
    })

    console.log(`Admin user created (${ADMIN_EMAIL}).`)
    if (!process.env.SEED_ADMIN_PASSWORD) {
      console.log(
        `Using default password "${ADMIN_PASSWORD}" — change it after first login.`
      )
    }

    printRocket()
  } catch (error) {
    console.error("Failed to seed admin:", error)
    process.exit(1)
  } finally {
    await client.close()
  }
}

seed()
