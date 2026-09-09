// lib/models/transaction-model.ts

import mongoose, { Schema, Document, Model } from "mongoose"
import { TransactionStatus, TransactionMethod } from "@/types/transactions"

export interface ITransaction extends Document {
  user: mongoose.Types.ObjectId
  amount: number
  method: TransactionMethod
  status: TransactionStatus
  description?: string
  reference?: string
  createdAt: Date
  updatedAt: Date
}

const TransactionSchema = new Schema<ITransaction>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    method: {
      type: String,
      enum: Object.values(TransactionMethod),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      default: TransactionStatus.PENDING,
      index: true,
    },
    description: {
      type: String,
      default: "",
    },
    reference: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
)

TransactionSchema.index({ status: 1, method: 1 })
TransactionSchema.index({ createdAt: -1 })
TransactionSchema.index({ user: 1, createdAt: -1 })

const Transaction: Model<ITransaction> =
  mongoose.models.Transaction ||
  mongoose.model<ITransaction>("Transaction", TransactionSchema)

export default Transaction
