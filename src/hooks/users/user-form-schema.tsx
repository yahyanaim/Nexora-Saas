import { z } from "zod"
import { UserStatus, UserType } from "@/types/users"

export const userFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be under 20 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    )
    .transform((val) => val.toLowerCase()),
  email: z.string().email("Enter a valid email"),
  password: z.string().optional(),
  userType: z.nativeEnum(UserType),
  status: z.nativeEnum(UserStatus),
  is2FA: z.boolean(),
  bio: z.string().max(300, "Bio must be under 300 characters").optional(),
  roles: z.array(z.string()).optional(),
})

export type UserFormValues = z.infer<typeof userFormSchema>

export function getUserFormSchema(mode: "create" | "edit") {
  return userFormSchema.superRefine((data, ctx) => {
    if (mode === "create" && (!data.password || data.password.length < 8)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Password must be at least 8 characters",
      })
    }
  })
}
