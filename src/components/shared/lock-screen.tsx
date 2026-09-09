"use client"

import { useEffect, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Delete } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLockScreenStore } from "@/store/auth/lock-screen-store"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { verifyPasscodeApi } from "@/lib/api/auth-apis"
import { GridPattern } from "@/components/ui/grid-pattern"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { useTranslations } from "next-intl"

const MIN_LENGTH = 4
const MAX_LENGTH = 4
const KEYPAD_DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"]

export function LockScreen() {
  const t = useTranslations()
  const { authedUser } = useAuthGuard()
  const { unlock } = useLockScreenStore()
  const [passcode, setPasscode] = useState("")
  const [error, setError] = useState(false)
  const [shakeKey, setShakeKey] = useState(0)

  const { mutate: verify, isPending } = useMutation({
    mutationFn: verifyPasscodeApi,
    onSuccess: () => unlock(),
    onError: () => {
      setError(true)
      setShakeKey((k) => k + 1)
      setPasscode("")
    },
  })

  const handleDigit = (digit: string) => {
    if (isPending || passcode.length >= MAX_LENGTH) return
    setError(false)

    const next = passcode + digit
    setPasscode(next)

    if (next.length >= MAX_LENGTH) {
      verify(next)
    }
  }

  const handleBackspace = () => {
    if (isPending) return
    setError(false)
    setPasscode((prev) => prev.slice(0, -1))
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault()
        handleDigit(e.key)
        return
      }

      if (e.key === "Backspace") {
        e.preventDefault()
        handleBackspace()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [passcode, isPending])

  return (
    <>
      <style jsx global>{`
        @keyframes shake {
          10%,
          90% {
            transform: translateX(-1px);
          }
          20%,
          80% {
            transform: translateX(2px);
          }
          30%,
          50%,
          70% {
            transform: translateX(-4px);
          }
          40%,
          60% {
            transform: translateX(4px);
          }
        }
        .shake-animation {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
      <div className="fixed top-0 left-0 h-full w-full">
        <div className="relative flex size-full items-center justify-center overflow-hidden border bg-background p-20 opacity-60">
          <GridPattern
            width={100}
            height={100}
            x={-1}
            y={-1}
            strokeDasharray={"4 2"}
            squares={[
              [0, 0],
              [4, 1],
              [2, 5],
              [3, 8],
              [5, 3],
              [6, 6],
              [7, 10],
              [12, 2],
              [14, 4],
              [15, 1],
              [16, 6],
              [18, 3],
              [18, 8],
              [20, 5],
              [22, 2],
              [22, 9],
              [25, 4],
              [25, 7],
              [28, 1],
              [28, 6],
            ]}
            className={cn(
              "[mask-image:radial-gradient(1500px_circle_at_center,white,transparent)]"
            )}
          />
        </div>
      </div>
      <div
        className={
          "fixed inset-0 z-100 flex flex-col items-center justify-center gap-8 px-6"
        }
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <SpaceAvatar
            name={authedUser?.name || ""}
            src={authedUser?.avatar}
            profileColor={authedUser?.profileColor}
            size="md"
          />
          <div>
            <h1 className="text-xl font-bold">
              {authedUser?.name
                ? t("welcomeBack", { name: authedUser.name })
                : t("appLocked")}
            </h1>
            <p className="text-muted-foreground">
              {t("enterPasscodeToContinue")}
            </p>
          </div>
        </div>

        {/* Dot indicator */}
        <div
          key={`dots-${shakeKey}`}
          dir="ltr"
          className={cn("flex items-center gap-3", error && "shake-animation")}
        >
          {Array.from({ length: Math.max(passcode.length, MIN_LENGTH) }).map(
            (_, i) => (
              <span
                key={i}
                className={cn(
                  "size-6 rounded-full border-2 border-muted-foreground/30 transition-colors",
                  i < passcode.length && "border-primary bg-primary",
                  error && "border-destructive bg-destructive"
                )}
              />
            )
          )}
        </div>

        {/* Keypad */}
        <div
          key={`keypad-${shakeKey}`}
          dir="ltr"
          className={cn("grid grid-cols-3 gap-4", error && "shake-animation")}
        >
          {KEYPAD_DIGITS.map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              disabled={isPending}
              className="flex size-16 items-center justify-center rounded-full bg-card text-xl font-medium transition-colors hover:bg-accent active:scale-95 disabled:opacity-50"
            >
              {t(digit)}
            </button>
          ))}
          <div />

          <button
            type="button"
            onClick={() => handleDigit("0")}
            disabled={isPending}
            className="flex size-16 items-center justify-center rounded-full bg-card text-xl font-medium transition-colors hover:bg-accent active:scale-95 disabled:opacity-50"
          >
            {t("0")}
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            disabled={isPending || passcode.length === 0}
            className="flex size-16 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent active:scale-95 disabled:opacity-30"
          >
            <Delete className="size-5" />
          </button>
        </div>
      </div>
    </>
  )
}
