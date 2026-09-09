// app/api/change-my-profile/route.ts

import { NextRequest } from "next/server"
import bcrypt from "bcryptjs"
import User from "@/lib/models/user-model"
import connectDB from "@/lib/db-config/mongoose"
import { withAuth } from "@/lib/auth/guards"
import { errorResponse, successResponse } from "@/lib/helpers/response-helpers"
import { formatUserResponse } from "@/lib/helpers/user-helpers"
import { isValidObjectId } from "@/lib/helpers/mongoose-helpers"

// PATCH /api/change-my-profile - Update current user's profile
export const PATCH = withAuth(
  async (req: NextRequest, ctx: any) => {
    try {
      const body = await req.json()
      const {
        name,
        username,
        avatar,
        cover,
        profileColor,
        bio,
        dateOfBirth,
        is2FA,
        isPasscodeLocked,
        passcodeLock,
        password,
        currentPassword,
      } = body

      const userId = ctx.user.id

      if (!userId || !isValidObjectId(userId)) {
        return errorResponse({
          message: "User not authenticated",
          status: 403,
        })
      }

      await connectDB()

      // Find user
      const user = await User.findById(userId).select("+password +email")
      if (!user) {
        return errorResponse({
          message: "User not found",
          status: 404,
        })
      }

      // Update fields
      if (name !== undefined) user.name = name

      if (username !== undefined) {
        // Check if username is already taken
        const existing = await User.findOne({
          _id: { $ne: userId },
          username,
        })
        if (existing) {
          return errorResponse({
            message: "Username already taken",
            status: 409,
          })
        }
        user.username = username
      }

      if (avatar !== undefined) user.avatar = avatar
      if (cover !== undefined) user.cover = cover
      if (profileColor !== undefined) user.profileColor = profileColor
      if (bio !== undefined) user.bio = bio
      if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth
      if (is2FA !== undefined) user.is2FA = is2FA
      if (isPasscodeLocked !== undefined)
        user.isPasscodeLocked = isPasscodeLocked

      // Update passcode lock
      if (passcodeLock !== undefined) {
        if (passcodeLock.length < 4) {
          return errorResponse({
            message: "Passcode must be at least 4 characters",
            status: 400,
          })
        }
        user.passcodeLock = await bcrypt.hash(passcodeLock, 10)
        user.isPasscodeLocked = true
      }

      // Update password (requires current password)
      if (password) {
        if (password.length < 6) {
          return errorResponse({
            message: "New password must be at least 6 characters",
            status: 400,
          })
        }

        if (!currentPassword) {
          return errorResponse({
            message: "Current password is required to change password",
            status: 400,
          })
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password)
        if (!isMatch) {
          return errorResponse({
            message: "Current password is incorrect",
            status: 403,
          })
        }

        user.password = await bcrypt.hash(password, 10)
      }

      // Save user
      await user.save()

      // Get updated user with populated fields
      const updatedUser = await User.findById(userId)
        .select(
          "-password -passcodeLock -passwordResetToken -passwordResetExpiry"
        )
        .populate("roles")
        .lean()
        .exec()

      // Format response
      const formattedUser = formatUserResponse(updatedUser)

      return successResponse({
        data: formattedUser,
        message: "Profile updated successfully",
      })
    } catch (error: any) {
      console.error("Profile update error:", error)
      return errorResponse({
        message: error.message || "Something went wrong",
        status: 500,
      })
    }
  },
  { requireAuth: true }
)
