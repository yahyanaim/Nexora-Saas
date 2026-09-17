"use client"

import dynamic from "next/dynamic"
import type { PickerProps } from "emoji-picker-react"

/**
 * Lazy-loaded Emoji Picker component.
 * Heavy ~40MB emoji dataset is code-split and loaded asynchronously on the client
 * to prevent inflating initial server/client JavaScript bundles.
 */
export const EmojiPicker = dynamic<PickerProps>(
  () => import("emoji-picker-react").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="h-[350px] w-[300px] animate-pulse rounded-lg bg-muted/50 border border-border" />
    ),
  }
)

export default EmojiPicker
