import { describe, it, expect } from "vitest"
import { AxiosError, type AxiosResponse } from "axios"
import { serverErrorKey, translateError } from "./translate-error"

const known = new Set(["err_conflict", "err_periodLocked", "err_leaveBalance", "somethingWentWrong"])
const t = Object.assign((key: string, values?: Record<string, string | number>) => `T:${key}${values ? JSON.stringify(values) : ""}`, { has: (key: string) => known.has(key) })
const refusal = (status: number, data: unknown) => new AxiosError("Request failed", String(status), undefined, null, { status, data } as AxiosResponse)

describe("server error codes (API audit §2)", () => {
  it("translates the code the backend sends, with the older details shape", () => {
    expect(translateError(refusal(409, { code: "err_periodLocked", message: "Locked" }), t)).toBe("T:err_periodLocked")
    expect(serverErrorKey(refusal(400, { code: "err_leaveBalance", details: { left: 2, year: "2026", nested: {} } }))).toEqual({ key: "err_leaveBalance", values: { left: "2", year: "2026" } })
  })

  it("reads the server's error body: values fill the translation (contract §2, E1)", () => {
    // The same example body as the server's contract test (Nexora-Backend, src/http/error-body.test.ts)
    const body = { code: "err_fileTooLarge", values: { maxMb: 10 }, requestId: "req-probe" }
    expect(serverErrorKey(refusal(413, body))).toEqual({ key: "err_fileTooLarge", values: { maxMb: "10" } })
    const withField = { code: "err_customFieldRequired", values: { name: "Budget", field: "budget" }, requestId: "req-probe" }
    expect(serverErrorKey(refusal(422, withField))).toEqual({ key: "err_customFieldRequired", values: { name: "Budget", field: "budget" } })
    // values win over the older details when a server sends both
    expect(serverErrorKey(refusal(400, { code: "err_leaveBalance", values: { left: 1 }, details: { left: 9 } }))).toEqual({ key: "err_leaveBalance", values: { left: "1" } })
    expect(serverErrorKey(refusal(400, { code: "err_leaveBalance", values: [1, 2] }))).toEqual({ key: "err_leaveBalance" })
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
