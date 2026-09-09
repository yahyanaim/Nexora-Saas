"use client"

import { useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { changeProfileInfApi } from "@/lib/api/auth-apis"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useTranslations } from "next-intl"

const PASSCODE_LENGTH = 4

const passcodeSchema = (t: (key: string) => string) =>
  z
    .object({
      passcode: z
        .string()
        .length(PASSCODE_LENGTH, t("passcodeLengthError"))
        .regex(/^\d+$/, t("passcodeDigitsOnly")),
      confirmPasscode: z
        .string()
        .length(PASSCODE_LENGTH, t("passcodeLengthError"))
        .regex(/^\d+$/, t("passcodeDigitsOnly")),
    })
    .refine((data) => data.passcode === data.confirmPasscode, {
      message: t("passcodesDoNotMatch"),
      path: ["confirmPasscode"],
    })

type PasscodeFormValues = z.infer<ReturnType<typeof passcodeSchema>>

interface PasscodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PasscodeDialog({ open, onOpenChange }: PasscodeDialogProps) {
  const t = useTranslations()
  const { authedUser, updatedUser, isPasscodeLocked } = useAuthGuard()

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasscodeFormValues>({
    resolver: zodResolver(passcodeSchema(t)),
    defaultValues: { passcode: "", confirmPasscode: "" },
  })

  useEffect(() => {
    if (!open) {
      reset()
    }
  }, [open, reset])

  const passcodeMutation = useMutation({
    mutationFn: (passcodeLock: string) =>
      changeProfileInfApi({
        passcodeLock,
        isPasscodeLocked: Boolean(passcodeLock),
        name: authedUser?.name || "",
      }),
    onSuccess: (data, passcodeLock) => {
      updatedUser(data)
      onOpenChange(false)
      if (Boolean(passcodeLock)) {
        localStorage.setItem("passcode", "yes")
      } else {
        localStorage.removeItem("passcode")
      }
    },
  })

  const onSubmit = (values: PasscodeFormValues) => {
    passcodeMutation.mutate(values.passcode)
  }

  const handleDisable = () => {
    passcodeMutation.mutate("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isPasscodeLocked ? t("changePasscode") : t("setPasscodeLock")}
          </DialogTitle>
          <DialogDescription>
            {isPasscodeLocked
              ? t("changePasscodeDescription")
              : t("setPasscodeLockDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="w-full space-y-5 p-4">
          <div className="w-full space-y-2">
            <Label htmlFor="passcode">
              {isPasscodeLocked ? t("newPasscode") : t("passcode")}
            </Label>
            <Controller
              name="passcode"
              control={control}
              render={({ field }) => (
                <InputOTP
                  id="passcode"
                  maxLength={PASSCODE_LENGTH}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={passcodeMutation.isPending}
                >
                  <InputOTPGroup className="w-full gap-2">
                    {Array.from({ length: PASSCODE_LENGTH }).map((_, i) => (
                      <InputOTPSlot
                        key={i}
                        index={i}
                        className="h-13 flex-1 rounded-md border bg-primary/20 text-2xl"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              )}
            />
            {errors.passcode && (
              <p className="text-xs text-destructive">
                {errors.passcode.message}
              </p>
            )}
          </div>

          <div className="w-full space-y-2">
            <Label htmlFor="confirmPasscode">{t("confirmPasscode")}</Label>
            <Controller
              name="confirmPasscode"
              control={control}
              render={({ field }) => (
                <InputOTP
                  id="confirmPasscode"
                  maxLength={PASSCODE_LENGTH}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={passcodeMutation.isPending}
                >
                  <InputOTPGroup className="w-full gap-2">
                    {Array.from({ length: PASSCODE_LENGTH }).map((_, i) => (
                      <InputOTPSlot
                        key={i}
                        index={i}
                        className="h-13 flex-1 rounded-md border bg-primary/20 text-2xl"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              )}
            />
            {errors.confirmPasscode && (
              <p className="text-xs text-destructive">
                {errors.confirmPasscode.message}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          {isPasscodeLocked && (
            <Button
              type="button"
              variant="red"
              className="flex-1"
              onClick={handleDisable}
              disabled={passcodeMutation.isPending}
            >
              {passcodeMutation.isPending ? (
                <Spinner className="size-4" />
              ) : (
                t("turnOff")
              )}
            </Button>
          )}
          <Button
            onClick={handleSubmit(onSubmit)}
            variant="primary"
            className="flex-1"
            disabled={passcodeMutation.isPending}
          >
            {passcodeMutation.isPending ? (
              <Spinner className="size-4" />
            ) : (
              t("save")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
