import crypto from "crypto"

const RESET_TOKEN_EXPIRY_MINUTES = 10

export function generateResetToken() {
  const rawToken = crypto.randomBytes(32).toString("hex")
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex")

  const expiresAt = new Date()
  expiresAt.setMinutes(expiresAt.getMinutes() + RESET_TOKEN_EXPIRY_MINUTES)

  return { rawToken, hashedToken, expiresAt }
}

export function hashResetToken(rawToken: string) {
  return crypto.createHash("sha256").update(rawToken).digest("hex")
}
