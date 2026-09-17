"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "@/components/ui/carbon/icons"
import { CSSProperties } from "react"
import { useTranslations } from "next-intl"

interface DataTableEntityFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  createTitle: string
  editTitle: string
  description?: string
  isSubmitting?: boolean
  onSubmit: () => void
  children: React.ReactNode
  submitLabel?: string
  className?: string
  style?: CSSProperties
}

export function DataTableEntityFormDialog({
  open,
  onOpenChange,
  mode,
  createTitle,
  editTitle,
  description,
  isSubmitting,
  onSubmit,
  children,
  submitLabel,
  className,
  style,
}: DataTableEntityFormDialogProps) {
  const t = useTranslations()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={className} style={style}>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? createTitle : editTitle}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="p-4 py-3">{children}</div>

        <DialogFooter>
          <Button
            type="button"
            variant="destructive"
            className="flex-1"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            {t("cancel")}
          </Button>
          <Button
            variant={"primary"}
            className="flex-1"
            type="button"
            disabled={isSubmitting}
            onClick={onSubmit}
          >
            {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            {submitLabel ??
              (mode === "create" ? t("create") : t("saveChanges"))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
