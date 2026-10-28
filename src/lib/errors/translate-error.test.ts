import { describe, it, expect } from "vitest"
import { AxiosError, type AxiosResponse } from "axios"
import { serverErrorKey, translateError } from "./translate-error"

const known = new Set(["err_conflict", "err_periodLocked", "err_leaveBalance", "somethingWentWrong"])
const t = Object.assign((key: string, values?: Record<string, string | number>) => `T:${key}${values ? JSON.stringify(values) : ""}`, { has: (key: string) => known.has(key) })
const refusal = (status: number, data: unknown) => new AxiosError("Request failed", String(status), undefined, null, { status, data } as AxiosResponse)

describe("server error codes (API audit §2)", () => {
  it("translates the code the backend sends, with its details", () => {
    expect(translateError(refusal(409, { code: "err_periodLocked", message: "Locked" }), t)).toBe("T:err_periodLocked")
    expect(serverErrorKey(refusal(400, { code: "err_leaveBalance", details: { left: 2, year: "2026", nested: {} } }))).toEqual({ key: "err_leaveBalance", values: { left: "2", year: "2026" } })
  })

  it("reads a 409 without a code as a stale write", () => {
    expect(translateError(refusal(409, {}), t)).toBe("T:err_conflict")
  })

  it("leaves unknown codes and other errors to the message", () => {
    expect(serverErrorKey(refusal(400, { code: "nope" }))).toBeNull()
    expect(translateError(refusal(400, { code: "err_unknownToUi" }), t)).toBe("Request failed")
    expect(serverErrorKey(new Error("plain"))).toBeNull()
    expect(translateError(new Error("plain"), t)).toBe("plain")
  })
})
