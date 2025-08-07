"use client"

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
  redirectTo?: string
}

export function ProtectedRoute({ 
  children, 
  requireAuth = true, 
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, error } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && requireAuth && !isAuthenticated) {
      // Store the current path for redirect after login
      localStorage.setItem('redirect_after_login', pathname)
      const redirectUrl = `${redirectTo}?redirect=${encodeURIComponent(pathname)}`
      router.replace(redirectUrl)
    }
  }, [isAuthenticated, isLoading, requireAuth, redirectTo, router, pathname])

  // Show loading spinner while auth is being determined
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="flex flex-col items-center gap-4 p-8 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <p className="text-sm text-muted-foreground animate-pulse">Authenticating...</p>
          {error && (
            <p className="text-xs text-red-500 mt-2 text-center max-w-xs">
              Taking longer than expected. Please refresh if this continues.
            </p>
          )}
        </div>
      </div>
    )
  }

  // If auth is required and user is not authenticated, don't render children
  // (the useEffect will handle the redirect)
  if (requireAuth && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="flex flex-col items-center gap-4 p-8 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <p className="text-sm text-muted-foreground animate-pulse">Redirecting to login...</p>
          <p className="text-xs text-slate-500 text-center max-w-xs">
            You will be redirected to the login page in a moment.
          </p>
        </div>
      </div>
    )
  }

  // Render children if auth requirements are met
  return <>{children}</>
}