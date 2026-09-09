// app/api/transactions/route.ts

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
import { TransactionStatus, TransactionMethod } from "@/types/transactions"
import Transaction from "@/lib/models/transaction-model"
import { Types } from "mongoose"

// GET /api/transactions - List transactions
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
          model: Transaction,
          allowedSearchFields: ["transactionId", "description", "reference"],
          allowedFilterFields: ["status", "method", "user"],
          notIncludeFields: ["__v"],
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
              $addFields: {
                user: {
                  id: "$user._id",
                  name: "$user.name",
                  email: "$user.email",
                  avatar: "$user.avatar",
                },
                transactionId: {
                  $concat: ["#TX", { $toString: "$_id" }],
                },
              },
            },
          ],
        },
      })

      const formattedTransactions = formatDocuments(result.items)

      return successPaginatedResponse({
        data: formattedTransactions,
        pagination: result.pagination,
        message: "Transactions fetched successfully",
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

// POST /api/transactions - Create transaction
export const POST = withAuth(
  async (req: NextRequest) => {
    try {
      const body = await req.json()
      const { user, amount, method, status, description, reference } = body

      if (!user || !amount || !method) {
        return errorResponse({
          message: "User ID, amount and method are required",
          status: 400,
        })
      }

      if (amount <= 0) {
        return errorResponse({
          message: "Amount must be greater than 0",
          status: 400,
        })
      }

      if (!Object.values(TransactionMethod).includes(method)) {
        return errorResponse({
          message: `Invalid method. Must be: ${Object.values(TransactionMethod).join(", ")}`,
          status: 400,
        })
      }

      await connectDB()

      const transaction: any = await Transaction.create({
        user: new Types.ObjectId(user),
        amount,
        method,
        status: status || TransactionStatus.PENDING,
        description: description || "",
        reference: reference || "",
      })

      // Get populated transaction
      const populatedTransaction: any = await Transaction.findById(
        transaction._id
      )
        .populate("user", "name email profileColor avatar")
        .lean()
        .exec()

      const formattedTransaction = {
        id: populatedTransaction._id.toString(),
        transactionId: `#TX${populatedTransaction._id.toString().slice(-6)}`,
        user: populatedTransaction.user
          ? {
              id: populatedTransaction.user._id.toString(),
              name: populatedTransaction.user.name,
              email: populatedTransaction.user.email,
              avatar: populatedTransaction.user.avatar,
            }
          : null,
        amount: populatedTransaction.amount,
        method: populatedTransaction.method,
        status: populatedTransaction.status,
        date: populatedTransaction.createdAt,
        description: populatedTransaction.description,
        reference: populatedTransaction.reference,
        createdAt: populatedTransaction.createdAt,
        updatedAt: populatedTransaction.updatedAt,
      }

      return successResponse({
        data: formattedTransaction,
        status: 201,
        message: "Transaction created successfully",
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
    requiredPermissions: [AdminPermissionsPlatform.TRANSACTIONS_CREATE],
  }
)
