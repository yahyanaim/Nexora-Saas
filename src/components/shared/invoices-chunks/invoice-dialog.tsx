"use client"

import { Invoice } from "@/types/invoices"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { InvoicePreview } from "./invoice-preview"
import { useTranslations } from "next-intl"
import { Download, Send } from "@/components/ui/carbon/icons"
import { Button } from "@/components/ui/button"

interface InvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: Invoice | null
  onDownload?: (invoice: Invoice) => void
  onSend?: (invoice: Invoice) => void
}

export function InvoiceDialog({
  open,
  onOpenChange,
  invoice,
  onDownload,
  onSend,
}: InvoiceDialogProps) {
  const t = useTranslations()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("invoicePreview")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("invoicePreviewDescription")}
          </DialogDescription>
        </DialogHeader>
        {invoice ? (
          <InvoicePreview invoice={invoice} />
        ) : (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            {t("loading")}
          </div>
        )}
        {invoice && (
          <DialogFooter>
            <Button
              className="flex-1"
              onClick={() => onDownload?.(invoice)}
              variant="outline"
            >
              <Download className="mr-2 h-4 w-4" />
              {t("downloadPDF")}
            </Button>
            <Button
              variant={"primary"}
              className="flex-1"
              onClick={() => onSend?.(invoice)}
            >
              <Send className="mr-2 h-4 w-4" />
              {t("sendInvoice")}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
