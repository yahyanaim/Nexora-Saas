import { z } from "zod"
import { TransactionStatus, TransactionMethod } from "@/types/transactions"

export const transactionFormSchema = z.object({
  user: z.string().min(1, "User is required"),
  amount: z.string().min(1, "Amount is required"),
  method: z.nativeEnum(TransactionMethod),
  status: z.nativeEnum(TransactionStatus),
  description: z.string().optional(),
  reference: z.string().optional(),
})

export type TransactionFormValues = z.infer<typeof transactionFormSchema>

export function getTransactionFormSchema(_mode: "create" | "edit") {
  return transactionFormSchema
}
