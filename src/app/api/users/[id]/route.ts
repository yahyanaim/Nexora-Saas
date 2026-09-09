import { NextRequest } from "next/server"
import bcrypt from "bcryptjs"
import User from "@/lib/models/user-model"
import Role from "@/lib/models/role-model"
import { UserStatus, UserType } from "@/types/users"
import { AdminPermissionsPlatform } from "@/types/roles"
import connectDB from "@/lib/db-config/mongoose"
import { withAuth } from "@/lib/auth/guards"
import { errorResponse, successResponse } from "@/lib/helpers/response-helpers"
import { canManageUser, formatUserResponse } from "@/lib/helpers/user-helpers"
import { isValidObjectId } from "@/lib/helpers/mongoose-helpers"

export const GET = withAuth(
  async (req: NextRequest, ctx: any) => {
    const params = await ctx.params
    const id = params.id

    if (!isValidObjectId(id)) {
      return errorResponse({
        message: "Invalid user ID",
        status: 400,
      })
    }

    if (!canManageUser(ctx.user, id)) {
      return errorResponse({
        message: "You can only view your own profile",
        status: 403,
      })
    }

    await connectDB()

    const user = await User.findById(id)
      .select("-password -passcodeLock -resetPasswordToken")
      .populate("roles")

    if (!user) {
      return errorResponse({
        message: "User not found",
        status: 404,
      })
    }

    return successResponse({
      data: formatUserResponse(user),
    })
  },
  { requireAuth: true }
)

export const PATCH = withAuth(
  async (req: NextRequest, ctx: any) => {
    const params = await ctx.params
    const id = params.id

    if (!isValidObjectId(id)) {
      return errorResponse({
        message: "Invalid user ID",
        status: 400,
      })
    }

    const isAdmin = ctx.user.userType === UserType.ADMIN
    const isSelf = ctx.user._id?.toString() === id || ctx.user.id === id

    if (!isAdmin && !isSelf) {
      return errorResponse({
        message: "You can only update your own profile",
        status: 403,
      })
    }

    const body = await req.json()
    await connectDB()

    const user = await User.findById(id).select("+password")
    if (!user) {
      return errorResponse({
        message: "User not found",
        status: 404,
      })
    }

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
    } = body

    if (name !== undefined) user.name = name
    if (username !== undefined) {
      const existing = await User.findOne({ _id: { $ne: id }, username })
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
    if (isPasscodeLocked !== undefined) user.isPasscodeLocked = isPasscodeLocked
    if (passcodeLock !== undefined) user.passcodeLock = passcodeLock

    if (password) {
      if (password.length < 6) {
        return errorResponse({
          message: "Password must be at least 6 characters",
          status: 400,
        })
      }
      user.password = await bcrypt.hash(password, 10)
    }

    if (isAdmin) {
      const { status, userType, roles } = body

      if (status !== undefined) {
        if (!Object.values(UserStatus).includes(status)) {
          return errorResponse({
            message: `Invalid status. Must be: ${Object.values(UserStatus).join(", ")}`,
            status: 400,
          })
        }
        user.status = status
      }

      if (userType !== undefined) {
        if (!Object.values(UserType).includes(userType)) {
          return errorResponse({
            message: `Invalid user type. Must be: ${Object.values(UserType).join(", ")}`,
            status: 400,
          })
        }
        user.userType = userType
      }

      if (roles !== undefined) {
        if (Array.isArray(roles)) {
          const validRoles = await Role.find({ _id: { $in: roles } })
          if (validRoles.length !== roles.length) {
            return errorResponse({
              message: "One or more roles are invalid",
              status: 400,
            })
          }
          user.roles = roles
        }
      }
    }

    await user.save()

    const updatedUser = await User.findById(id)
      .select("-password -passcodeLock -resetPasswordToken")
      .populate("roles")

    return successResponse({
      data: formatUserResponse(updatedUser),
      message: "User updated successfully",
    })
  },
  { requireAuth: true }
)

export const DELETE = withAuth(
  async (req: NextRequest, ctx: any) => {
    const params = await ctx.params
    const id = params.id

    if (!isValidObjectId(id)) {
      return errorResponse({
        message: "Invalid user ID",
        status: 400,
      })
    }

    const userId = ctx.user._id?.toString() || ctx.user.id
    if (userId === id) {
      return errorResponse({
        message: "You cannot delete your own account",
        status: 403,
      })
    }

    await connectDB()

    const user = await User.findById(id)
    if (!user) {
      return errorResponse({
        message: "User not found",
        status: 404,
      })
    }

    await User.findByIdAndDelete(id)

    return successResponse({
      data: null,
      message: "User deleted successfully",
    })
  },
  {
    allowedTypes: [UserType.ADMIN],
    requiredPermissions: [AdminPermissionsPlatform.USERS_DELETE],
  }
)
