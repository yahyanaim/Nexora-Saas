import { describe, it, expect } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { NotificationCenter } from "./notification-center"

describe("NotificationCenter", () => {
  it("renders notification trigger with unread badge", () => {
    render(<NotificationCenter />)

    const button = screen.getByRole("button", { name: /open notifications/i })
    expect(button).toBeInTheDocument()

    // Expect initial unread count of 3 to be visible
    expect(screen.getByText("3")).toBeInTheDocument()
    // Popover content should not be visible initially
    expect(screen.queryByText("Security Sanction Enforced")).not.toBeInTheDocument()
  })

  it("opens popover on first click, closes on second click, and re-opens on third click", () => {
    render(<NotificationCenter />)

    const button = screen.getByRole("button", { name: /open notifications/i })

    // 1st Click -> Opens Popover
    fireEvent.click(button)
    expect(screen.getByText("Security Sanction Enforced")).toBeInTheDocument()
    expect(screen.getByText("Invoice #INV-2024-001 Paid")).toBeInTheDocument()

    // 2nd Click -> Closes Popover
    fireEvent.click(button)
    expect(screen.queryByText("Security Sanction Enforced")).not.toBeInTheDocument()

    // 3rd Click -> Re-opens Popover reliably
    fireEvent.click(button)
    expect(screen.getByText("Security Sanction Enforced")).toBeInTheDocument()
  })

  it("marks all notifications as read when clicked", () => {
    render(<NotificationCenter />)

    const button = screen.getByRole("button", { name: /open notifications/i })
    fireEvent.click(button)

    const markAllReadBtn = screen.getByRole("button", { name: /mark all read/i })
    fireEvent.click(markAllReadBtn)

    // Unread count badge should disappear
    expect(screen.queryByText("3")).not.toBeInTheDocument()
  })
})
