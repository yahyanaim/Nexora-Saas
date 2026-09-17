import { describe, it, expect } from "vitest"
import { envSchema, validateEnv, env } from "./env"

describe("Environment Validation (src/env.ts)", () => {
  describe("envSchema parse & validation", () => {
    it("successfully validates full valid environment configuration", () => {
      const validEnv = {
        NEXT_PUBLIC_API_URL: "https://api.nexora.com/api",
        NEXT_PUBLIC_APP_URL: "https://app.nexora.com",
        NEXT_PUBLIC_DEMO_MODE: "true",
        NEXT_PUBLIC_APP_NAME: "Custom SaaS",
        NEXT_PUBLIC_DEFAULT_LOCALE: "fr",
      }

      const result = envSchema.parse(validEnv)
      expect(result.NEXT_PUBLIC_API_URL).toBe("https://api.nexora.com/api")
      expect(result.NEXT_PUBLIC_APP_URL).toBe("https://app.nexora.com")
      expect(result.NEXT_PUBLIC_DEMO_MODE).toBe("true")
      expect(result.NEXT_PUBLIC_APP_NAME).toBe("Custom SaaS")
      expect(result.NEXT_PUBLIC_DEFAULT_LOCALE).toBe("fr")
    })

    it("applies default values for DEMO_MODE, APP_NAME, and DEFAULT_LOCALE", () => {
      const minimalEnv = {
        NEXT_PUBLIC_API_URL: "http://localhost:40001/api",
      }

      const result = envSchema.parse(minimalEnv)
      expect(result.NEXT_PUBLIC_API_URL).toBe("http://localhost:40001/api")
      expect(result.NEXT_PUBLIC_DEMO_MODE).toBe("false")
      expect(result.NEXT_PUBLIC_APP_NAME).toBe("Nexora SaaS")
      expect(result.NEXT_PUBLIC_DEFAULT_LOCALE).toBe("en")
      expect(result.NEXT_PUBLIC_APP_URL).toBeUndefined()
    })

    it("transforms empty string NEXT_PUBLIC_APP_URL to undefined", () => {
      const result = envSchema.parse({
        NEXT_PUBLIC_API_URL: "http://localhost:40001/api",
        NEXT_PUBLIC_APP_URL: "",
      })
      expect(result.NEXT_PUBLIC_APP_URL).toBeUndefined()
    })

    it("throws clear Zod error when NEXT_PUBLIC_DEMO_MODE is invalid", () => {
      expect(() =>
        validateEnv({
          NEXT_PUBLIC_API_URL: "http://localhost:40001/api",
          NEXT_PUBLIC_DEMO_MODE: "invalid",
        })
      ).toThrow(/NEXT_PUBLIC_DEMO_MODE must be either 'true' or 'false'/)
    })

    it("throws clear Zod error when NEXT_PUBLIC_API_URL is missing or invalid URL", () => {
      expect(() =>
        validateEnv({
          NEXT_PUBLIC_API_URL: "not-a-valid-url",
        })
      ).toThrow(/NEXT_PUBLIC_API_URL must be a valid URL/)

      expect(() =>
        validateEnv({
          NEXT_PUBLIC_API_URL: "",
        })
      ).toThrow(/NEXT_PUBLIC_API_URL must be a valid URL/)
    })

    it("throws clear Zod error when NEXT_PUBLIC_APP_URL is not a valid URL", () => {
      expect(() =>
        validateEnv({
          NEXT_PUBLIC_API_URL: "http://localhost:40001/api",
          NEXT_PUBLIC_APP_URL: "ftp-or-broken",
        })
      ).toThrow(/NEXT_PUBLIC_APP_URL must be a valid URL/)
    })
  })

  describe("exported env singleton", () => {
    it("exports a valid env object in test runtime", () => {
      expect(env).toBeDefined()
      expect(typeof env.NEXT_PUBLIC_API_URL).toBe("string")
      expect(["true", "false"]).toContain(env.NEXT_PUBLIC_DEMO_MODE)
      expect(typeof env.NEXT_PUBLIC_APP_NAME).toBe("string")
      expect(typeof env.NEXT_PUBLIC_DEFAULT_LOCALE).toBe("string")
    })
  })
})
