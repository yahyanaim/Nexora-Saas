// app/api/plans/route.ts

import { NextRequest } from "next/server"
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
import Plan from "@/lib/models/plan-model"

// GET /api/plans - List plans
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
          model: Plan,
          allowedSearchFields: ["name", "description"],
          allowedFilterFields: ["featured"],
          notIncludeFields: ["__v"],
          sort: { createdAt: -1 },
          cleanResponse: true,
        },
      })

      const formattedPlans = formatDocuments(result.items)

      return successPaginatedResponse({
        data: formattedPlans,
        pagination: result.pagination,
        message: "Plans fetched successfully",
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
    requiredPermissions: [AdminPermissionsPlatform.PLANS_READ],
  }
)

// POST /api/plans - Create plan
export const POST = withAuth(
  async (req: NextRequest) => {
    try {
      const body = await req.json()
      const { name, price, period, description, featured, features } = body

      if (!name || !price || !description) {
        return errorResponse({
          message: "Name, price and description are required",
          status: 400,
        })
      }

      if (!features || !Array.isArray(features) || features.length === 0) {
        return errorResponse({
          message: "At least one feature is required",
          status: 400,
        })
      }

      await connectDB()

      // Check if plan name already exists
      const existing = await Plan.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
      })

      if (existing) {
        return errorResponse({
          message: "Plan with this name already exists",
          status: 409,
        })
      }

      const plan = await Plan.create({
        name: name.trim(),
        price,
        period: period || null,
        description,
        featured: featured || false,
        features: features.filter((f: string) => f.trim() !== ""),
      })

      const formattedPlan = {
        id: plan._id.toString(),
        name: plan.name,
        price: plan.price,
        period: plan.period,
        description: plan.description,
        featured: plan.featured,
        features: plan.features,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
      }

      return successResponse({
        data: formattedPlan,
        status: 201,
        message: "Plan created successfully",
      })
    } catch (error: any) {
      if (error.code === 11000) {
        return errorResponse({
          message: "Plan name already exists",
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
    requiredPermissions: [AdminPermissionsPlatform.PLANS_CREATE],
  }
)
