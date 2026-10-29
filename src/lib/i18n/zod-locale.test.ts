import { afterAll, describe, expect, it } from "vitest"
import { z } from "zod"
import { applyZodLocale } from "./zod-locale"

describe("Zod messages follow the reader's language (C-04)", () => {
  afterAll(() => applyZodLocale("en"))

  it("speaks French, then Arabic, and falls back to English", async () => {
    await applyZodLocale("fr")
    expect(z.string().min(2).safeParse("a").error?.issues[0]?.message).toMatch(/petit/i)
    await applyZodLocale("ar")
    expect(z.email().safeParse("x").error?.issues[0]?.message).toMatch(/[؀-ۿ]/)
    await applyZodLocale("xx")
    expect(z.string().min(2).safeParse("a").error?.issues[0]?.message).toMatch(/Too small/)
  })
})
