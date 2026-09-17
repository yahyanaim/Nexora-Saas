import { describe, it, expect, beforeAll } from "vitest"
import { render, screen } from "@testing-library/react"
import { CommandDialog, CommandInput, CommandList, CommandItem } from "./command"

beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.HTMLElement.prototype.scrollIntoView = function () {}
})

describe("CommandDialog", () => {
  it("renders with top-center positioning instead of bottom", () => {
    render(
      <CommandDialog open={true}>
        <CommandInput placeholder="Search..." />
        <CommandList>
          <CommandItem>Test Item</CommandItem>
        </CommandList>
      </CommandDialog>
    )

    // Check that the dialog content exists
    const dialog = screen.getByRole("dialog")
    expect(dialog).toBeInTheDocument()

    // Ensure it does not have the old buggy top-1/3 class that shoved it to the bottom
    expect(dialog.className).not.toContain("top-1/3")

    // The fixed container wrapper should have items-start and pt-[12vh]
    const fixedContainer = dialog.parentElement
    expect(fixedContainer?.className).toContain("items-start")
    expect(fixedContainer?.className).toContain("pt-[12vh]")
  })
})
