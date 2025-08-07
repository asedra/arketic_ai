import type React from "react"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { ArketicProvider } from "@/components/providers/ArketicProvider"
import { AuthProvider } from "@/lib/auth-context"
import { AuthErrorBoundary } from "@/components/auth/auth-error-boundary"
import { AuthDebugPanel } from "@/components/auth/auth-debug-panel"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Arketic AI Platform - Analytics Dashboard",
  description: "A comprehensive AI platform with advanced analytics and data visualization",
  generator: 'v0.dev',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AuthErrorBoundary>
            <AuthProvider>
              <ArketicProvider>
                {children}
                <Toaster 
                  position="top-right" 
                  expand={true}
                  richColors
                  closeButton
                  duration={4000}
                />
                <AuthDebugPanel />
              </ArketicProvider>
            </AuthProvider>
          </AuthErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  )
}
