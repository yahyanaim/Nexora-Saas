import { NextRequest } from "next/server"
import connectDB from "@/lib/db-config/mongoose"
import { withAuth } from "@/lib/auth/guards"
import { UserType } from "@/types/users"
import { AdminPermissionsPlatform } from "@/types/roles"
import { SubscriptionStatus } from "@/types/subscriptions"
import { errorResponse, successResponse } from "@/lib/helpers/response-helpers"
import Subscription from "@/lib/models/subscription-model"

export const GET = withAuth(
  async (req: NextRequest) => {
    try {
      await connectDB()

      const subscriptions = await Subscription.find()
        .populate("plan", "price period name")
        .lean()
        .exec()

      let totalRevenue = 0
      let active = 0
      let inactive = 0
      let pending = 0
      let expired = 0
      let canceled = 0

      subscriptions.forEach((sub: any) => {
        switch (sub.status) {
          case SubscriptionStatus.ACTIVE:
            active += 1

            const price = sub.plan?.price || parseFloat(sub.price) || 0
            totalRevenue += Number(price) // Ensure it's a number
            break
          case SubscriptionStatus.INACTIVE:
            inactive += 1
            break
          case SubscriptionStatus.EXPIRED:
            expired += 1
            break
          case SubscriptionStatus.CANCELED:
            canceled += 1
            break
          case SubscriptionStatus.PAST_DUE:
            pending += 1
            break
          default:
            break
        }
      })

      const summary = {
        totalRevenue: Number(totalRevenue.toFixed(2)), // Ensure it's a number with 2 decimals
        totalSubscriptions: subscriptions.length,
        active,
        inactive,
        pending,
        expired,
        canceled,
        activePercentage:
          subscriptions.length > 0
            ? Math.round((active / subscriptions.length) * 100)
            : 0,
        revenueGrowth: 12.5,
      }

      return successResponse({
        data: summary,
        message: "Summary fetched successfully",
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
