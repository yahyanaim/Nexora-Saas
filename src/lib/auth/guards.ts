import { NextRequest, NextResponse } from "next/server"
import { UserType } from "@/types/users"
import { AuthContext, validateSession } from "./sessions"
import { formatResponse } from "../helpers/response-helpers"

export type RouteHandler = (
  req: NextRequest,
  ctx: AuthContext & { params?: any }
) => Promise<NextResponse> | NextResponse

export interface GuardOptions {
  requireAuth?: boolean
  allowedTypes?: UserType[]
  requiredPermissions?: string[]
  allowedStatuses?: string[]
  cleanResponse?: boolean
}

export function withAuth(handler: RouteHandler, options: GuardOptions = {}) {
  const {
    requireAuth = true,
    allowedTypes,
    requiredPermissions,
    allowedStatuses,
    cleanResponse: shouldClean = true,
  } = options

  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      let authCtx: AuthContext | null = null
      if (requireAuth) {
        authCtx = await validateSession(req)
      }

      if (allowedStatuses && authCtx) {
        if (!allowedStatuses.includes(authCtx.user.status)) {
          return NextResponse.json(
            {
              success: false,
              message: "Account status does not allow this action",
            },
            { status: 403 }
          )
        }
      }

      if (allowedTypes && authCtx) {
        if (!allowedTypes.includes(authCtx.user.userType)) {
          return NextResponse.json(
            { success: false, message: "auth.noPermissions" },
            { status: 403 }
          )
        }
      }

      if (requiredPermissions?.length && authCtx) {
        if (authCtx.user.userType === UserType.ADMIN) {
        } else {
          const userWithRoles = await authCtx.user.populate("roles")
          const userPermissions: string[] =
            (userWithRoles.roles as any[])?.flatMap(
              (r) => r?.permissions ?? []
            ) ?? []

          const hasAll = requiredPermissions.every((p) =>
            userPermissions.includes(p)
          )
          if (!hasAll) {
            return NextResponse.json(
              { success: false, message: "auth.noPermissions" },
              { status: 403 }
            )
          }
        }
      }

      let params = context?.params

      if (params && typeof params.then === "function") {
        params = await params
      }

      const response = await handler(req, {
        ...authCtx!,
        params,
      })

      if (shouldClean && response && typeof response.json === "function") {
        try {
          const data = await response.clone().json()
          const cleanedData = formatResponse(data)
          return NextResponse.json(cleanedData, {
            status: response.status,
            headers: response.headers,
          })
        } catch {
          return response
        }
      }

      return response
    } catch (error: any) {
      const message = error.message || "Unauthorized"
      const status =
        message.includes("Token") || message.includes("session") ? 401 : 403

      return NextResponse.json({ success: false, message }, { status })
    }
  }
}

export async function middlewareAuth(req: NextRequest): Promise<
  | {
      success: true
      user: any
      sessionId: string
    }
  | {
      success: false
      response: NextResponse
    }
> {
  try {
    const authCtx = await validateSession(req)
    return {
      success: true,
      user: authCtx.user,
      sessionId: authCtx.sessionId,
    }
  } catch (error: any) {
    const response = NextResponse.json(
      { success: false, message: error.message || "Unauthorized" },
      { status: 401 }
    )
    return { success: false, response }
  }
}
