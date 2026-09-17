"use client"

import { Mail } from "@/components/ui/carbon/icons"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useMutation } from "@tanstack/react-query"
import { changeProfileInfApi } from "@/lib/api/auth-apis"
import { Spinner } from "@/components/ui/spinner"
import { useTranslations } from "next-intl"

interface TwoStepDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TwoStepDialog({ open, onOpenChange }: TwoStepDialogProps) {
  const t = useTranslations()
  const { authedUser, updatedUser } = useAuthGuard()

  const is2FAMutation = useMutation({
    mutationFn: (is2FA: boolean) =>
      changeProfileInfApi({
        is2FA,
        name: authedUser?.name || "",
      }),
    onSuccess: (data) => {
      updatedUser(data)
      onOpenChange(false)
    },
  })

  const handleEnable = () => {
    is2FAMutation.mutate(true)
  }

  const handleDisable = () => {
    is2FAMutation.mutate(false)
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("twoStepVerification")}</DialogTitle>
          <DialogDescription>
            {t("twoStepVerificationDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 p-4 text-sm text-muted-foreground">
          <p>{t("twoStepVerificationInfo1")}</p>

          <div className="flex items-start gap-3 rounded-lg border bg-background p-3">
            <Mail className="mt-0.5 size-5 shrink-0 text-primary" />
            <p>{t("twoStepVerificationInfo2")}</p>
          </div>

          <p>{t("twoStepVerificationInfo3")}</p>

          <p className="text-xs">{t("twoStepVerificationInfo4")}</p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant={"destructive"}
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            {t("cancel")}
          </Button>
          {authedUser?.is2FA ? (
            <Button
              type="button"
              variant={"red"}
              className="flex-1"
              onClick={handleDisable}
              disabled={is2FAMutation.isPending}
            >
              {t("turnOff")}
            </Button>
          ) : (
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={is2FAMutation.isPending}
              onClick={handleEnable}
            >
              {is2FAMutation.isPending ? (
                <Spinner className="size-4" />
              ) : (
                t("enable")
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
