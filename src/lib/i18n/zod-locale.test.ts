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

describe("the app's own Zod wording (no type names)", () => {
  it("covers lengths, numbers, lists, required and formats in Arabic", async () => {
    const ar = (await import("@/messages/ar.json")).default as Record<string, string>
    const t = (key: string, values?: Record<string, string | number>) =>
      Object.entries(values ?? {}).reduce((text, [k, v]) => text.replace(`{${k}}`, String(v)), ar[key] ?? key)
    await applyZodLocale("ar", t)
    const msg = (schema: z.ZodType, value: unknown) => schema.safeParse(value).error?.issues[0]?.message ?? ""
    const messages = [
      msg(z.string().min(2), "a"),
      msg(z.string().max(2), "abc"),
      msg(z.number().min(0), -1),
      msg(z.number().positive(), 0),
      msg(z.string(), undefined),
      msg(z.number(), "x"),
      msg(z.array(z.string()).min(1), []),
      msg(z.enum(["a", "b"]), "c"),
      msg(z.email(), "x"),
    ]
    expect(messages[0]).toBe("أدخل 2 أحرف على الأقل")
    expect(messages[2]).toBe("يجب أن تكون 0 أو أكثر")
    expect(messages[4]).toBe("مطلوب")
    for (const m of messages) expect(m).not.toMatch(/string|number|array|undefined/)
    // a message written on the schema still wins
    expect(msg(z.string().min(2, "custom"), "a")).toBe("custom")
  })
})
