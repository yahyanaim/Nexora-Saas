import { describe, it, expect, vi, afterEach } from "vitest"

describe("logger", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it("forwards all arguments outside production", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    const { logger } = await import("./logger")
    const err = new Error("boom")
    logger.error("[API Error] x failed:", "msg", err)
    expect(spy).toHaveBeenCalledWith("[API Error] x failed:", "msg", err)
  })

  it("strips error objects and drops debug output in production", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {})
    const { logger } = await import("./logger")

    logger.error("[API Error] x failed:", "msg", { config: { headers: { Cookie: "secret" } } })
    logger.debug("noise")

    expect(errorSpy).toHaveBeenCalledWith("[API Error] x failed:", "msg")
    expect(debugSpy).not.toHaveBeenCalled()
  })
})
