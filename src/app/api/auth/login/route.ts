// app/api/auth/login/route.ts

import { NextRequest } from "next/server"
import bcrypt from "bcryptjs"
import User from "@/lib/models/user-model"
import { UserStatus } from "@/types/users"
import connectDB from "@/lib/db-config/mongoose"
import { createOtp } from "@/lib/auth/otp"
import { createSession, signToken } from "@/lib/auth/sessions"
import { errorResponse, successResponse } from "@/lib/helpers/response-helpers"
import { formatUserResponse } from "@/lib/helpers/user-helpers"
import { OtpPurpose } from "@/types/auth"
import { sendMail } from "@/lib/auth/email"

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return errorResponse({
        message: "Email and password are required",
        status: 400,
      })
    }

    await connectDB()

    const user = await User.findOne({ email }).select("+password +email")
    if (!user || !user.password) {
      return errorResponse({
        message: "Invalid email or password",
        status: 403,
      })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return errorResponse({
        message: "Invalid email or password",
        status: 403,
      })
    }

    if (user.is2FA || user.status === UserStatus.NOT_VERIFIED) {
      const { otpCode, otpId } = await createOtp(
        user._id.toString(),
        OtpPurpose.ACCOUNT_VERIFICATION
      )
      await sendMail({
        to: email,
        subject: "Your 2FA Verification Code",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #333; text-align: center;">2FA Verification</h2>
            <p style="font-size: 16px; color: #555;">Hi ${user.name},</p>
            <p style="font-size: 16px; color: #555;">Enter the code below to complete your login:</p>
            <div style="text-align: center; padding: 20px; background: #f5f5f5; border-radius: 8px; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; color: #cb7e87; letter-spacing: 4px;">
                ${otpCode}
              </span>
            </div>
            <p style="font-size: 14px; color: #888;">This code expires in <strong>5 minutes</strong>.</p>
            <p style="font-size: 14px; color: #888;">If you didn't request this, please ignore this email.</p>
          </div>
        `,
      })
      return successResponse({
        data: {
          otpId,
          email,
          userId: user._id.toString(),
          requiresOTP: true,
          message: user.is2FA
            ? "Please enter the OTP sent to your email"
            : "Please verify your email with the OTP sent",
        },
      })
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

    user.lastLoginAt = new Date()
    await user.save()

    const formattedUser = formatUserResponse(user)

    return successResponse({
      data: {
        user: formattedUser,
        token,
      },
      message: "Login successful",
    })
  } catch (error: any) {
    return errorResponse({
      message: error.message || "Something went wrong",
      status: 500,
    })
  }
}
