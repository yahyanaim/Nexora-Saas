// lib/models/content-report-model.ts

import mongoose, { Schema, Document, Model } from "mongoose"
import { ReportStatus, ReportType, ReportReason } from "@/types/reports"

export interface IContentReport extends Document {
  reporter: mongoose.Types.ObjectId
  target: mongoose.Types.ObjectId
  targetType: ReportType
  reason: ReportReason
  description?: string
  status: ReportStatus
  resolvedAt?: Date
  resolvedBy?: mongoose.Types.ObjectId
  resolutionNotes?: string
  actionTaken?: string
  createdAt: Date
  updatedAt: Date
}

const ContentReportSchema = new Schema<IContentReport>(
  {
    reporter: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    target: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: Object.values(ReportType),
      required: true,
      index: true,
    },
    reason: {
      type: String,
      enum: Object.values(ReportReason),
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: Object.values(ReportStatus),
      default: ReportStatus.PENDING,
      index: true,
    },
    resolvedAt: { type: Date },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    resolutionNotes: { type: String },
    actionTaken: { type: String },
  },
  { timestamps: true }
)

ContentReportSchema.index({ status: 1, targetType: 1 })
ContentReportSchema.index({ createdAt: -1 })

const ContentReport: Model<IContentReport> =
  mongoose.models.ContentReport ||
  mongoose.model<IContentReport>("ContentReport", ContentReportSchema)

export default ContentReport
