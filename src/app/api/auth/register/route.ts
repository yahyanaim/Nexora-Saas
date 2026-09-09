// app/api/auth/register/route.ts

import { NextRequest } from "next/server"
import bcrypt from "bcryptjs"
import User from "@/lib/models/user-model"
import { UserStatus } from "@/types/users"
import connectDB from "@/lib/db-config/mongoose"
import { sendMail } from "@/lib/auth/email"
import { createOtp } from "@/lib/auth/otp"
import { errorResponse, successResponse } from "@/lib/helpers/response-helpers"
import { OtpPurpose } from "@/types/auth"

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json()

    if (!name || !email || !password) {
      return errorResponse({
        message: "Name, email and password are required",
        status: 400,
      })
    }

    if (password.length < 6) {
      return errorResponse({
        message: "Password must be at least 6 characters",
        status: 400,
      })
    }

    await connectDB()

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return errorResponse({
        message: "User already exists with this email",
        status: 409,
      })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      status: UserStatus.NOT_VERIFIED,
    })

    const { otpCode, otpId } = await createOtp(
      user._id.toString(),
      OtpPurpose.ACCOUNT_VERIFICATION
    )

    await sendMail({
      to: email,
      subject: "Verify Your Email",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #333; text-align: center;">Welcome to Our Platform</h2>
          <p style="font-size: 16px; color: #555;">Hi ${name},</p>
          <p style="font-size: 16px; color: #555;">Thanks for signing up. Please verify your email address using the code below:</p>
          <div style="text-align: center; padding: 20px; background: #f5f5f5; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #cb7e87; letter-spacing: 4px;">
              ${otpCode}
            </span>
          </div>
          <p style="font-size: 14px; color: #888;">This code expires in <strong>5 minutes</strong>.</p>
          <p style="font-size: 14px; color: #888;">If you didn't create an account, please ignore this email.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #aaa; text-align: center;">This is an automated message, please do not reply.</p>
        </div>
      `,
    })

    return successResponse({
      data: {
        userId: user._id.toString(),
        email: user.email,
        name: user.name,
        otpId,
        requiresVerification: true,
      },
      status: 201,
      message: "User registered. Verification code sent to email.",
    })
  } catch (error: any) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0]
      return errorResponse({
        message: `${field} already exists`,
        status: 409,
      })
    }
    return errorResponse({
      message: error.message || "Something went wrong",
      status: 500,
    })
  }
}
