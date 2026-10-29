import { z } from "zod"

/**
 * Password rule (decision D5, NIST 2025): at least 12 characters, any
 * characters, no forced mix of letters and digits. The server also checks
 * the password against known leaks (err_passwordBreached).
 */
export const PASSWORD_MIN = 12

type Translate = (key: string, values?: Record<string, string | number>) => string

/** A new password field: the length rule with its message in the reader's language. */
export const newPasswordField = (t: Translate) => z.string().min(PASSWORD_MIN, t("err_passwordTooShort", { min: PASSWORD_MIN }))
