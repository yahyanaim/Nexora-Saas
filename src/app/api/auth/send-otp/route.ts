// app/api/auth/resend-otp/route.ts

import { NextRequest } from "next/server"
import User from "@/lib/models/user-model"
import connectDB from "@/lib/db-config/mongoose"
import { createOtp } from "@/lib/auth/otp"
import { sendMail } from "@/lib/auth/email"
import { errorResponse, successResponse } from "@/lib/helpers/response-helpers"

export async function POST(req: NextRequest) {
  try {
    const { email, purpose } = await req.json()

    if (!email) {
      return errorResponse({
        message: "Email is required",
        status: 400,
      })
    }

    await connectDB()
    const user = await User.findOne({ email }).select("+email")

    if (!user) {
      return errorResponse({
        message: "User not found",
        status: 404,
      })
    }
    const { otpCode, otpId } = await createOtp(user._id.toString(), purpose)

    await sendMail({
      to: user.email,
      subject: "Your Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #333; text-align: center;">New Verification Code</h2>
          <p style="font-size: 16px; color: #555;">Hi ${user.name},</p>
          <p style="font-size: 16px; color: #555;">Your new verification code is:</p>
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
      data: { otpId, email: user.email },
      message: "Code sent successfully",
    })
  } catch (error: any) {
    return errorResponse({
      message: error.message || "Something went wrong",
      status: 500,
    })
  }
}
