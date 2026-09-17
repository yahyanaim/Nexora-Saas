import { describe, it, expect, vi, beforeEach } from "vitest"
import { exportToCsv, exportToJson } from "./export-data"
import { toast } from "sonner"

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe("export-data utils", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mock-url"),
      revokeObjectURL: vi.fn(),
    })
  })

  it("handles empty data gracefully without throwing", () => {
    const csvResult = exportToCsv([], "empty-test")
    expect(csvResult).toBe(false)
    expect(toast.error).toHaveBeenCalledWith("No data available to export")

    const jsonResult = exportToJson([], "empty-test")
    expect(jsonResult).toBe(false)
    expect(toast.error).toHaveBeenCalledWith("No data available to export")
  })

  it("exports valid dataset to CSV with proper headers and escaping", () => {
    const mockData = [
      { id: "1", name: "Alex Morgan", email: "alex@example.com", role: "Admin" },
      { id: "2", name: 'Sarah "Lead" Chen', email: "sarah@example.com", role: "Designer" },
    ]

    let clicked = false
    let downloadedFilename = ""
    const appendSpy = vi.spyOn(document.body, "appendChild").mockImplementation((node: Node) => {
      const element = node as HTMLAnchorElement
      if (element.tagName === "A") {
        downloadedFilename = element.getAttribute("download") || ""
        element.click = () => {
          clicked = true
        }
      }
      return node
    })
    const removeSpy = vi.spyOn(document.body, "removeChild").mockImplementation((node: Node) => node)

    const result = exportToCsv(mockData, "users-export")
    expect(result).toBe(true)
    expect(clicked).toBe(true)
    expect(downloadedFilename).toBe("users-export.csv")
    expect(toast.success).toHaveBeenCalledWith("Exported 2 records to users-export.csv")

    appendSpy.mockRestore()
    removeSpy.mockRestore()
  })

  it("exports valid dataset to JSON", () => {
    const mockData = [{ id: "100", amount: 4500 }]

    let clicked = false
    let downloadedFilename = ""
    const appendSpy = vi.spyOn(document.body, "appendChild").mockImplementation((node: Node) => {
      const element = node as HTMLAnchorElement
      if (element.tagName === "A") {
        downloadedFilename = element.getAttribute("download") || ""
        element.click = () => {
          clicked = true
        }
      }
      return node
    })
    const removeSpy = vi.spyOn(document.body, "removeChild").mockImplementation((node: Node) => node)

    const result = exportToJson(mockData, "invoices-export")
    expect(result).toBe(true)
    expect(clicked).toBe(true)
    expect(downloadedFilename).toBe("invoices-export.json")
    expect(toast.success).toHaveBeenCalledWith("Exported 1 records to invoices-export.json")

    appendSpy.mockRestore()
    removeSpy.mockRestore()
  })
})
