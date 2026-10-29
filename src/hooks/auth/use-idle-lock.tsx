"use client"
import { useEffect, useRef } from "react"
import { LAST_ACTIVITY_KEY, idleAction } from "@/lib/auth/idle"

const EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"] as const

function readShared(): number {
  try {
    return Number(localStorage.getItem(LAST_ACTIVITY_KEY)) || 0
  } catch {
    return 0
  }
}

function writeShared(at: number) {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(at))
  } catch {
    // private mode: this tab still counts its own activity
  }
}

/**
 * Locks the screen (passcode set) or signs out after `minutes` without a key
 * press, click or scroll in any tab (D3). Off while `enabled` is false, e.g.
 * while the lock screen already shows.
 */
export function useIdleLock({ enabled, minutes, hasPasscode, onLock, onSignOut }: { enabled: boolean; minutes: number; hasPasscode: boolean; onLock: () => void; onSignOut: () => void }) {
  const handlers = useRef({ onLock, onSignOut })
  useEffect(() => {
    handlers.current = { onLock, onSignOut }
  })

  useEffect(() => {
    if (!enabled) return
    let last = Date.now()
    let written = 0
    let fired = false
    writeShared(last)
    const mark = () => {
      last = Date.now()
      if (last - written > 5_000) {
        written = last
        writeShared(last)
      }
    }
    const check = () => {
      if (fired) return
      const action = idleAction(Math.max(last, readShared()), Date.now(), minutes, hasPasscode)
      if (action === "none") return
      fired = true
      if (action === "lock") handlers.current.onLock()
      else handlers.current.onSignOut()
    }
    for (const e of EVENTS) window.addEventListener(e, mark, { passive: true })
    // a laptop waking from sleep checks at once instead of waiting for the next tick
    document.addEventListener("visibilitychange", check)
    const timer = window.setInterval(check, 15_000)
    return () => {
      for (const e of EVENTS) window.removeEventListener(e, mark)
      document.removeEventListener("visibilitychange", check)
      window.clearInterval(timer)
    }
  }, [enabled, minutes, hasPasscode])
}
