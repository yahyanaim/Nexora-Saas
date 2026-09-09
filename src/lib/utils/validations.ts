import { z } from "zod"

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  dateOfBirth: z.string().optional(),
})

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  username: z.string().min(3).optional(),
  dateOfBirth: z.string().optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().optional(),
  cover: z.string().url().optional(),
  profileColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
})

export const verifyOTPSchema = z.object({
  email: z.string().email("Invalid email address"),
  code: z.string().length(6, "OTP must be 6 digits"),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
})

export const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
})

export const setPasscodeSchema = z.object({
  passcode: z.string().length(6, "Passcode must be 6 digits"),
})

export const verifyPasscodeSchema = z.object({
  passcode: z.string().length(6, "Passcode must be 6 digits"),
})
