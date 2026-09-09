// app/api/plans/[id]/route.ts

import { NextRequest } from "next/server"
import connectDB from "@/lib/db-config/mongoose"
import { withAuth } from "@/lib/auth/guards"
import { UserType } from "@/types/users"
import { AdminPermissionsPlatform } from "@/types/roles"
import {
  errorResponse,
  formatDocument,
  successResponse,
} from "@/lib/helpers/response-helpers"
import { isValidObjectId } from "@/lib/helpers/mongoose-helpers"
import Plan from "@/lib/models/plan-model"

// GET /api/plans/[id] - Get single plan
export const GET = withAuth(
  async (req: NextRequest, ctx: any) => {
    const params = await ctx.params
    const id = params.id

    if (!isValidObjectId(id)) {
      return errorResponse({
        message: "Invalid plan ID",
        status: 400,
      })
    }

    await connectDB()

    const plan = await Plan.findById(id).lean().exec()

    if (!plan) {
      return errorResponse({
        message: "Plan not found",
        status: 404,
      })
    }

    const formattedPlan = formatDocument(plan)

    return successResponse({
      data: formattedPlan,
      message: "Plan fetched successfully",
    })
  },
  {
    allowedTypes: [UserType.ADMIN],
    requiredPermissions: [AdminPermissionsPlatform.PLANS_READ],
  }
)

// PATCH /api/plans/[id] - Update plan
export const PATCH = withAuth(
  async (req: NextRequest, ctx: any) => {
    const params = await ctx.params
    const id = params.id

    if (!isValidObjectId(id)) {
      return errorResponse({
        message: "Invalid plan ID",
        status: 400,
      })
    }

    const body = await req.json()
    const { name, price, period, description, featured, features } = body

    await connectDB()

    const plan = await Plan.findById(id)
    if (!plan) {
      return errorResponse({
        message: "Plan not found",
        status: 404,
      })
    }

    if (name !== undefined) {
      if (name.trim().length === 0) {
        return errorResponse({
          message: "Name cannot be empty",
          status: 400,
        })
      }
      const existing = await Plan.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
      })
      if (existing) {
        return errorResponse({
          message: "Plan with this name already exists",
          status: 409,
        })
      }
      plan.name = name.trim()
    }

    if (price !== undefined) plan.price = price
    if (period !== undefined) plan.period = period
    if (description !== undefined) plan.description = description
    if (featured !== undefined) plan.featured = featured
    if (features !== undefined) {
      if (!Array.isArray(features) || features.length === 0) {
        return errorResponse({
          message: "At least one feature is required",
          status: 400,
        })
      }
      plan.features = features.filter((f: string) => f.trim() !== "")
    }

    await plan.save()

    const formattedPlan = formatDocument(plan)

    return successResponse({
      data: formattedPlan,
      message: "Plan updated successfully",
    })
  },
  {
    allowedTypes: [UserType.ADMIN],
    requiredPermissions: [AdminPermissionsPlatform.PLANS_UPDATE],
  }
)

// DELETE /api/plans/[id] - Delete plan
export const DELETE = withAuth(
  async (req: NextRequest, ctx: any) => {
    const params = await ctx.params
    const id = params.id

    if (!isValidObjectId(id)) {
      return errorResponse({
        message: "Invalid plan ID",
        status: 400,
      })
    }

    await connectDB()

    const plan = await Plan.findById(id)
    if (!plan) {
      return errorResponse({
        message: "Plan not found",
        status: 404,
      })
    }

    await Plan.findByIdAndDelete(id)

    return successResponse({
      data: null,
      message: "Plan deleted successfully",
    })
  },
  {
    allowedTypes: [UserType.ADMIN],
    requiredPermissions: [AdminPermissionsPlatform.PLANS_DELETE],
  }
)
