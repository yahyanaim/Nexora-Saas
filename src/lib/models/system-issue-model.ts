// lib/models/system-issue-model.ts

import mongoose, { Schema, Document, Model } from "mongoose"
import { IssueStatus, IssuePriority, IssueCategory } from "@/types/reports"

export interface ISystemIssue extends Document {
  title: string
  description: string
  category: IssueCategory
  priority: IssuePriority
  status: IssueStatus
  assignedTo?: mongoose.Types.ObjectId
  reportedBy: mongoose.Types.ObjectId
  resolvedAt?: Date
  resolutionNotes?: string
  createdAt: Date
  updatedAt: Date
}

const SystemIssueSchema = new Schema<ISystemIssue>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    category: {
      type: String,
      enum: Object.values(IssueCategory),
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(IssuePriority),
      default: IssuePriority.MEDIUM,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(IssueStatus),
      default: IssueStatus.OPEN,
      index: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    resolvedAt: { type: Date },
    resolutionNotes: { type: String },
  },
  { timestamps: true }
)

SystemIssueSchema.index({ status: 1, priority: 1 })
SystemIssueSchema.index({ category: 1, status: 1 })
SystemIssueSchema.index({ createdAt: -1 })

const SystemIssue: Model<ISystemIssue> =
  mongoose.models.SystemIssue ||
  mongoose.model<ISystemIssue>("SystemIssue", SystemIssueSchema)

export default SystemIssue
