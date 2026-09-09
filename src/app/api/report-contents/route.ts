// app/api/report-contents/route.ts

import { NextRequest } from "next/server"
import connectDB from "@/lib/db-config/mongoose"
import { withAuth } from "@/lib/auth/guards"
import { UserType } from "@/types/users"
import { AdminPermissionsPlatform } from "@/types/roles"
import {
  errorResponse,
  successPaginatedResponse,
} from "@/lib/helpers/response-helpers"
import { aggregateQuery, QueryDto } from "@/lib/data-access/aggregate-query"
import ContentReport from "@/lib/models/content-report-model"
import { formatDocuments } from "@/lib/helpers/response-helpers"

// GET /api/report-contents - List content reports
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
          : 20,
        search: searchParams.get("search") || undefined,
        sort: searchParams.get("sort")
          ? JSON.parse(searchParams.get("sort")!)
          : undefined,
        filter: JSON.parse(searchParams.get("filter") || "[]"),
      }

      const result = await aggregateQuery({
        query,
        options: {
          model: ContentReport,
          allowedSearchFields: ["reason", "description"],
          allowedFilterFields: ["status", "targetType"],
          notIncludeFields: ["__v"],
          sort: { createdAt: -1 },
          cleanResponse: true,
          pipelines: [
            {
              $lookup: {
                from: "users",
                localField: "reporter",
                foreignField: "_id",
                as: "reporterData",
              },
            },
            {
              $unwind: {
                path: "$reporterData",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "target",
                foreignField: "_id",
                as: "targetData",
              },
            },
            {
              $unwind: {
                path: "$targetData",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $addFields: {
                reporterName: "$reporterData.name",
                reporterAvatar: "$reporterData.avatar",
                targetName: "$targetData.name",
                targetAvatar: "$targetData.avatar",
              },
            },
            {
              $project: {
                reporterData: 0,
                targetData: 0,
              },
            },
          ],
        },
      })

      const formattedReports = formatDocuments(result.items)

      return successPaginatedResponse({
        data: formattedReports,
        pagination: result.pagination,
        message: "Reports fetched successfully",
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
    requiredPermissions: [AdminPermissionsPlatform.REPORTS_READ],
  }
)
