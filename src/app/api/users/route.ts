import { NextRequest } from "next/server"
import bcrypt from "bcryptjs"
import User, { IUser } from "@/lib/models/user-model"
import Role from "@/lib/models/role-model"
import { UserStatus, UserType } from "@/types/users"
import { AdminPermissionsPlatform } from "@/types/roles"
import connectDB from "@/lib/db-config/mongoose"
import { withAuth } from "@/lib/auth/guards"
import { aggregateQuery, QueryDto } from "@/lib/data-access/aggregate-query"
import {
  errorResponse,
  successResponse,
  successPaginatedResponse,
} from "@/lib/helpers/response-helpers"
import { formatUserResponse } from "@/lib/helpers/user-helpers"

export const GET = withAuth(
  async (req: NextRequest) => {
    try {
      await connectDB()

      const { searchParams } = new URL(req.url)

      const query: QueryDto = {
        page: searchParams.get("page")
          ? parseInt(searchParams.get("page")!)
          : 0,
        pageSize: searchParams.get("pageSize")
          ? parseInt(searchParams.get("pageSize")!)
          : 10,
        search: searchParams.get("search") || undefined,
        sort: searchParams.get("sort")
          ? JSON.parse(searchParams.get("sort")!)
          : undefined,
        filter: JSON.parse(searchParams.get("filter") || "[]"),
      }

      const result = await aggregateQuery<IUser>({
        query,
        options: {
          model: User,
          allowedSearchFields: ["name", "email", "username"],
          allowedFilterFields: ["status", "userType", "roles"],
          notIncludeFields: ["password", "passcodeLock", "resetPasswordToken"],
          sort: { createdAt: -1 },
          cleanResponse: true,
          pipelines: [
            {
              $lookup: {
                from: "roles",
                localField: "roles",
                foreignField: "_id",
                as: "roles",
              },
            },
            {
              $addFields: {
                roles: {
                  $map: {
                    input: "$roles",
                    as: "role",
                    in: {
                      id: "$$role._id",
                      name: "$$role.name",
                      permissions: "$$role.permissions",
                      status: "$$role.status",
                      createdAt: "$$role.createdAt",
                      updatedAt: "$$role.updatedAt",
                    },
                  },
                },
              },
            },
          ],
        },
      })

      return successPaginatedResponse({
        data: result.items,
        pagination: result.pagination,
      })
    } catch (error: any) {
      return errorResponse({
        message: error.message || "Something went wrong",
        status: 500,
      })
    }
  },
  {
    allowedTypes: [UserType.ADMIN, UserType.STAFF],
    requiredPermissions: [AdminPermissionsPlatform.USERS_READ],
  }
)

export const POST = withAuth(
  async (req: NextRequest) => {
    try {
      const body = await req.json()
      const {
        name,
        email,
        password,
        username,
        userType = UserType.USER,
        status = UserStatus.ACTIVE,
        roles = [],
        dateOfBirth,
        bio,
      } = body

      if (!name || !email || !password) {
        return errorResponse({
          message: "Name, email and password are required",
          status: 400,
        })
      }

      if (password.length < 6) {
        return errorResponse({
          message: "Password must be at least 6 characters",
          status: 400,
        })
      }

      await connectDB()

      const existingEmail = await User.findOne({ email })
      if (existingEmail) {
        return errorResponse({
          message: "Email already registered",
          status: 409,
        })
      }

      if (username) {
        const existingUsername = await User.findOne({ username })
        if (existingUsername) {
          return errorResponse({
            message: "Username already taken",
            status: 409,
          })
        }
      }

      if (roles.length > 0) {
        const validRoles = await Role.find({ _id: { $in: roles } })
        if (validRoles.length !== roles.length) {
          return errorResponse({
            message: "One or more roles are invalid",
            status: 400,
          })
        }
      }

      const hashedPassword = await bcrypt.hash(password, 10)

      const user = await User.create({
        name,
        email,
        password: hashedPassword,
        username,
        userType,
        status,
        roles,
        dateOfBirth,
        bio,
        profileColor: "#FF6B6B", // Default profile color
      })

      const formattedUser = formatUserResponse(user)

      return successResponse({
        data: formattedUser,
        status: 201,
        message: "User created successfully",
      })
    } catch (error: any) {
      if (error.code === 11000) {
        const field = Object.keys(error.keyValue)[0]
        return errorResponse({
          message: `${field} already exists`,
          status: 409,
        })
      }
      return errorResponse({
        message: error.message || "Something went wrong",
        status: 500,
      })
    }
  },
  {
    allowedTypes: [UserType.ADMIN],
    requiredPermissions: [AdminPermissionsPlatform.USERS_CREATE],
  }
)
