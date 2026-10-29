import { describe, expect, it } from "vitest"
import { newPasswordField, PASSWORD_MIN } from "./password"

describe("password rule (D5)", () => {
  const field = newPasswordField((key, values) => `${key}:${values?.min}`)

  it("needs 12 characters and nothing else", () => {
    expect(PASSWORD_MIN).toBe(12)
    expect(field.safeParse("short-pass1").success).toBe(false)
    expect(field.safeParse("all lowercase words").success).toBe(true)
    expect(field.safeParse("123456789012").success).toBe(true)
  })

  it("says the minimum in the message", () => {
    expect(field.safeParse("x").error?.issues[0]?.message).toBe("err_passwordTooShort:12")
  })
})
