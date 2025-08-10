'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { usePathname, useRouter } from 'next/navigation'

interface AuthProviderProps {
  children: React.ReactNode
}

const PUBLIC_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password']

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, restoreSession, validateSession } = useAuthStore()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Try to restore session from storage
        const restored = await restoreSession()
        
        if (restored) {
          // Session restored successfully
          console.log('Session restored successfully')
          
          // If on a public route and authenticated, redirect to dashboard
          if (PUBLIC_ROUTES.includes(pathname)) {
            router.push('/dashboard')
          }
        } else {
          // No valid session
          console.log('No valid session found')
          
          // If on a protected route, redirect to login
          if (!PUBLIC_ROUTES.includes(pathname) && pathname !== '/') {
            localStorage.setItem('redirect_after_login', pathname)
            router.push('/login')
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        setIsInitialized(true)
      }
    }

    initAuth()
  }, [])

  // Handle visibility change - validate session when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        // Validate session when tab becomes visible
        validateSession().catch(console.error)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isAuthenticated, validateSession])

  // Handle storage events for cross-tab logout
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token' && e.newValue === null) {
        // Token was removed in another tab (logout)
        console.log('Detected logout in another tab')
        useAuthStore.getState().clearAuth()
        router.push('/login')
      } else if (e.key === 'auth_token' && e.newValue && !isAuthenticated) {
        // Token was added in another tab (login)
        console.log('Detected login in another tab')
        restoreSession()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [isAuthenticated, restoreSession, router])

  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return <>{children}</>
}