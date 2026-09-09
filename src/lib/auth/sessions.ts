import { NextRequest } from "next/server"
import jwt from "jsonwebtoken"
import Session, { ISession } from "@/lib/models/session-model"
import User, { IUser } from "@/lib/models/user-model"
import { ActivationStatus } from "@/types/users"
import { SessionStatus } from "@/types/sessions"
import connectDB from "../db-config/mongoose"

const JWT_SECRET = process.env.JWT_SECRET!
const SESSION_EXPIRY_DAYS = 7

export interface TokenPayload {
  sessionId: string
  userId: string
  email: string
}

export function signToken(
  payload: Omit<TokenPayload, "sessionId"> & { sessionId?: string }
) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: `${SESSION_EXPIRY_DAYS}d` })
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload
}

export function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7)
  }
  return null
}

export async function createSession(userId: string, req: any) {
  // const ip =
  //   req.ip ?? req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown"
  const ip = "0.0.0.0"
  const userAgent = req.headers.get("user-agent") ?? "unknown"

  const expiresIn = new Date()
  expiresIn.setDate(expiresIn.getDate() + SESSION_EXPIRY_DAYS)

  return Session.create({
    user: userId,
    ip,
    userAgent,
    status: SessionStatus.ACTIVE,
    expiresIn,
    lastUsedAt: new Date(),
  })
}

export interface AuthContext {
  user: IUser
  session: ISession
  sessionId: string
}

export async function validateSession(req: NextRequest): Promise<AuthContext> {
  await connectDB()

  const token = extractToken(req)
  if (!token) {
    throw new Error("auth.invalidToken")
  }

  let payload: TokenPayload
  try {
    payload = verifyToken(token)
  } catch {
    throw new Error("auth.expireToken")
  }

  const session = await Session.findOne({
    _id: payload.sessionId,
    user: payload.userId,
    status: SessionStatus.ACTIVE,
    expiresIn: { $gt: new Date() },
  })

  if (!session) {
    throw new Error("auth.sessionNotFound")
  }

  session.lastUsedAt = new Date()
  await session.save()

  const user = await User.findById(payload.userId)
    .select("+email")
    .populate("roles")

  if (!user) {
    throw new Error("auth.userNotFound")
  }

  return {
    user,
    session,
    sessionId: session._id.toString(),
  }
}

export async function invalidateSession(sessionId: string) {
  await Session.findByIdAndUpdate(sessionId, {
    status: ActivationStatus.INACTIVE,
  })
}

export async function invalidateAllUserSessions(
  userId: string,
  exceptSessionId?: string
) {
  const query: any = { user: userId, status: ActivationStatus.ACTIVE }
  if (exceptSessionId) query._id = { $ne: exceptSessionId }
  await Session.updateMany(query, { status: ActivationStatus.INACTIVE })
}
