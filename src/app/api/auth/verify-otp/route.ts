import { NextRequest } from "next/server"
import User from "@/lib/models/user-model"
import { UserStatus } from "@/types/users"
import connectDB from "@/lib/db-config/mongoose"
import { verifyOtp } from "@/lib/auth/otp"
import { generateResetToken } from "@/lib/auth/reset-token"
import { createSession, signToken } from "@/lib/auth/sessions"
import { errorResponse, successResponse } from "@/lib/helpers/response-helpers"
import { formatUserResponse } from "@/lib/helpers/user-helpers"
import { OtpPurpose } from "@/types/auth"

export async function POST(req: NextRequest) {
  try {
    const { otpId, otpCode } = await req.json()

    if (!otpId || !otpCode) {
      return errorResponse({
        message: "OTP ID and code are required",
        status: 400,
      })
    }

    await connectDB()

    const result = await verifyOtp(otpId, otpCode)
    if (!result) {
      return errorResponse({
        message: "Invalid or expired code",
        status: 403,
      })
    }

    const { userId, purpose } = result

    const user = await User.findById(userId).select(
      "+email +passwordResetToken +passwordResetExpiry"
    )
    if (!user) {
      return errorResponse({ message: "User not found", status: 404 })
    }

    // Password reset: no login, issue a one-time resetToken instead
    if (purpose === OtpPurpose.PASSWORD_RECOVERY) {
      const { rawToken, hashedToken, expiresAt } = generateResetToken()

      user.passwordResetToken = hashedToken
      user.passwordResetExpiry = expiresAt
      await user.save()

      return successResponse({
        data: { resetToken: rawToken },
        message: "Code verified",
      })
    }

    // Email verification: normal login
    let accountVerified = false
    if (user.status === UserStatus.NOT_VERIFIED) {
      user.status = UserStatus.ACTIVE
      accountVerified = true
      await user.save()
    }

    if (user.status !== UserStatus.ACTIVE) {
      return errorResponse({
        message: "Your account has been suspended",
        status: 403,
      })
    }

    const session = await createSession(user._id.toString(), req)
    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      sessionId: session._id.toString(),
    })

    const formattedUser = formatUserResponse(user)

    return successResponse({
      data: { user: formattedUser, token, accountVerified },
      message: accountVerified
        ? "Email verified and login successful"
        : "Verification successful",
    })
  } catch (error: any) {
    return errorResponse({
      message: error.message || "Something went wrong",
      status: 500,
    })
  }
}
