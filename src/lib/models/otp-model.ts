import { OtpPurpose } from "@/types/auth"
import mongoose, { Schema, Document, Model } from "mongoose"

export interface IOtp extends Document {
  userId: string
  code: string
  expiresAt: Date
  purpose: OtpPurpose
  attempts: number
  createdAt: Date
}

const OtpSchema = new Schema<IOtp>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    purpose: {
      type: String,
      enum: Object.values(OtpPurpose),
      default: OtpPurpose.ACCOUNT_VERIFICATION,
    },
  },
  {
    timestamps: true,
    expireAfterSeconds: 300, // TTL: auto-delete after 5 minutes
  }
)

OtpSchema.index({ userId: 1, createdAt: -1 })

const Otp: Model<IOtp> =
  mongoose.models.Otp || mongoose.model<IOtp>("Otp", OtpSchema)

export default Otp
