import { describe, it, expect } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "./dialog"
import { Sheet, SheetContent, SheetTrigger } from "./sheet"

describe("overlay keyboard support", () => {
  it("closes a dialog when Escape is pressed", () => {
    render(
      <Dialog>
        <DialogTrigger>Open dialog</DialogTrigger>
        <DialogContent>
          <DialogTitle>Dialog body</DialogTitle>
        </DialogContent>
      </Dialog>
    )
    fireEvent.click(screen.getByText("Open dialog"))
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true")

    fireEvent.keyDown(document, { key: "Escape" })
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("closes a sheet when Escape is pressed", () => {
    render(
      <Sheet>
        <SheetTrigger>Open sheet</SheetTrigger>
        <SheetContent>Sheet body</SheetContent>
      </Sheet>
    )
    fireEvent.click(screen.getByText("Open sheet"))
    expect(screen.getByText("Sheet body")).toBeInTheDocument()

    fireEvent.keyDown(document, { key: "Escape" })
    expect(screen.queryByText("Sheet body")).not.toBeInTheDocument()
  })
})
