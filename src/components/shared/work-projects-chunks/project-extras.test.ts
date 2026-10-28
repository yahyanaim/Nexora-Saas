import { describe, expect, it } from "vitest"
import { ignoreShortcut } from "./project-extras"

const key = (k: string, o: Partial<KeyboardEvent> = {}) => ({ key: k, ctrlKey: false, metaKey: false, altKey: false, defaultPrevented: false, ...o })

describe("project page shortcuts (Project extras)", () => {
  it("leaves keys to text fields, dialogs and menus, and to modifier combinations", () => {
    const input = document.createElement("input")
    const dialog = document.createElement("div")
    dialog.setAttribute("role", "dialog")
    const inDialog = document.createElement("button")
    dialog.appendChild(inDialog)
    const plain = document.createElement("div")
    expect(ignoreShortcut(key("n"), input)).toBe(true)
    expect(ignoreShortcut(key("n"), inDialog)).toBe(true)
    expect(ignoreShortcut(key("n", { ctrlKey: true }), plain)).toBe(true)
    expect(ignoreShortcut(key("n", { defaultPrevented: true }), plain)).toBe(true)
    expect(ignoreShortcut(key("n"), plain)).toBe(false)
    expect(ignoreShortcut(key("?"), document.body)).toBe(false)
  })
})
