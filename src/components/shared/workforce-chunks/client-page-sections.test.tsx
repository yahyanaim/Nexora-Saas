import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import messages from "@/messages/en.json"
import { ContactsSection } from "./client-page-sections"
import { ClientStatus, type Client } from "@/types/workforce"

const client: Client = {
  id: "cli_medica", workspaceId: "ws", name: "Medica Health", email: "finance@medica.example", status: ClientStatus.ACTIVE, paymentTermsDays: 30, createdAt: "", updatedAt: "",
  contacts: [
    { id: "c1", name: "Sofia Conti", email: "sofia@medica.example", isPrimary: true },
    { id: "c2", name: "Marc Dubois", email: "marc@medica.example", isPrimary: false },
  ],
}

function renderSection(canEdit = true) {
  const onSave = vi.fn()
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ContactsSection client={client} canEdit={canEdit} onSave={onSave} saving={false} />
    </NextIntlClientProvider>
  )
  return onSave
}

describe("client page contacts", () => {
  it("adds a contact", () => {
    const onSave = renderSection()
    fireEvent.click(screen.getByRole("button", { name: "Add a contact" }))
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: " Lina Haddad " } })
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "lina@medica.example" } })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    const saved = onSave.mock.calls[0]![0]
    expect(saved).toHaveLength(3)
    expect(saved[2]).toMatchObject({ name: "Lina Haddad", email: "lina@medica.example", isPrimary: false })
    expect(saved[2].id).toMatch(/^con/)
  })

  it("moves the main contact when another one becomes main", () => {
    const onSave = renderSection()
    fireEvent.click(screen.getByRole("button", { name: "Edit Marc Dubois" }))
    fireEvent.click(screen.getByRole("checkbox"))
    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    expect(onSave.mock.calls[0]![0].map((c: { id: string; isPrimary: boolean }) => [c.id, c.isPrimary])).toEqual([["c1", false], ["c2", true]])
  })

  it("keeps a main contact when the main one is removed", () => {
    const onSave = renderSection()
    fireEvent.click(screen.getByRole("button", { name: "Remove Sofia Conti" }))
    fireEvent.click(screen.getByRole("button", { name: "Delete" }))
    expect(onSave).toHaveBeenCalledWith([{ id: "c2", name: "Marc Dubois", email: "marc@medica.example", isPrimary: true }])
  })

  it("only lists the contacts for people who can't edit", () => {
    renderSection(false)
    expect(screen.getByText("Sofia Conti")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Add a contact" })).not.toBeInTheDocument()
  })
})
