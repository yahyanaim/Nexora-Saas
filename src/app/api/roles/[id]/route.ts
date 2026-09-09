// app/api/roles/[id]/route.ts

import { NextRequest } from "next/server"
import Role from "@/lib/models/role-model"
import User from "@/lib/models/user-model"
import connectDB from "@/lib/db-config/mongoose"
import { withAuth } from "@/lib/auth/guards"
import { ActivationStatus, UserType } from "@/types/users"
import { AdminPermissionsPlatform } from "@/types/roles"
import { errorResponse, successResponse } from "@/lib/helpers/response-helpers"
import { isValidObjectId } from "@/lib/helpers/mongoose-helpers"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const handler = withAuth(
    async () => {
      try {
        const { id } = await params

        if (!isValidObjectId(id)) {
          return errorResponse({
            message: "Invalid role ID",
            status: 400,
          })
        }

        await connectDB()

        const role = await Role.findById(id)
        if (!role) {
          return errorResponse({
            message: "Role not found",
            status: 404,
          })
        }

        return successResponse({
          data: role,
        })
      } catch (error: any) {
        return errorResponse({
          message: error.message || "Something went wrong",
          status: 500,
        })
      }
    },
    {
      allowedTypes: [UserType.ADMIN],
      requiredPermissions: [AdminPermissionsPlatform.ROLES_READ],
    }
  )

  return handler(req)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const handler = withAuth(
    async () => {
      try {
        const { id } = await params

        if (!isValidObjectId(id)) {
          return errorResponse({
            message: "Invalid role ID",
            status: 400,
          })
        }

        const body = await req.json()
        const { name, permissions, status } = body

        await connectDB()

        const role = await Role.findById(id)
        if (!role) {
          return errorResponse({
            message: "Role not found",
            status: 404,
          })
        }

        if (name !== undefined) {
          if (typeof name !== "string" || name.trim().length < 2) {
            return errorResponse({
              message: "Name must be at least 2 characters",
              status: 400,
            })
          }

          const duplicate = await Role.findOne({
            _id: { $ne: id },
            name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
          })

          if (duplicate) {
            return errorResponse({
              message: "Another role with this name already exists",
              status: 409,
            })
          }

          role.name = name.trim()
        }

        if (permissions !== undefined) {
          if (!Array.isArray(permissions)) {
            return errorResponse({
              message: "Permissions must be an array",
              status: 400,
            })
          }

          const validPerms = Object.values(AdminPermissionsPlatform)
          const invalidPerms = permissions.filter(
            (p) => !validPerms.includes(p)
          )
          if (invalidPerms.length > 0) {
            return errorResponse({
              message: `Invalid permissions: ${invalidPerms.join(", ")}`,
              status: 400,
            })
          }

          role.permissions = permissions
        }

        if (status !== undefined) {
          const validStatuses = Object.values(ActivationStatus)
          if (!validStatuses.includes(status)) {
            return errorResponse({
              message: `Invalid status. Must be: ${validStatuses.join(", ")}`,
              status: 400,
            })
          }
          role.status = status
        }

        await role.save()

        return successResponse({
          data: role,
          message: "Role updated successfully",
        })
      } catch (error: any) {
        if (error.code === 11000) {
          return errorResponse({
            message: "Role name already exists",
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
      requiredPermissions: [AdminPermissionsPlatform.ROLES_UPDATE],
    }
  )

  return handler(req)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const handler = withAuth(
    async () => {
      try {
        const { id } = await params

        if (!isValidObjectId(id)) {
          return errorResponse({
            message: "Invalid role ID",
            status: 400,
          })
        }

        await connectDB()

        const role = await Role.findById(id)
        if (!role) {
          return errorResponse({
            message: "Role not found",
            status: 404,
          })
        }

        const usersWithRole = await User.countDocuments({ roles: id })
        if (usersWithRole > 0) {
          return errorResponse({
            message: `Cannot delete role. It is assigned to ${usersWithRole} user(s). Remove it from users first.`,
            status: 409,
          })
        }

        await Role.findByIdAndDelete(id)

        return successResponse({
          data: null,
          message: "Role deleted successfully",
        })
      } catch (error: any) {
        return errorResponse({
          message: error.message || "Something went wrong",
          status: 500,
        })
      }
    },
    {
      allowedTypes: [UserType.ADMIN],
      requiredPermissions: [AdminPermissionsPlatform.ROLES_DELETE],
    }
  )

  return handler(req)
}
