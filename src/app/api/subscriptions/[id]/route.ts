// app/api/subscriptions/[id]/route.ts

import { NextRequest } from "next/server"
import connectDB from "@/lib/db-config/mongoose"
import { withAuth } from "@/lib/auth/guards"
import { UserType } from "@/types/users"
import { SubscriptionStatus } from "@/types/subscriptions"
import { AdminPermissionsPlatform } from "@/types/roles"
import {
  errorResponse,
  formatDocument,
  successResponse,
} from "@/lib/helpers/response-helpers"
import { isValidObjectId } from "@/lib/helpers/mongoose-helpers"
import Subscription from "@/lib/models/subscription-model"

// GET /api/subscriptions/[id] - Get single subscription
export const GET = withAuth(
  async (req: NextRequest, ctx: any) => {
    const params = await ctx.params
    const id = params.id

    if (!isValidObjectId(id)) {
      return errorResponse({
        message: "Invalid subscription ID",
        status: 400,
      })
    }

    await connectDB()

    const subscription: any = await Subscription.findById(id)
      .populate("user", "name email avatar")
      .populate("plan", "name price period")
      .lean()
      .exec()

    if (!subscription) {
      return errorResponse({
        message: "Subscription not found",
        status: 404,
      })
    }

    // Format the subscription
    const formattedSubscription = {
      id: subscription._id.toString(),
      name: subscription.name,
      description: subscription.description,
      price: subscription.price,
      period: subscription.period,
      status: subscription.status,
      features: subscription.features,
      user: subscription?.user
        ? {
            id: subscription?.user?._id.toString(),
            name: subscription?.user?.name,
            email: subscription?.user?.email,
            avatar: subscription?.user?.avatar,
          }
        : null,
      plan: subscription?.plan
        ? {
            id: subscription?.plan?._id.toString(),
            name: subscription?.plan?.name,
            price: subscription?.plan?.price,
            period: subscription?.plan?.period,
          }
        : null,
      nextBilling: subscription.nextBilling,
      billingCycle: subscription.billingCycle,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    }

    return successResponse({
      data: formattedSubscription,
      message: "Subscription fetched successfully",
    })
  },
  {
    allowedTypes: [UserType.ADMIN, UserType.STAFF],
    requiredPermissions: [AdminPermissionsPlatform.SUBSCRIPTIONS_READ],
  }
)

// PATCH /api/subscriptions/[id] - Update subscription
export const PATCH = withAuth(
  async (req: NextRequest, ctx: any) => {
    const params = await ctx.params
    const id = params.id

    if (!isValidObjectId(id)) {
      return errorResponse({
        message: "Invalid subscription ID",
        status: 400,
      })
    }

    const body = await req.json()
    const {
      name,
      description,
      price,
      period,
      status,
      features,
      user,
      plan,
      nextBilling,
      billingCycle,
    } = body

    await connectDB()

    const subscription = await Subscription.findById(id)
    if (!subscription) {
      return errorResponse({
        message: "Subscription not found",
        status: 404,
      })
    }

    if (name !== undefined) subscription.name = name.trim()
    if (description !== undefined) subscription.description = description
    if (price !== undefined) subscription.price = price
    if (period !== undefined) subscription.period = period
    if (status !== undefined) {
      if (!Object.values(SubscriptionStatus).includes(status)) {
        return errorResponse({
          message: `Invalid status. Must be: ${Object.values(SubscriptionStatus).join(", ")}`,
          status: 400,
        })
      }
      subscription.status = status
    }
    if (features !== undefined) {
      if (!Array.isArray(features) || features.length === 0) {
        return errorResponse({
          message: "At least one feature is required",
          status: 400,
        })
      }
      subscription.features = features.filter((f: string) => f.trim() !== "")
    }
    if (user !== undefined) subscription.user = user
    if (plan !== undefined) subscription.plan = plan
    if (nextBilling !== undefined) subscription.nextBilling = nextBilling
    if (billingCycle !== undefined) subscription.billingCycle = billingCycle

    await subscription.save()

    const formattedSubscription = formatDocument(subscription)

    return successResponse({
      data: formattedSubscription,
      message: "Subscription updated successfully",
    })
  },
  {
    allowedTypes: [UserType.ADMIN],
    requiredPermissions: [AdminPermissionsPlatform.SUBSCRIPTIONS_UPDATE],
  }
)

// DELETE /api/subscriptions/[id] - Delete subscription
export const DELETE = withAuth(
  async (req: NextRequest, ctx: any) => {
    const params = await ctx.params
    const id = params.id

    if (!isValidObjectId(id)) {
      return errorResponse({
        message: "Invalid subscription ID",
        status: 400,
      })
    }

    await connectDB()

    const subscription = await Subscription.findById(id)
    if (!subscription) {
      return errorResponse({
        message: "Subscription not found",
        status: 404,
      })
    }

    await Subscription.findByIdAndDelete(id)

    return successResponse({
      data: null,
      message: "Subscription deleted successfully",
    })
  },
  {
    allowedTypes: [UserType.ADMIN],
    requiredPermissions: [AdminPermissionsPlatform.SUBSCRIPTIONS_DELETE],
  }
)
