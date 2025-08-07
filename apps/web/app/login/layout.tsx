import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sign In - Arketic AI Platform",
  description: "Sign in to your Arketic account to access advanced AI analytics and insights.",
  robots: "noindex, nofollow",
}

export default function LoginLayout({
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