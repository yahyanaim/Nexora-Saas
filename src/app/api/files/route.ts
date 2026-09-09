// app/api/files/route.ts

import { NextRequest } from "next/server"
import connectDB from "@/lib/db-config/mongoose"
import { withAuth } from "@/lib/auth/guards"
import { UserType } from "@/types/users"
import { AdminPermissionsPlatform } from "@/types/roles"
import {
  errorResponse,
  successPaginatedResponse,
  formatDocuments,
} from "@/lib/helpers/response-helpers"
import { aggregateQuery, QueryDto } from "@/lib/data-access/aggregate-query"
import File from "@/lib/models/file-model"

// GET /api/files - List files
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
          model: File,
          allowedSearchFields: ["name", "extension"],
          allowedFilterFields: [
            "type",
            "visibility",
            "owner",
            "project",
            "starred",
          ],
          notIncludeFields: ["__v"],
          sort: { createdAt: -1 },
          cleanResponse: true,
          pipelines: [
            {
              $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
              },
            },
            {
              $unwind: {
                path: "$owner",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: "projects",
                localField: "project",
                foreignField: "_id",
                as: "project",
              },
            },
            {
              $unwind: {
                path: "$project",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $addFields: {
                owner: {
                  id: "$owner._id",
                  name: "$owner.name",
                  email: "$owner.email",
                  avatar: "$owner.avatar",
                },
                projectName: "$project.name",
              },
            },
            {
              $project: {
                project: 0,
              },
            },
          ],
        },
      })

      const formattedFiles = formatDocuments(result.items)

      return successPaginatedResponse({
        data: formattedFiles,
        pagination: result.pagination,
        message: "Files fetched successfully",
      })
    } catch (error: any) {
      return errorResponse({
        message: error.message || "Something went wrong",
        status: 500,
      })
    }
  },
  {
    allowedTypes: [UserType.ADMIN, UserType.STAFF, UserType.USER],
    requiredPermissions: [AdminPermissionsPlatform.FILES_READ],
  }
)
