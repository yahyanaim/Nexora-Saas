import { toast as sonnerToast } from "sonner"

const SOUND_SRC = "/sounds/notification.mp3"

let audio: HTMLAudioElement | null = null

function getAudio() {
  if (typeof window === "undefined") return null
  if (!audio) {
    audio = new Audio(SOUND_SRC)
    audio.volume = 0.5
  }
  return audio
}

function playSound() {
  const a = getAudio()
  if (!a) return
  a.currentTime = 0
  a.play().catch(() => {})
}

type ToastFn = typeof sonnerToast

export const toast: ToastFn = new Proxy(sonnerToast, {
  apply(target, thisArg, args) {
    playSound()
    return Reflect.apply(target, thisArg, args)
  },
  get(target, prop, receiver) {
    const original = Reflect.get(target, prop, receiver)
    if (typeof original === "function") {
      return (...args: unknown[]) => {
        playSound()
        return original.apply(target, args)
      }
    }
    return original
  },
})
