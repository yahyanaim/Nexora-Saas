import crypto from "crypto"
import Otp from "@/lib/models/otp-model"
import { OtpPurpose } from "@/types/auth"

const OTP_EXPIRY_MINUTES = 5
const MAX_ATTEMPTS = 3

export function generateOtp(length = 6): string {
  let otp = ""
  for (let i = 0; i < length; i++) {
    otp += crypto.randomInt(0, 10).toString()
  }
  return otp
}

interface ResultCreateOtp {
  otpId: string
  otpCode: string
}

export async function createOtp(
  userId: string,
  purpose: OtpPurpose
): Promise<ResultCreateOtp> {
  await Otp.deleteMany({ userId, purpose })

  const code = generateOtp()
  const expiresAt = new Date()
  expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES)

  const createdOtp = await Otp.create({
    userId,
    code,
    purpose,
    expiresAt,
    attempts: 0,
  })

  return { otpId: createdOtp._id.toString(), otpCode: createdOtp.code }
}

interface VerifyOtpResult {
  userId: string
  purpose: OtpPurpose
}

export async function verifyOtp(
  otpId: string,
  code: string
): Promise<VerifyOtpResult | null> {
  const otp = await Otp.findById(otpId)
  if (!otp) return null

  if (otp.expiresAt < new Date()) {
    await Otp.deleteOne({ _id: otp._id })
    return null
  }

  if (otp.attempts >= MAX_ATTEMPTS) {
    await Otp.deleteOne({ _id: otp._id })
    return null
  }

  otp.attempts += 1
  await otp.save()

  const codeBuffer = Buffer.from(code)
  const storedBuffer = Buffer.from(otp.code)
  const isMatch =
    codeBuffer.length === storedBuffer.length &&
    crypto.timingSafeEqual(codeBuffer, storedBuffer)

  if (!isMatch) {
    if (otp.attempts >= MAX_ATTEMPTS) {
      await Otp.deleteOne({ _id: otp._id })
    }
    return null
  }

  const result = { userId: otp.userId.toString(), purpose: otp.purpose }
  await Otp.deleteOne({ _id: otp._id })
  return result
}
