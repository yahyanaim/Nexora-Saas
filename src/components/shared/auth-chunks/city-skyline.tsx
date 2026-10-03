"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"

interface CitySkylineProps {
  className?: string
}

/** Engraved city skyline in the primary blue, shown under the auth form. */
export function CitySkyline({ className }: CitySkylineProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none relative w-full max-w-lg mx-auto overflow-hidden select-none flex items-end justify-center",
        className
      )}
    >
      <Image
        src="/auth-skyline-blue.png"
        alt=""
        width={520}
        height={242}
        priority
        className="w-full h-auto"
      />
    </div>
  )
}
