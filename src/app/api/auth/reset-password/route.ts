// app/api/auth/reset-password/route.ts

import { NextRequest } from "next/server"
import bcrypt from "bcryptjs"
import User from "@/lib/models/user-model"
import connectDB from "@/lib/db-config/mongoose"
import { hashResetToken } from "@/lib/auth/reset-token"
import { invalidateAllUserSessions } from "@/lib/auth/sessions"
import { errorResponse, successResponse } from "@/lib/helpers/response-helpers"

export async function POST(req: NextRequest) {
  try {
    const { resetToken, newPassword } = await req.json()

    if (!resetToken || !newPassword) {
      return errorResponse({
        message: "Reset token and new password are required",
        status: 400,
      })
    }

    if (newPassword.length < 6) {
      return errorResponse({
        message: "Password must be at least 6 characters",
        status: 400,
      })
    }

    await connectDB()

    const hashedToken = hashResetToken(resetToken)

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpiry: { $gt: new Date() },
    }).select("+password +passwordResetToken +passwordResetExpiry")

    if (!user) {
      return errorResponse({
        message: "Invalid or expired reset token",
        status: 403,
      })
    }

    user.password = await bcrypt.hash(newPassword, 10)
    user.passwordResetToken = undefined
    user.passwordResetExpiry = undefined
    await user.save()

    await invalidateAllUserSessions(user._id.toString())

    return successResponse({
      data: null,
      message:
        "Password reset successfully. Please log in with your new password.",
    })
  } catch (error: any) {
    return errorResponse({
      message: error.message || "Something went wrong",
      status: 500,
    })
  }
}
