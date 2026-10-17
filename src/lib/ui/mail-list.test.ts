import { describe, expect, it } from "vitest"
import { MAILTO_LIMIT, bccMailto, clientRecipients } from "./mail-list"

const c = (email: string, contacts: { email: string; isPrimary: boolean }[] = []) => ({ email, contacts: contacts.map((x, i) => ({ id: `${i}`, name: "N", ...x })) })

describe("e-mailing clients", () => {
  it("writes to each client's main contact, else the client, once", () => {
    expect(clientRecipients([c("ap@orbit.example", [{ email: "claire@orbit.example", isPrimary: true }]), c("hello@vela.example"), c(""), c("HELLO@vela.example")])).toEqual([
      "claire@orbit.example",
      "hello@vela.example",
    ])
  })

  it("puts everyone in BCC, or gives up when the link would be too long", () => {
    expect(bccMailto(["a@x.example", "b+1@x.example"])).toBe("mailto:?bcc=a%40x.example,b%2B1%40x.example")
    expect(bccMailto([])).toBeNull()
    const many = Array.from({ length: 200 }, (_, i) => `person${i}@company.example`)
    expect(`mailto:?bcc=${many.join(",")}`.length).toBeGreaterThan(MAILTO_LIMIT)
    expect(bccMailto(many)).toBeNull()
  })
})
