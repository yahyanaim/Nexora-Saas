import { describe, expect, it } from "vitest"
import { CLIENT_PAGE_TABS, clientPageHref, tabFromQuery } from "./client-page-tabs"

describe("client page tabs", () => {
  it("links to the client page, with the tab in the address unless it is the overview", () => {
    expect(clientPageHref("cli_1")).toBe("/dashboard/clients/cli_1")
    expect(clientPageHref("cli_1", "overview")).toBe("/dashboard/clients/cli_1")
    expect(clientPageHref("cli_1", "billing")).toBe("/dashboard/clients/cli_1?tab=billing")
  })

  it("opens the tab from the address only when the reader may see it", () => {
    expect(tabFromQuery("contacts", CLIENT_PAGE_TABS)).toBe("contacts")
    expect(tabFromQuery("billing", CLIENT_PAGE_TABS.filter((t) => t !== "billing"))).toBe("overview")
    expect(tabFromQuery("nope", CLIENT_PAGE_TABS)).toBe("overview")
    expect(tabFromQuery(null, CLIENT_PAGE_TABS)).toBe("overview")
  })
})
