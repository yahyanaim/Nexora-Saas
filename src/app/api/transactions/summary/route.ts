// app/api/transactions/summary/route.ts

import { NextRequest } from "next/server"
import connectDB from "@/lib/db-config/mongoose"
import { withAuth } from "@/lib/auth/guards"
import { UserType } from "@/types/users"
import { AdminPermissionsPlatform } from "@/types/roles"
import { TransactionStatus } from "@/types/transactions"
import { errorResponse, successResponse } from "@/lib/helpers/response-helpers"
import Transaction from "@/lib/models/transaction-model"

export const GET = withAuth(
  async (req: NextRequest) => {
    try {
      await connectDB()

      const transactions = await Transaction.find().lean().exec()

      let totalRevenue = 0
      let successful = 0
      let pending = 0
      let failed = 0

      transactions.forEach((txn) => {
        if (txn.status === TransactionStatus.PAID) {
          totalRevenue += txn.amount
          successful += txn.amount
        } else if (txn.status === TransactionStatus.PENDING) {
          pending += txn.amount
        } else if (txn.status === TransactionStatus.FAILED) {
          failed += txn.amount
        }
      })

      const summary = {
        totalRevenue,
        successful,
        pending,
        failed,
        totalTransactions: transactions.length,
        successRate:
          transactions.length > 0
            ? Math.round(
                (transactions.filter((t) => t.status === TransactionStatus.PAID)
                  .length /
                  transactions.length) *
                  100
              )
            : 0,
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
    requiredPermissions: [AdminPermissionsPlatform.TRANSACTIONS_READ],
  }
)
