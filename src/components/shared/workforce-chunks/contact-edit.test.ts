import { describe, expect, it } from "vitest"
import { withContact, withoutContact } from "./contact-edit"
import type { ClientContact } from "@/types/workforce"

const c = (id: string, isPrimary = false, over: Partial<ClientContact> = {}): ClientContact => ({ id, name: id, email: `${id}@x.c`, isPrimary, ...over })

describe("contact editing (CRM steps 4 and 6)", () => {
  it("adds a contact with a new id and drops empty extras", () => {
    const list = withContact([c("a", true)], c("", false, { name: "New", otherEmails: [], otherPhones: ["+1 2"], linkedin: " " }))
    expect(list).toHaveLength(2)
    expect(list[1]!.id).toMatch(/^con/)
    expect(list[1]).toMatchObject({ otherPhones: ["+1 2"] })
    expect(list[1]!.otherEmails).toBeUndefined()
    expect(list[1]!.linkedin).toBeUndefined()
  })

  it("moves the main contact and keeps one when the main one goes", () => {
    expect(withContact([c("a", true), c("b")], c("b", true)).map((x) => x.isPrimary)).toEqual([false, true])
    expect(withContact([c("a", true)], c("a", false)).map((x) => x.isPrimary)).toEqual([true])
    expect(withoutContact([c("a", true), c("b")], "a")).toEqual([c("b", true)])
    expect(withoutContact([c("a", true)], "a")).toEqual([])
  })
})
