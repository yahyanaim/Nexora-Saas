// app/api/transactions/[id]/route.ts

import { NextRequest } from "next/server"
import connectDB from "@/lib/db-config/mongoose"
import { withAuth } from "@/lib/auth/guards"
import { UserType } from "@/types/users"
import { TransactionStatus, TransactionMethod } from "@/types/transactions"
import { AdminPermissionsPlatform } from "@/types/roles"
import { errorResponse, successResponse } from "@/lib/helpers/response-helpers"
import { isValidObjectId } from "@/lib/helpers/mongoose-helpers"
import Transaction from "@/lib/models/transaction-model"
import { Types } from "mongoose"

// GET /api/transactions/[id] - Get single transaction
export const GET = withAuth(
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

    const transaction: any = await Transaction.findById(id)
      .populate("user", "name email avatar")
      .lean()
      .exec()

    if (!transaction) {
      return errorResponse({
        message: "Transaction not found",
        status: 404,
      })
    }

    const formattedTransaction = {
      id: transaction._id.toString(),
      transactionId: `#TX${transaction._id.toString().slice(-6)}`,
      user: transaction.user
        ? {
            id: transaction.user._id.toString(),
            name: transaction.user.name,
            email: transaction.user.email,
            avatar: transaction.user.avatar,
          }
        : null,
      amount: transaction.amount,
      method: transaction.method,
      status: transaction.status,
      date: transaction.createdAt,
      description: transaction.description,
      reference: transaction.reference,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    }

    return successResponse({
      data: formattedTransaction,
      message: "Transaction fetched successfully",
    })
  },
  {
    allowedTypes: [UserType.ADMIN, UserType.STAFF],
    requiredPermissions: [AdminPermissionsPlatform.TRANSACTIONS_READ],
  }
)

// PATCH /api/transactions/[id] - Update transaction
export const PATCH = withAuth(
  async (req: NextRequest, ctx: any) => {
    const params = await ctx.params
    const id = params.id

    if (!isValidObjectId(id)) {
      return errorResponse({
        message: "Invalid transaction ID",
        status: 400,
      })
    }

    const body = await req.json()
    const { user, amount, method, status, description, reference } = body

    await connectDB()

    const transaction = await Transaction.findById(id)
    if (!transaction) {
      return errorResponse({
        message: "Transaction not found",
        status: 404,
      })
    }

    if (amount !== undefined) {
      if (amount <= 0) {
        return errorResponse({
          message: "Amount must be greater than 0",
          status: 400,
        })
      }
      transaction.amount = amount
    }

    if (method !== undefined) {
      if (!Object.values(TransactionMethod).includes(method)) {
        return errorResponse({
          message: `Invalid method. Must be: ${Object.values(TransactionMethod).join(", ")}`,
          status: 400,
        })
      }
      transaction.method = method
    }

    if (status !== undefined) {
      if (!Object.values(TransactionStatus).includes(status)) {
        return errorResponse({
          message: `Invalid status. Must be: ${Object.values(TransactionStatus).join(", ")}`,
          status: 400,
        })
      }
      transaction.status = status
    }

    if (description !== undefined) transaction.description = description
    if (reference !== undefined) transaction.reference = reference
    if (user !== undefined) transaction.user = new Types.ObjectId(user)

    await transaction.save()

    const populatedTransaction: any = await Transaction.findById(id)
      .populate("user", "name profileColor email avatar")
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
      message: "Transaction updated successfully",
    })
  },
  {
    allowedTypes: [UserType.ADMIN],
    requiredPermissions: [AdminPermissionsPlatform.TRANSACTIONS_UPDATE],
  }
)

// DELETE /api/transactions/[id] - Delete transaction
export const DELETE = withAuth(
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

    await Transaction.findByIdAndDelete(id)

    return successResponse({
      data: null,
      message: "Transaction deleted successfully",
    })
  },
  {
    allowedTypes: [UserType.ADMIN],
    requiredPermissions: [AdminPermissionsPlatform.TRANSACTIONS_DELETE],
  }
)
