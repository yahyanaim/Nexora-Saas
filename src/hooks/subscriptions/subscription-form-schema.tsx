import { z } from "zod"
import { SubscriptionStatus } from "@/types/subscriptions"

export const getSubscriptionFormSchema = (_mode: "create" | "edit") =>
  z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    price: z.string().min(1, "Price is required"),
    period: z.string().optional().nullable(),
    status: z.nativeEnum(SubscriptionStatus),
    features: z
      .array(z.string().min(1))
      .min(1, "At least one feature is required"),
    user: z.string().min(1, "User is required"),
    plan: z.string().min(1, "Plan is required"),
  })

export type SubscriptionFormValues = z.infer<
  ReturnType<typeof getSubscriptionFormSchema>
>
