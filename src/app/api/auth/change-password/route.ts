import { NextRequest } from "next/server"
import bcrypt from "bcryptjs"
import User from "@/lib/models/user-model"
import connectDB from "@/lib/db-config/mongoose"
import { withAuth } from "@/lib/auth/guards"
import { invalidateAllUserSessions } from "@/lib/auth/sessions"
import { errorResponse, successResponse } from "@/lib/helpers/response-helpers"

export const POST = withAuth(async (req: NextRequest, ctx: any) => {
  try {
    const { currentPassword, newPassword } = await req.json()

    if (!currentPassword || !newPassword) {
      return errorResponse({
        message: "Current and new password are required",
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

    const userId = ctx.user._id?.toString() || ctx.user.id
    const user = await User.findById(userId).select("+password")
    if (!user) {
      return errorResponse({
        message: "User not found",
        status: 404,
      })
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password)
    if (!isMatch) {
      return errorResponse({
        message: "Current password is incorrect",
        status: 403,
      })
    }

    user.password = await bcrypt.hash(newPassword, 10)
    await user.save()

    await invalidateAllUserSessions(userId, ctx.sessionId)

    return successResponse({
      data: null,
      message: "Password changed successfully",
    })
  } catch (error: any) {
    return errorResponse({
      message: error.message || "Something went wrong",
      status: 500,
    })
  }
})
