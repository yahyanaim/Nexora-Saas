import { useCallback, useRef } from "react"

export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)

  const play = useCallback(() => {
    // Try audio file first
    if (!audioRef.current) {
      audioRef.current = new Audio("/sounds/notification.mp3")
      audioRef.current.volume = 0.4
    }

    const playPromise = audioRef.current.play()
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Fallback: Web Audio API beep (browsers block audio without interaction)
        try {
            const AudioCtx =
              window.AudioContext ||
              (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
            if (AudioCtx) {
              ctxRef.current = new AudioCtx()
            }
          const ctx = ctxRef.current
          if (!ctx) return
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.frequency.value = 800
          gain.gain.value = 0.1
          osc.start()
          osc.stop(ctx.currentTime + 0.15)
        } catch {
          // Silent fail
        }
      })
    }
  }, [])

  return { play }
}
