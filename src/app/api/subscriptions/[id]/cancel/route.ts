import { NextRequest } from "next/server"
import Subscription from "@/lib/models/subscription-model"
import connectDB from "@/lib/db-config/mongoose"
import { withAuth } from "@/lib/auth/guards"
import { UserType } from "@/types/users"
import { SubscriptionStatus } from "@/types/subscriptions"
import { AdminPermissionsPlatform } from "@/types/roles"
import { errorResponse, successResponse } from "@/lib/helpers/response-helpers"
import { isValidObjectId } from "@/lib/helpers/mongoose-helpers"

// POST /api/subscriptions/[id]/cancel - Cancel subscription
export const POST = withAuth(
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

    if (subscription.status === SubscriptionStatus.CANCELED) {
      return errorResponse({
        message: "Subscription is already canceled",
        status: 400,
      })
    }

    subscription.status = SubscriptionStatus.CANCELED
    subscription.nextBilling = null
    await subscription.save()

    return successResponse({
      data: {
        id: subscription._id.toString(),
        status: subscription.status,
      },
      message: "Subscription canceled successfully",
    })
  },
  {
    allowedTypes: [UserType.ADMIN],
    requiredPermissions: [AdminPermissionsPlatform.SUBSCRIPTIONS_UPDATE],
  }
)
