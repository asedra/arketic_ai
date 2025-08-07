import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Forgot Password - Arketic AI Platform",
  description: "Reset your Arketic account password. Enter your email to receive reset instructions.",
  robots: "noindex, nofollow",
}

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="auth-layout">
      {children}
    </div>
  )
}