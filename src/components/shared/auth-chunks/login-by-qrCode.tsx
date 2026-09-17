"use client"

import { useState, useEffect, useRef } from "react"
import {
  Scan,
  Smartphone,
  CheckCircle2,
  RefreshCw,
  Shield,
  QrCode,
  Rocket,
} from "@/components/ui/carbon/icons"
import QRCode from "qrcode"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { Spinner } from "@/components/ui/spinner"
import { Dispatch, SetStateAction } from "react"
import { AuthSections } from "./auth"
import { Highlighter } from "@/components/ui/highlighter"
import { FieldDescription } from "@/components/ui/field"
import { useTranslations } from "next-intl"

interface Props {
  setAuthSections: Dispatch<SetStateAction<AuthSections>>
}

export const LoginByQrCode = ({ setAuthSections }: Props) => {
  const t = useTranslations()
  const [qrState, setQrState] = useState<
    "loading" | "active" | "scanned" | "expired"
  >("loading")
  const [progress, setProgress] = useState(100)
  const [qrDataUrl, setQrDataUrl] = useState<string>("")
  const sessionRef = useRef<string>("")

  useEffect(() => {
    const timer = setTimeout(() => setQrState("active"), 1500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (qrState !== "active") return

    const generateQR = async () => {
      try {
        if (!sessionRef.current) {
          sessionRef.current = `auth-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
        }

        const url = await QRCode.toDataURL(sessionRef.current, {
          width: 280,
          margin: 1,
        })
        setQrDataUrl(url)
      } catch (err) {
        console.log("Failed to generate QR code:", err)
      }
    }

    generateQR()
  }, [qrState])

  useEffect(() => {
    if (qrState !== "active") return

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          setQrState("expired")
          return 0
        }
        return prev - 0.5
      })
    }, 100)

    return () => clearInterval(interval)
  }, [qrState])

  const handleRefresh = () => {
    setQrState("loading")
    setProgress(100)
    setQrDataUrl("")
    sessionRef.current = ""
    setTimeout(() => setQrState("active"), 1500)
  }

  const handleSimulateScan = () => {
    if (qrState === "active") {
      setQrState("scanned")
    }
  }

  const statusConfig = {
    active: {
      label: t("active"),
      variant: "default" as const,
      icon: (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
      ),
      className:
        "border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20",
    },
    scanned: {
      label: t("confirmed"),
      variant: "secondary" as const,
      icon: <CheckCircle2 className="h-3 w-3" />,
      className:
        "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20",
    },
    expired: {
      label: t("expired"),
      variant: "destructive" as const,
      icon: <RefreshCw className="h-3 w-3" />,
      className:
        "border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20",
    },
    loading: {
      label: t("loading"),
      variant: "outline" as const,
      icon: <RefreshCw className="h-3 w-3 animate-spin" />,
      className: "border-border bg-muted text-muted-foreground",
    },
  }

  const stepIcons = [Smartphone, Scan, CheckCircle2]

  return (
    <div>
      {/* Main Content */}
      <main>
        <div className="grid w-full max-w-5xl items-center gap-8 lg:grid-cols-2 lg:gap-16">
          {/* Left Side - QR Code */}
          <div className="order-2 flex flex-col items-center lg:order-1 lg:items-end">
            <div className="group relative">
              {/* Status Badge */}
              <div className="absolute -top-3 left-1/2 z-20 -translate-x-1/2">
                <Badge
                  variant={statusConfig[qrState].variant}
                  className={statusConfig[qrState].className}
                >
                  {statusConfig[qrState].icon}
                  <span>{statusConfig[qrState].label}</span>
                </Badge>
              </div>
              <Card className="relative border-border bg-card backdrop-blur-sm">
                <CardContent className="p-8 md:p-10">
                  {/* QR Code Area */}
                  <div className="relative mt-4">
                    <div
                      onClick={handleSimulateScan}
                      className={cn(
                        "relative h-64 w-64 cursor-pointer overflow-hidden rounded-lg transition-all duration-500 md:h-72 md:w-72",
                        qrState === "expired" && "opacity-50 grayscale",
                        qrState === "active" && "hover:scale-[1.02]",
                        qrState === "scanned" && "scale-95"
                      )}
                    >
                      {/* Loading State */}
                      {qrState === "loading" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                          <Spinner className="h-15 w-15 rounded-lg" />
                        </div>
                      )}
                      {/* Generated QR Code */}
                      {qrDataUrl && qrState !== "loading" && (
                        <img
                          src={qrDataUrl}
                          alt={t("qrCode")}
                          className="h-full w-full rounded-lg object-contain p-2"
                        />
                      )}

                      {/* Scanned State Overlay */}
                      {qrState === "scanned" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm">
                          <div className="flex animate-in flex-col items-center gap-3 duration-300 zoom-in">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                              <CheckCircle2 className="h-8 w-8 text-green-500" />
                            </div>
                            <span className="text-sm font-medium text-green-600 dark:text-green-400">
                              {t("authorized")}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Expired State Overlay */}
                      {qrState === "expired" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                          <div className="flex flex-col items-center gap-3">
                            <QrCode className="h-10 w-10" />
                            <span className="text-sm font-medium">
                              {t("codeExpired")}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Scan Line Animation */}
                      {qrState === "active" && (
                        <>
                          <div className="animate-scan absolute inset-x-0 h-px bg-primary/50" />
                          <div className="animate-scan absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
                        </>
                      )}

                      {/* Corner Accents */}
                      <div className="absolute top-0 left-0 h-6 w-6 rounded-tl-lg border-t-4 border-l-4 border-primary" />
                      <div className="absolute top-0 right-0 h-6 w-6 rounded-tr-lg border-t-4 border-r-4 border-primary" />
                      <div className="absolute bottom-0 left-0 h-6 w-6 rounded-bl-lg border-b-4 border-l-4 border-primary" />
                      <div className="absolute right-0 bottom-0 h-6 w-6 rounded-br-lg border-r-4 border-b-4 border-primary" />
                    </div>

                    {/* Progress Bar */}
                    {qrState === "active" && (
                      <Progress value={progress} className="mt-4 h-1 w-full" />
                    )}

                    {/* Refresh Button */}
                    {qrState === "expired" && (
                      <Button
                        onClick={handleRefresh}
                        variant={"outline"}
                        className="mt-4 w-full gap-2 p-6"
                      >
                        <RefreshCw className="h-4 w-4" />
                        {t("generateNewCode")}
                      </Button>
                    )}
                  </div>

                  {/* Security Badge */}
                  <div className="mt-6 flex items-center justify-center gap-2 text-sm">
                    <Shield className="size-4" />
                    {t("secureEncrypted")}
                  </div>
                </CardContent>
              </Card>

              <div className="mt-7 text-center">
                <button
                  type="button"
                  onClick={() => setAuthSections("login-by-email")}
                  className="cursor-pointer font-bold text-primary underline-offset-4 hover:underline"
                >
                  {t("backToSignIn")}
                </button>
              </div>
            </div>
          </div>

          {/* Right Side - Instructions */}
          <div className="order-1 flex flex-col items-center gap-2 text-center lg:order-2">
            <Rocket className="size-25 text-primary md:size-30" />
            <div className="mb-5 space-y-2">
              <h1 className="text-3xl font-bold md:min-h-[3.5rem] md:text-5xl">
                {t("loginBy")}{" "}
                <Highlighter action="highlight" className="text-white">
                  {t("qrCode")}
                </Highlighter>
              </h1>
              <FieldDescription className="text-center font-bold">
                {t("scanQrWithApp")}{" "}
                <Highlighter action="underline">{t("mobileApp")}</Highlighter>
              </FieldDescription>
            </div>

            {/* Steps */}
            <div className="w-full max-w-sm space-y-3">
              {[
                t("openAuthenticatorApp"),
                t("pointCameraAtQrCode"),
                t("confirmLoginOnDevice"),
              ].map((text, index) => {
                const Icon = stepIcons[index] ?? Smartphone
                return (
                  <Card
                    key={index}
                    className="group border-border/50 bg-card transition-all duration-300 hover:border-primary/20 hover:shadow-sm"
                  >
                    <CardContent className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-105">
                        <Icon className="size-6" />
                      </div>
                      <span className="text-start text-sm font-medium text-foreground">
                        {text}
                      </span>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </div>
      </main>
      {/* Custom Animations */}
      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan {
          animation: scan 2.5s linear infinite;
        } 
      `}</style>
    </div>
  )
}
