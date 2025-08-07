"use client"

import { useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { refreshAuthToken, authStorage } from '@/lib/auth'

const TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000 // 10 minutes
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000 // 5 minutes before expiry
const ACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutes of inactivity

export function useSessionManager() {
  const { isAuthenticated, logout, refreshUser } = useAuth()
  const refreshIntervalRef = useRef<NodeJS.Timeout>()
  const activityTimeoutRef = useRef<NodeJS.Timeout>()
  const lastActivityRef = useRef<number>(Date.now())

  // Check if token needs refresh based on expiry time
  const shouldRefreshToken = useCallback(() => {
    if (!isAuthenticated) return false
    
    const token = authStorage.getToken()
    if (!token) return false

    // Try to decode JWT to get expiry (basic implementation)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const expiryTime = payload.exp * 1000 // Convert to milliseconds
      const timeUntilExpiry = expiryTime - Date.now()
      
      return timeUntilExpiry <= TOKEN_REFRESH_THRESHOLD
    } catch (error) {
      // If we can't decode, assume we should refresh
      return true
    }
  }, [isAuthenticated])

  // Refresh token if needed
  const refreshTokenIfNeeded = useCallback(async () => {
    if (!isAuthenticated) return

    try {
      if (shouldRefreshToken()) {
        await refreshAuthToken()
        await refreshUser()
      }
    } catch (error) {
      console.error('Token refresh failed:', error)
      // The refreshAuthToken function will handle logout on failure
    }
  }, [isAuthenticated, shouldRefreshToken, refreshUser])

  // Track user activity
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
    
    // Clear existing timeout
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current)
    }
    
    // Set new timeout for inactivity
    activityTimeoutRef.current = setTimeout(() => {
      if (isAuthenticated) {
        console.log('Session expired due to inactivity')
        logout()
      }
    }, ACTIVITY_TIMEOUT)
  }, [isAuthenticated, logout])

  // Set up activity tracking
  useEffect(() => {
    if (!isAuthenticated) return

    const activities = [
      'mousedown',
      'mousemove', 
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ]

    // Throttle activity updates to avoid too frequent calls
    let activityThrottle: NodeJS.Timeout
    const throttledUpdateActivity = () => {
      if (activityThrottle) clearTimeout(activityThrottle)
      activityThrottle = setTimeout(updateActivity, 1000) // Update at most once per second
    }

    activities.forEach(activity => {
      document.addEventListener(activity, throttledUpdateActivity, true)
    })

    // Initial activity update
    updateActivity()

    return () => {
      activities.forEach(activity => {
        document.removeEventListener(activity, throttledUpdateActivity, true)
      })
      
      if (activityThrottle) clearTimeout(activityThrottle)
      if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current)
    }
  }, [isAuthenticated, updateActivity])

  // Set up token refresh interval
  useEffect(() => {
    if (!isAuthenticated) {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
      return
    }

    // Initial token refresh check
    refreshTokenIfNeeded()

    // Set up interval for periodic token refresh
    refreshIntervalRef.current = setInterval(
      refreshTokenIfNeeded, 
      TOKEN_REFRESH_INTERVAL
    )

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [isAuthenticated, refreshTokenIfNeeded])

  // Handle page visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        // Page became visible, refresh token if needed
        refreshTokenIfNeeded()
        updateActivity()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isAuthenticated, refreshTokenIfNeeded, updateActivity])

  // Handle window focus
  useEffect(() => {
    const handleFocus = () => {
      if (isAuthenticated) {
        refreshTokenIfNeeded()
        updateActivity()
      }
    }

    window.addEventListener('focus', handleFocus)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [isAuthenticated, refreshTokenIfNeeded, updateActivity])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current)
      }
    }
  }, [])

  return {
    refreshToken: refreshTokenIfNeeded,
    lastActivity: lastActivityRef.current,
  }
}