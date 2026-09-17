import { FieldGroup } from "@/components/ui/field"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { TwoStepDialog } from "./two-step-dialog"
import { PasscodeDialog } from "./passcode-dialog"
import { ChangePasswordDialog } from "./change-password-dialog"
import { Button } from "@/components/ui/button"
import { KeyRound, Lock, ShieldCheck } from "@/components/ui/carbon/icons"

export const Security = () => {
  const t = useTranslations()
  const [activeDialog, setActiveDialog] = useState<
    "two-step" | "passcode" | "change-password" | null
  >(null)

  return (
    <>
      <FieldGroup className="space-y-3">
        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center">
            <span className="md:text-md bg-background/50 px-2 text-sm text-muted-foreground backdrop-blur-sm">
              {t("security")}
            </span>
          </div>
        </div>

        <div className="grid gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="justify-start border-white/10 bg-background/50 hover:bg-background/80"
            onClick={() => setActiveDialog("change-password")}
          >
            <KeyRound className="mr-2 size-4" />
            {t("changePassword")}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="justify-start border-white/10 bg-background/50 hover:bg-background/80"
            onClick={() => setActiveDialog("passcode")}
          >
            <Lock className="mr-2 size-4" />
            {t("passcodeLock")}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="justify-start border-white/10 bg-background/50 hover:bg-background/80"
            onClick={() => setActiveDialog("two-step")}
          >
            <ShieldCheck className="mr-2 size-4" />
            {t("twoStepVerification")}
          </Button>
        </div>
      </FieldGroup>

      {activeDialog === "two-step" && (
        <TwoStepDialog
          open={activeDialog === "two-step"}
          onOpenChange={(open) => !open && setActiveDialog(null)}
        />
      )}
      {activeDialog === "passcode" && (
        <PasscodeDialog
          open={activeDialog === "passcode"}
          onOpenChange={(open) => !open && setActiveDialog(null)}
        />
      )}
      {activeDialog === "change-password" && (
        <ChangePasswordDialog
          open={activeDialog === "change-password"}
          onOpenChange={(open) => !open && setActiveDialog(null)}
        />
      )}
    </>
  )
}
