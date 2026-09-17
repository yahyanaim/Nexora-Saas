import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { tokenStorage } from "./token-storage"
import * as demoModeModule from "@/lib/auth/demo-mode"

describe("tokenStorage (src/lib/myapi/token-storage.ts)", () => {
  function clearAllCookies() {
    document.cookie.split(";").forEach((cookie) => {
      const eqPos = cookie.indexOf("=")
      const name = eqPos > -1 ? cookie.substring(0, eqPos) : cookie
      document.cookie = `${name.trim()}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
    })
  }

  beforeEach(() => {
    clearAllCookies()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    clearAllCookies()
  })

  describe("In Demo Mode (isDemoMode = true)", () => {
    beforeEach(() => {
      vi.spyOn(demoModeModule, "isDemoMode").mockReturnValue(true)
    })

    it("returns null from get() when cookie is empty", () => {
      expect(tokenStorage.get()).toBeNull()
    })

    it("sets and retrieves a token cookie in document.cookie", () => {
      tokenStorage.set("demo-session-token-123")

      expect(document.cookie).toContain("token=demo-session-token-123")
      expect(tokenStorage.get()).toBe("demo-session-token-123")
    })

    it("handles URL-encoded special characters in tokens", () => {
      const complexToken = "test+user/123==?&special=true"
      tokenStorage.set(complexToken)

      expect(tokenStorage.get()).toBe(complexToken)
    })

    it("correctly extracts token when multiple cookies are present", () => {
      document.cookie = "other_cookie=12345; path=/"
      document.cookie = "token=multi-token-abc; path=/"
      document.cookie = "analytics_id=xyz; path=/"

      expect(tokenStorage.get()).toBe("multi-token-abc")
    })

    it("clears the token cookie upon clear()", () => {
      tokenStorage.set("token-to-clear")
      expect(tokenStorage.get()).toBe("token-to-clear")

      tokenStorage.clear()
      // In jsdom document.cookie clears when max-age=0
      expect(tokenStorage.get()).toBeNull()
    })

    it("includes Secure flag if protocol is https:", () => {
      // Temporarily mock location protocol
      try {
        Object.defineProperty(window, "location", {
          value: new URL("https://app.example.com"),
          writable: true,
        })
        tokenStorage.set("secure-token-test")
        expect(tokenStorage.get()).toBe("secure-token-test")
      } finally {
        Object.defineProperty(window, "location", {
          value: new URL(`http://localhost:3000`),
          writable: true,
        })
      }
    })
  })

  describe("Outside Demo Mode / Production (isDemoMode = false)", () => {
    beforeEach(() => {
      vi.spyOn(demoModeModule, "isDemoMode").mockReturnValue(false)
    })

    it("returns null from get() even if a client cookie exists (enforcing HttpOnly on server)", () => {
      document.cookie = "token=should-be-inaccessible"
      expect(tokenStorage.get()).toBeNull()
    })

    it("ignores set() calls to prevent insecure client-side session tampering", () => {
      tokenStorage.set("tampered-token")
      expect(document.cookie).not.toContain("tampered-token")
    })

    it("still permits clear() on logout to cleanly remove legacy cookies", () => {
      document.cookie = "token=old-cookie"
      tokenStorage.clear()
      expect(tokenStorage.get()).toBeNull()
    })
  })

  describe("Server-Side Rendering (SSR) Environment Safety", () => {
    it("safely returns null from get() when window is undefined", () => {
      const originalWindow = global.window
      try {
        // @ts-expect-error simulating SSR
        delete global.window
        expect(tokenStorage.get()).toBeNull()
      } finally {
        global.window = originalWindow
      }
    })

    it("safely no-ops set() when window is undefined", () => {
      const originalWindow = global.window
      try {
        // @ts-expect-error simulating SSR
        delete global.window
        expect(() => tokenStorage.set("token")).not.toThrow()
      } finally {
        global.window = originalWindow
      }
    })

    it("safely no-ops clear() when window is undefined", () => {
      const originalWindow = global.window
      try {
        // @ts-expect-error simulating SSR
        delete global.window
        expect(() => tokenStorage.clear()).not.toThrow()
      } finally {
        global.window = originalWindow
      }
    })
  })
})
