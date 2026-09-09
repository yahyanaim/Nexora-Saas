import { NextRequest } from "next/server"
import Role from "@/lib/models/role-model"
import connectDB from "@/lib/db-config/mongoose"
import { withAuth } from "@/lib/auth/guards"
import { UserType } from "@/types/users"
import { AdminPermissionsPlatform } from "@/types/roles"
import {
  errorResponse,
  successResponse,
  successPaginatedResponse,
  formatDocuments,
} from "@/lib/helpers/response-helpers"
import { aggregateQuery, QueryDto } from "@/lib/data-access/aggregate-query"

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

      const result = await aggregateQuery({
        query,
        options: {
          model: Role,
          allowedSearchFields: ["name"],
          allowedFilterFields: ["status"],
          sort: { createdAt: -1 },
          cleanResponse: true,
          pipelines: [],
        },
      })

      const formattedRoles = formatDocuments(result.items)

      return successPaginatedResponse({
        data: formattedRoles,
        pagination: result.pagination,
        message: "Roles fetched successfully",
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

export const POST = withAuth(
  async (req: NextRequest) => {
    try {
      const body = await req.json()
      const { name, permissions, status } = body

      if (!name || typeof name !== "string" || name.trim().length < 2) {
        return errorResponse({
          message: "Role name is required (min 2 chars)",
          status: 400,
        })
      }

      if (permissions !== undefined) {
        if (!Array.isArray(permissions)) {
          return errorResponse({
            message: "Permissions must be an array",
            status: 400,
          })
        }
        const validPerms = Object.values(AdminPermissionsPlatform)
        const invalidPerms = permissions.filter((p) => !validPerms.includes(p))
        if (invalidPerms.length > 0) {
          return errorResponse({
            message: `Invalid permissions: ${invalidPerms.join(", ")}`,
            status: 400,
          })
        }
      }

      await connectDB()

      const existing = await Role.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
      })

      if (existing) {
        return errorResponse({
          message: "Role with this name already exists",
          status: 409,
        })
      }

      const role = await Role.create({
        name: name.trim(),
        permissions:
          permissions !== undefined
            ? permissions
            : Object.values(AdminPermissionsPlatform),
        status: status || undefined,
      })

      const formattedRole = {
        id: role._id.toString(),
        name: role.name,
        permissions: role.permissions,
        status: role.status,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      }

      return successResponse({
        data: formattedRole,
        status: 201,
        message: "Role created successfully",
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
    requiredPermissions: [AdminPermissionsPlatform.ROLES_CREATE],
  }
)
