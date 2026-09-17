import { z } from "zod"

/**
 * Validates and types all public and runtime environment variables for Nexora SaaS.
 * Provides explicit typing, URL validation, enum checks, and actionable error messages.
 */
export const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z
    .string()
    .url("NEXT_PUBLIC_API_URL must be a valid URL"),

  NEXT_PUBLIC_APP_URL: z
    .string()
    .url("NEXT_PUBLIC_APP_URL must be a valid URL")
    .optional()
    .or(z.literal(""))
    .transform((val) => (val === "" ? undefined : val)),

  NEXT_PUBLIC_DEMO_MODE: z
    .enum(["true", "false"], {
      message: "NEXT_PUBLIC_DEMO_MODE must be either 'true' or 'false'",
    })
    .default("false"),

  NEXT_PUBLIC_APP_NAME: z
    .string()
    .min(1, "NEXT_PUBLIC_APP_NAME cannot be empty")
    .default("Nexora SaaS"),

  NEXT_PUBLIC_DEFAULT_LOCALE: z
    .string()
    .min(1, "NEXT_PUBLIC_DEFAULT_LOCALE cannot be empty")
    .default("en"),
})

export type Env = z.infer<typeof envSchema>

/**
 * Validates process.env variables against the Zod schema.
 * Throws a formatted, developer-friendly error message if validation fails.
 */
export function validateEnv(customEnv?: Record<string, string | undefined>): Env {
  const rawEnv = customEnv ?? {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE,
  }

  const result = envSchema.safeParse(rawEnv)

  if (!result.success) {
    const errorDetails = Object.entries(result.error.flatten().fieldErrors)
      .map(([key, errors]) => `  • ${key}: ${errors?.join(", ")}`)
      .join("\n")

    const errorMessage = `\n❌ [Environment Validation Error] Invalid or missing environment variables:\n${errorDetails}\n`
    console.error(errorMessage)
    throw new Error(errorMessage)
  }

  return result.data
}

export const env: Env = validateEnv()
