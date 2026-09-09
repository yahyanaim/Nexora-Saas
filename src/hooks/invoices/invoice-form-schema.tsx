import { z } from "zod"
import { InvoiceStatus, InvoiceMethod } from "@/types/invoices"

export const invoiceFormSchema = z.object({
  user: z.string().min(1, "Customer is required"),
  items: z
    .array(
      z.object({
        description: z.string().min(1, "Description is required"),
        quantity: z.number().min(1, "Quantity must be at least 1"),
        unitPrice: z.number().min(0, "Price must be 0 or greater"),
      })
    )
    .min(1, "At least one item is required"),
  status: z.nativeEnum(InvoiceStatus),
  method: z.nativeEnum(InvoiceMethod).optional(),
  taxRate: z.number().min(0).max(1).optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
})

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>

export function getInvoiceFormSchema(mode: "create" | "edit") {
  return invoiceFormSchema
}
