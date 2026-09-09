// lib/db-config/mongoose.ts

import mongoose from "mongoose"

const MONGODB_URI = process.env.MONGODB_URI as string

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable in .env.local"
  )
}

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
  isConnecting: boolean
  lastError: Error | null
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined
}

const cached: MongooseCache = global.mongooseCache ?? {
  conn: null,
  promise: null,
  isConnecting: false,
  lastError: null,
}

if (!global.mongooseCache) {
  global.mongooseCache = cached
}

// Helper to import models
async function importModels() {
  try {
    await import("@/lib/models/content-report-model")
    await import("@/lib/models/file-model")
    await import("@/lib/models/invoice-model")
    await import("@/lib/models/otp-model")
    await import("@/lib/models/plan-model")
    await import("@/lib/models/project-model")
    await import("@/lib/models/role-model")
    await import("@/lib/models/session-model")
    await import("@/lib/models/subscription-model")
    await import("@/lib/models/system-issue-model")
    await import("@/lib/models/transaction-model")
    await import("@/lib/models/user-model")
    console.log("Models imported successfully")
  } catch (error) {
    console.error("Error importing models:", error)
    throw error
  }
}

async function connectDB(): Promise<typeof mongoose> {
  // Return cached connection if exists
  if (cached.conn) {
    // Check if connection is still alive
    if (cached.conn.connection.readyState === 1) {
      return cached.conn
    } else {
      // Connection lost, reset cache
      console.warn("Connection lost, reconnecting...")
      cached.conn = null
      cached.promise = null
      cached.isConnecting = false
    }
  }

  // Prevent multiple concurrent connections
  if (cached.isConnecting) {
    console.log("⏳ Connection in progress, waiting...")
    return cached.promise!
  }

  if (!cached.promise) {
    cached.isConnecting = true
    cached.lastError = null

    // Updated options (removed bufferMaxEntries)
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 10000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      family: 4,
      retryWrites: true,
      retryReads: true,
      serverSelectionTimeoutMS: 15000,
      heartbeatFrequencyMS: 10000,
    }

    console.log("🔄 Connecting to MongoDB...")

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then(async (mongooseInstance) => {
        console.log("MongoDB connected successfully")

        // Import all models
        await importModels()

        // Handle connection events
        mongooseInstance.connection.on("error", (err) => {
          console.error("MongoDB connection error:", err)
          cached.lastError = err
          cached.conn = null
          cached.promise = null
        })

        mongooseInstance.connection.on("disconnected", () => {
          console.warn("MongoDB disconnected")
          cached.conn = null
          cached.promise = null
        })

        mongooseInstance.connection.on("reconnected", () => {
          console.log("🔄 MongoDB reconnected")
        })

        cached.isConnecting = false
        cached.conn = mongooseInstance
        return mongooseInstance
      })
      .catch((err) => {
        console.error("MongoDB connection failed:", err)
        cached.lastError = err
        cached.promise = null
        cached.isConnecting = false
        throw err
      })
  }

  try {
    cached.conn = await cached.promise
  } catch (err) {
    cached.promise = null
    cached.isConnecting = false
    throw err
  }

  return cached.conn
}

// Health check function
export async function checkDbHealth(): Promise<{
  status: string
  readyState: number
}> {
  try {
    await connectDB()
    const state = cached.conn?.connection.readyState ?? 0
    const states = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    }
    return {
      status: states[state as keyof typeof states] || "unknown",
      readyState: state,
    }
  } catch (error) {
    return {
      status: "error",
      readyState: 0,
    }
  }
}

// Force reconnect function
export async function reconnectDB(): Promise<typeof mongoose> {
  console.log("🔄 Force reconnecting to MongoDB...")
  cached.conn = null
  cached.promise = null
  cached.isConnecting = false
  return connectDB()
}

// Pre-connect in production
if (process.env.NODE_ENV === "production") {
  console.log("🚀 Pre-connecting to MongoDB in production...")
  connectDB().catch((err) => {
    console.error("Pre-connection failed:", err)
  })
}

export default connectDB
