"use client"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"

interface EntityFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  createTitle: string
  editTitle: string
  description?: string
  isSubmitting?: boolean
  onSubmit: () => void
  submitLabel?: {
    create?: string
    edit?: string
  }
  children: React.ReactNode
}

export function DataTableEntityFormSheet({
  open,
  onOpenChange,
  mode,
  createTitle,
  editTitle,
  description,
  isSubmitting,
  onSubmit,
  submitLabel,
  children,
}: EntityFormSheetProps) {
  const t = useTranslations()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        showCloseButton={false}
        className="flex flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>{mode === "create" ? createTitle : editTitle}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>

        <SheetFooter className="flex-row border-t">
          <Button
            variant="destructive"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {t("cancel")}
          </Button>
          <Button
            variant={"primary"}
            onClick={onSubmit}
            disabled={isSubmitting}
            className="flex-1 gap-2"
          >
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            {mode === "create"
              ? (submitLabel?.create ?? t("create"))
              : (submitLabel?.edit ?? t("saveChanges"))}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
