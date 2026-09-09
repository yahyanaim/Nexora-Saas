import { SessionStatus } from "@/types/sessions"
import mongoose, { Schema, Document, Model, Types } from "mongoose"

export interface ISession extends Document {
  user: Types.ObjectId
  ip: string
  userAgent: string
  location?: {
    country?: string
    city?: string
    lat?: number
    lon?: number
  }
  status: SessionStatus
  expiresIn: Date
  lastUsedAt: Date
  createdAt: Date
  updatedAt: Date
}

const SessionSchema = new Schema<ISession>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    ip: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
    },
    location: {
      country: String,
      city: String,
      lat: Number,
      lon: Number,
    },
    status: {
      type: String,
      enum: Object.values(SessionStatus),
      default: SessionStatus.ACTIVE,
      index: true,
    },
    expiresIn: {
      type: Date,
      required: true,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
)

SessionSchema.index({ user: 1, status: 1 })
SessionSchema.index({ expiresIn: 1 }, { expireAfterSeconds: 0 })

const Session: Model<ISession> =
  mongoose.models.Session || mongoose.model<ISession>("Session", SessionSchema)

export default Session
