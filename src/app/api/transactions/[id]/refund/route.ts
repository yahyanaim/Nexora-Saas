// app/api/transactions/[id]/refund/route.ts

import { NextRequest } from "next/server"
import connectDB from "@/lib/db-config/mongoose"
import { withAuth } from "@/lib/auth/guards"
import { UserType } from "@/types/users"
import { TransactionStatus } from "@/types/transactions"
import { AdminPermissionsPlatform } from "@/types/roles"
import { errorResponse, successResponse } from "@/lib/helpers/response-helpers"
import { isValidObjectId } from "@/lib/helpers/mongoose-helpers"
import Transaction from "@/lib/models/transaction-model"

// POST /api/transactions/[id]/refund - Refund transaction
export const POST = withAuth(
  async (req: NextRequest, ctx: any) => {
    const params = await ctx.params
    const id = params.id

    if (!isValidObjectId(id)) {
      return errorResponse({
        message: "Invalid transaction ID",
        status: 400,
      })
    }

    await connectDB()

    const transaction = await Transaction.findById(id)
    if (!transaction) {
      return errorResponse({
        message: "Transaction not found",
        status: 404,
      })
    }

    if (transaction.status !== TransactionStatus.PAID) {
      return errorResponse({
        message: "Only paid transactions can be refunded",
        status: 400,
      })
    }

    transaction.status = TransactionStatus.REFUNDED
    await transaction.save()

    return successResponse({
      data: {
        id: transaction._id.toString(),
        status: transaction.status,
      },
      message: "Transaction refunded successfully",
    })
  },
  {
    allowedTypes: [UserType.ADMIN],
    requiredPermissions: [AdminPermissionsPlatform.TRANSACTIONS_UPDATE],
  }
)
