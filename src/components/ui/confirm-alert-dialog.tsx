"use client"

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"

interface ConfirmAlertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  isLoading?: boolean
  onConfirm: () => void
  destructive?: boolean
}

export function ConfirmAlertDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  isLoading,
  onConfirm,
  destructive = true,
}: ConfirmAlertDialogProps) {
  const t = useTranslations()

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant={"destructive"}
            disabled={isLoading}
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            {t("cancel")}
          </Button>
          <Button
            variant={destructive ? "red" : "primary"}
            disabled={isLoading}
            className="flex-1"
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
          >
            {isLoading ? t("pleaseWait") : (confirmLabel ?? t("confirm"))}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
