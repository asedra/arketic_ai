'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  requiredPermissions?: string[]
  redirectTo?: string
}

export function ProtectedRoute({ 
  children, 
  fallback,
  requiredPermissions = [],
  redirectTo = '/login'
}: ProtectedRouteProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, user, isLoading, restoreSession } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      // First attempt to restore session from storage
      if (!isAuthenticated && !isLoading) {
        const restored = await restoreSession()
        if (!restored) {
          // Store current path for redirect after login
          if (typeof window !== 'undefined') {
            localStorage.setItem('redirect_after_login', pathname)
          }
          router.push(redirectTo)
        }
      }
      setIsChecking(false)
    }

    checkAuth()
  }, [isAuthenticated, isLoading, pathname, redirectTo, restoreSession, router])

  // Check permissions if required
  useEffect(() => {
    if (isAuthenticated && user && requiredPermissions.length > 0) {
      const hasRequiredPermissions = requiredPermissions.every(permission =>
        user.permissions?.includes(permission)
      )
      
      if (!hasRequiredPermissions) {
        router.push('/unauthorized')
      }
    }
  }, [isAuthenticated, user, requiredPermissions, router])

  // Show loading state
  if (isChecking || isLoading) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // Not authenticated
  if (!isAuthenticated) {
    return null
  }

  // Check permissions
  if (requiredPermissions.length > 0 && user) {
    const hasRequiredPermissions = requiredPermissions.every(permission =>
      user.permissions?.includes(permission)
    )
    
    if (!hasRequiredPermissions) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access this page.</p>
          </div>
        </div>
      )
    }
  }

  return <>{children}</>
}