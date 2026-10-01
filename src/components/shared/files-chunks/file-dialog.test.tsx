import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { FileDialog } from "./file-dialog"
import { FileItem, FileType, FileVisibility } from "@/types/files"
import { IntlWrapper } from "@/test/intl"
import messages from "@/messages/en.json"

const video = {
  id: "f1",
  name: "demo.mp4",
  type: FileType.VIDEO,
  mimeType: "video/mp4",
  size: 2048,
  visibility: FileVisibility.PRIVATE,
  owner: { id: "u1", name: "Founder" },
  uploadedAt: "2026-01-01T00:00:00.000Z",
  modifiedAt: "2026-01-01T00:00:00.000Z",
  cloudinaryUrl: "https://res.cloudinary.com/demo/video.mp4",
} as unknown as FileItem

describe("FileDialog video preview", () => {
  it("shows a JSX fallback with a working download button when the video fails", () => {
    const onDownload = vi.fn()
    const { container } = render(
      <IntlWrapper>
        <FileDialog open onOpenChange={() => {}} file={video} mode="preview" onDownload={onDownload} />
      </IntlWrapper>
    )

    const videoEl = document.querySelector("video")
    expect(videoEl).not.toBeNull()
    fireEvent.error(videoEl!)

    expect(document.querySelector("video")).toBeNull()
    const fallback = screen.getByText(messages.videoNotAvailable).parentElement!
    fireEvent.click(within(fallback).getByRole("button", { name: messages.download }))
    expect(onDownload).toHaveBeenCalledWith(video)
    expect(container.innerHTML).not.toContain("<script")
  })
})
