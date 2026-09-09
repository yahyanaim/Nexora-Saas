"use client"
import { ForgotPassword } from "@/components/shared/auth-chunks/forgot-password"
import { LoginByEmail } from "@/components/shared/auth-chunks/login-by-email"
import { LoginByQrCode } from "@/components/shared/auth-chunks/login-by-qrCode"
import { ResetPassword } from "@/components/shared/auth-chunks/reset-password"
import { VerifyAccount } from "@/components/shared/auth-chunks/verify-account"
import { VerifyForgotPassword } from "@/components/shared/auth-chunks/verify-forgot-password"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import { useEffect, useState } from "react"
import { GridPattern } from "@/components/ui/grid-pattern"
import { cn } from "@/lib/utils"
import Lottie from "lottie-react"
import emptyChatAnimation from "../../../../public/lottie/rocket-marketing-growth.json"

export type AuthSections =
  | "login-by-email"
  | "login-by-qrCode"
  | "very-account"
  | "very-forgot-password"
  | "forgot-password"
  | "reset-password"
interface CloudShapeProps {
  className?: string
  size?: number
  color?: string
  backColor?: string
}

function CloudShape({
  className = "",
  size = 16,
  color = "#F3FDFF",
  backColor = "#AACADF",
}: CloudShapeProps) {
  return (
    <div
      className={`pointer-events-none absolute rounded-full ${className}`}
      style={{
        fontSize: `${size}px`,
        width: "1.25em",
        height: "1.25em",
        backgroundColor: color,
        boxShadow: `
          0.937em 0.312em ${color},
          -0.312em -0.312em ${backColor},
          1.437em 0.375em ${color},
          0.5em -0.125em ${backColor},
          2.187em 0 ${color},
          1.25em -0.062em ${backColor},
          2.937em 0.312em ${color},
          2em -0.312em ${backColor},
          3.625em -0.062em ${color},
          2.625em 0em ${backColor},
          4.5em -0.312em ${color},
          3.375em -0.437em ${backColor},
          4.625em -1.75em 0 0.437em ${color},
          4em -0.625em ${backColor},
          4.125em -2.125em 0 0.437em ${backColor}
        `,
      }}
    />
  )
}
export const AuthPage = () => {
  const [authSections, setAuthSections] =
    useState<AuthSections>("login-by-email")

  useEffect(() => {
    window.history.pushState(null, "", window.location.href)
    const handleBack = () => {
      setAuthSections("login-by-email")
      window.history.pushState(null, "", window.location.href)
    }
    window.addEventListener("popstate", handleBack)
    return () => {
      window.removeEventListener("popstate", handleBack)
    }
  }, [])

  return (
    <div className="flex min-h-dvh flex-col overflow-auto bg-background">
      <div className="fixed top-4 right-4 z-50 md:top-5 md:right-5">
        <AnimatedThemeToggler />
      </div>

      <div className="grid h-full w-full flex-1 lg:grid-cols-[1.5fr_2fr]">
        <div className="relative hidden h-full items-center justify-center bg-primary/10 lg:flex">
          <div className="pointer-events-none absolute inset-0 z-0 h-full w-full">
            <CloudShape
              className="top-[8%] left-[6%]"
              size={30}
              color="#C7DDE9"
              backColor="#AACADF"
            />
            <CloudShape
              className="top-[12%] right-[10%] -scale-x-100"
              size={26}
              color="#C7DDE9"
              backColor="#AACADF"
            />
            <CloudShape
              className="bottom-[15%] left-[8%] -scale-x-100"
              size={28}
              color="#C7DDE9"
              backColor="#AACADF"
            />
            <CloudShape
              className="right-[12%] bottom-[10%]"
              size={24}
              color="#C7DDE9"
              backColor="#AACADF"
            />

            <CloudShape
              className="top-[20%] left-[18%] -scale-x-100"
              size={38}
              color="#AACADF"
              backColor="#8FB4CC"
            />
            <CloudShape
              className="top-[18%] right-[22%]"
              size={36}
              color="#AACADF"
              backColor="#8FB4CC"
            />
            <CloudShape
              className="right-[6%] bottom-[22%] -scale-x-100 -scale-y-100"
              size={35}
              color="#AACADF"
              backColor="#8FB4CC"
            />

            <CloudShape className="top-[4%] left-[2%]" size={55} />
            <CloudShape
              className="bottom-[6%] left-[4%] -scale-y-100"
              size={48}
            />
            <CloudShape
              className="top-[6%] right-[3%] -scale-x-100"
              size={50}
            />
            <CloudShape
              className="right-[2%] bottom-[4%] -scale-x-100 -scale-y-100"
              size={45}
            />
          </div>

          <Lottie
            animationData={emptyChatAnimation}
            autoplay={true}
            className="relative z-10 mb-5 h-130 w-130 -scale-x-100"
          />
        </div>

        <div className="relative z-40 flex h-full flex-1 items-center justify-center rounded-md p-6 md:p-10">
          <GridPattern
            width={100}
            height={100}
            x={-1}
            y={-1}
            strokeDasharray={"4 2"}
            squares={[
              [0, 0],
              [4, 1],
              [2, 5],
              [3, 8],
              [5, 3],
              [6, 6],
              [7, 10],
              [12, 2],
              [14, 4],
              [15, 1],
              [16, 6],
              [18, 3],
              [18, 8],
              [20, 5],
              [22, 2],
              [22, 9],
              [25, 4],
              [25, 7],
              [28, 1],
              [28, 6],
            ]}
            className={cn(
              "pointer-events-none [mask-image:radial-gradient(1500px_circle_at_center,white,transparent)]"
            )}
          />
          {authSections === "login-by-qrCode" ? (
            <LoginByQrCode setAuthSections={setAuthSections} />
          ) : authSections === "login-by-email" ? (
            <LoginByEmail setAuthSections={setAuthSections} />
          ) : authSections === "forgot-password" ? (
            <ForgotPassword setAuthSections={setAuthSections} />
          ) : authSections === "very-account" ? (
            <VerifyAccount setAuthSections={setAuthSections} />
          ) : authSections === "very-forgot-password" ? (
            <VerifyForgotPassword setAuthSections={setAuthSections} />
          ) : authSections === "reset-password" ? (
            <ResetPassword setAuthSections={setAuthSections} />
          ) : (
            ""
          )}
        </div>
      </div>
    </div>
  )
}
