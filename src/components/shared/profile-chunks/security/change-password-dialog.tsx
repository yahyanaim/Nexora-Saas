"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import {
  KeyRound,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { useMutation } from "@tanstack/react-query"
import {
  changePasswordApi,
  forgotPasswordApi,
  verifyForgotPasswordApi,
  resetPasswordApi,
} from "@/lib/api/auth-apis"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { toast } from "@/lib/utils/toast"

const OTP_LENGTH = 6

interface ChangePasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: ChangePasswordDialogProps) {
  const t = useTranslations()
  const { myEmail } = useAuthGuard()
  const [mode, setMode] = useState<"change" | "forgot">("change")
  const [step, setStep] = useState<"otp" | "newPassword">("otp")
  const [serverError, setServerError] = useState<string>("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [otpId, setOtpId] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const changeMutation = useMutation({
    mutationFn: changePasswordApi,
    onSuccess: () => handleClose(),
    onError: () => {
      const msg = t("somethingWentWrong")
      setServerError(msg)
    },
  })

  const forgotMutation = useMutation({
    mutationFn: forgotPasswordApi,
    onSuccess: (data) => {
      setServerError("")
      setOtpId(data?.otpId || "")
      setStep("otp")
    },
    onError: () => {
      const msg = t("somethingWentWrong")
      setServerError(msg)
    },
  })

  const verifyMutation = useMutation({
    mutationFn: verifyForgotPasswordApi,
    onSuccess: (data) => {
      if (data?.resetToken) localStorage.setItem("resetToken", data?.resetToken)
      setServerError("")
      setStep("newPassword")
    },
    onError: () => {
      const msg = t("somethingWentWrong")
      setServerError(msg)
    },
  })

  const resetMutation = useMutation({
    mutationFn: resetPasswordApi,
    onSuccess: () => {
      toast.success(t("passwordResetSuccessfully"))
      handleClose()
    },
    onError: () => {
      const msg = t("somethingWentWrong")
      setServerError(msg)
    },
  })

  useEffect(() => {
    if (mode === "forgot" && myEmail && !otpId && step === "otp") {
      forgotMutation.mutate({ email: myEmail })
    }
  }, [mode, myEmail])

  const handleClose = () => {
    setMode("change")
    setStep("otp")
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setOtpCode("")
    setOtpId("")
    setServerError("")
    setErrors({})
    onOpenChange(false)
  }

  const validateChange = () => {
    const errs: Record<string, string> = {}
    if (!currentPassword) errs.currentPassword = t("passwordRequired")
    if (!newPassword || newPassword.length < 8)
      errs.newPassword = t("passwordMin8")
    if (newPassword !== confirmPassword)
      errs.confirmPassword = t("passwordsDoNotMatch")
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const validateOtp = () => {
    const errs: Record<string, string> = {}
    if (!otpCode || otpCode.length !== OTP_LENGTH)
      errs.otpCode = t("otpRequired")
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const validateReset = () => {
    const errs: Record<string, string> = {}
    if (!newPassword || newPassword.length < 8)
      errs.newPassword = t("passwordMin8")
    if (newPassword !== confirmPassword)
      errs.confirmPassword = t("passwordsDoNotMatch")
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleChangeSubmit = () => {
    if (!validateChange()) return
    setServerError("")
    changeMutation.mutate({
      currentPassword: currentPassword,
      newPassword,
    })
  }

  const handleVerifyOtp = () => {
    if (!validateOtp()) return
    setServerError("")
    verifyMutation.mutate({ otpCode, otpId })
  }

  const handleResetSubmit = () => {
    const resetToken = localStorage.getItem("resetToken") || ""

    if (!validateReset()) return
    setServerError("")
    resetMutation.mutate({ newPassword, resetToken })
  }

  const handleSwitchToForgot = () => {
    setMode("forgot")
    setStep("otp")
    setServerError("")
    setErrors({})
    setOtpId("")
    setOtpCode("")
  }

  const isLoading =
    changeMutation.isPending ||
    forgotMutation.isPending ||
    verifyMutation.isPending ||
    resetMutation.isPending

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-5" />
            {mode === "change" ? t("changePassword") : t("forgotPassword")}
          </DialogTitle>
          <DialogDescription>
            {mode === "change"
              ? t("changePasswordDescription")
              : t("forgotPasswordDescription")}
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <div className="px-4 pt-3 pb-0">
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {serverError}
            </div>
          </div>
        )}

        {mode === "change" ? (
          <div className="space-y-4 p-4 pt-3">
            <div className="space-y-2">
              <Label>{t("currentPassword")}</Label>
              <div className="relative">
                <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value)
                    if (errors.currentPassword)
                      setErrors((p) => ({ ...p, currentPassword: "" }))
                  }}
                  placeholder={t("enterCurrentPassword")}
                  className="pl-9"
                />
              </div>
              {errors.currentPassword && (
                <p className="text-xs text-destructive">
                  {errors.currentPassword}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t("newPassword")}</Label>
              <Input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value)
                  if (errors.newPassword)
                    setErrors((p) => ({ ...p, newPassword: "" }))
                }}
                placeholder={t("enterNewPassword")}
              />
              {errors.newPassword && (
                <p className="text-xs text-destructive">{errors.newPassword}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t("confirmNewPassword")}</Label>
              <Input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  if (errors.confirmPassword)
                    setErrors((p) => ({ ...p, confirmPassword: "" }))
                }}
                placeholder={t("reEnterNewPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </Button>
              <Button
                variant="link"
                size="sm"
                className="px-0 text-xs"
                onClick={handleSwitchToForgot}
              >
                {t("forgotPassword")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 p-4 pt-3">
            {step === "otp" && (
              <>
                <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                  <Mail className="size-4 shrink-0" />
                  <span>
                    {t("otpSentTo")}{" "}
                    <span className="font-medium text-foreground">
                      {myEmail}
                    </span>
                  </span>
                </div>

                <div className="space-y-2">
                  <Label>{t("otpCode")}</Label>
                  <InputOTP
                    maxLength={OTP_LENGTH}
                    value={otpCode}
                    onChange={(val) => {
                      setOtpCode(val)
                      if (errors.otpCode)
                        setErrors((p) => ({ ...p, otpCode: "" }))
                    }}
                    disabled={
                      forgotMutation.isPending || verifyMutation.isPending
                    }
                  >
                    <InputOTPGroup className="w-full gap-2">
                      {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                        <InputOTPSlot
                          key={i}
                          index={i}
                          className="h-13 flex-1 rounded-md border bg-primary/20 text-2xl"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  {errors.otpCode && (
                    <p className="text-xs text-destructive">{errors.otpCode}</p>
                  )}
                </div>

                {forgotMutation.isPending && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    {t("sendingOtp")}
                  </div>
                )}
              </>
            )}

            {step === "newPassword" && (
              <>
                <div className="space-y-2">
                  <Label>{t("newPassword")}</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value)
                      if (errors.newPassword)
                        setErrors((p) => ({ ...p, newPassword: "" }))
                    }}
                    placeholder={t("enterNewPassword")}
                  />
                  {errors.newPassword && (
                    <p className="text-xs text-destructive">
                      {errors.newPassword}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{t("confirmNewPassword")}</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      if (errors.confirmPassword)
                        setErrors((p) => ({ ...p, confirmPassword: "" }))
                    }}
                    placeholder={t("reEnterNewPassword")}
                  />
                  {errors.confirmPassword && (
                    <p className="text-xs text-destructive">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </>
            )}

            <Button
              variant="link"
              size="sm"
              className="px-0 text-xs"
              onClick={() => {
                setMode("change")
                setServerError("")
                setErrors({})
              }}
            >
              <ArrowLeft className="mr-1 size-3" />
              {t("backToChangePassword")}
            </Button>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleClose}
            disabled={isLoading}
          >
            {t("cancel")}
          </Button>

          {mode === "change" && (
            <Button
              className="flex-1"
              onClick={handleChangeSubmit}
              disabled={isLoading}
              variant={"primary"}
            >
              {changeMutation.isPending ? (
                <Spinner className="size-4" />
              ) : (
                t("save")
              )}
            </Button>
          )}

          {mode === "forgot" && step === "otp" && (
            <Button
              className="flex-1"
              variant={"primary"}
              onClick={handleVerifyOtp}
              disabled={isLoading || forgotMutation.isPending}
            >
              {verifyMutation.isPending ? (
                <Spinner className="size-4" />
              ) : (
                t("verify")
              )}
            </Button>
          )}

          {mode === "forgot" && step === "newPassword" && (
            <Button
              className="flex-1"
              onClick={handleResetSubmit}
              disabled={isLoading}
              variant={"primary"}
            >
              {resetMutation.isPending ? (
                <Spinner className="size-4" />
              ) : (
                t("resetPassword")
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
