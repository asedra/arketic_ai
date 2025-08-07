import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Create Account - Arketic AI Platform",
  description: "Create your Arketic account to access advanced AI analytics, insights, and powerful automation tools.",
  robots: "noindex, nofollow",
}

export default function SignUpLayout({
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