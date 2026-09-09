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
import { SubscriptionStatus } from "@/types/subscriptions"
import Subscription from "@/lib/models/subscription-model"
import { Types } from "mongoose"

// GET /api/subscriptions - List subscriptions
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
          model: Subscription,
          allowedSearchFields: ["name", "description"],
          allowedFilterFields: ["status", "plan", "user"],
          sort: { createdAt: -1 },
          cleanResponse: true,
          pipelines: [
            {
              $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "user",
              },
            },
            {
              $unwind: {
                path: "$user",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: "plans",
                localField: "plan",
                foreignField: "_id",
                as: "plan",
              },
            },
            {
              $unwind: {
                path: "$plan",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                name: 1,
                price: 1,
                period: 1,
                description: 1,
                status: 1,
                nextBilling: 1,
                billingCycle: 1,
                features: 1,
                user: {
                  id: "$user._id",
                  name: "$user.name",
                  email: "$user.email",
                  avatar: "$user.avatar",
                },
                plan: {
                  id: "$plan._id",
                  name: "$plan.name",
                  price: "$plan.price",
                  period: "$plan.period",
                },
              },
            },
          ],
        },
      })

      const formattedSubscriptions = formatDocuments(result.items)

      return successPaginatedResponse({
        data: formattedSubscriptions,
        pagination: result.pagination,
        message: "Subscriptions fetched successfully",
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
    requiredPermissions: [AdminPermissionsPlatform.SUBSCRIPTIONS_READ],
  }
)

// POST /api/subscriptions - Create subscription
export const POST = withAuth(
  async (req: NextRequest) => {
    try {
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

      if (!name || !price) {
        return errorResponse({
          message: "Name and price are required",
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

      const subscription: any = await Subscription.create({
        name: name.trim(),
        description: description || "",
        price,
        period: period || null,
        status: status || SubscriptionStatus.ACTIVE,
        features: features.filter((f: string) => f.trim() !== ""),
        user: new Types.ObjectId(user) || null,
        plan: new Types.ObjectId(plan) || null,
        nextBilling: nextBilling || null,
        billingCycle: billingCycle || null,
      })

      const formattedSubscription = {
        id: subscription?._id?.toString(),
        name: subscription?.name,
        description: subscription?.description,
        price: subscription?.price,
        period: subscription?.period,
        status: subscription?.status,
        features: subscription?.features,
        user: subscription?.user,
        plan: subscription?.plan,
        nextBilling: subscription?.nextBilling,
        billingCycle: subscription?.billingCycle,
        createdAt: subscription?.createdAt,
        updatedAt: subscription?.updatedAt,
      }

      return successResponse({
        data: formattedSubscription,
        status: 201,
        message: "Subscription created successfully",
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
    requiredPermissions: [AdminPermissionsPlatform.SUBSCRIPTIONS_CREATE],
  }
)
