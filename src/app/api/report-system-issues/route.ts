// app/api/report-system-issues/route.ts

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
import SystemIssue from "@/lib/models/system-issue-model"
import { formatDocuments } from "@/lib/helpers/response-helpers"

// GET /api/report-system-issues - List system issues
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
          model: SystemIssue,
          allowedSearchFields: ["title", "description"],
          allowedFilterFields: ["status", "priority", "category"],
          notIncludeFields: ["__v"],
          sort: { createdAt: -1 },
          cleanResponse: true,
          pipelines: [
            {
              $lookup: {
                from: "users",
                localField: "reportedBy",
                foreignField: "_id",
                as: "reportedByData",
              },
            },
            {
              $unwind: {
                path: "$reportedByData",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "assignedTo",
                foreignField: "_id",
                as: "assignedToData",
              },
            },
            {
              $unwind: {
                path: "$assignedToData",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $addFields: {
                reportedByName: "$reportedByData.name",
                reportedByAvatar: "$reportedByData.avatar",
                assignedToName: "$assignedToData.name",
                assignedToAvatar: "$assignedToData.avatar",
              },
            },
            {
              $project: {
                reportedByData: 0,
                assignedToData: 0,
              },
            },
          ],
        },
      })

      const formattedIssues = formatDocuments(result.items)

      return successPaginatedResponse({
        data: formattedIssues,
        pagination: result.pagination,
        message: "System issues fetched successfully",
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
