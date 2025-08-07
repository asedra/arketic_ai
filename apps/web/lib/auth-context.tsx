"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { User, AuthState, LoginCredentials, SignUpCredentials } from '@/types/auth'
import { 
  loginUser, 
  signUpUser, 
  logoutUser, 
  getCurrentUser,
  isAuthenticated,
  authStorage,
  handleAuthError,
  refreshAuthToken
} from '@/lib/auth'

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>
  signup: (credentials: SignUpCredentials) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  clearError: () => void
  refreshToken: () => Promise<void>
  isTokenExpiring: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  })
  
  // Session management refs
  const refreshIntervalRef = useRef<NodeJS.Timeout>()
  const activityTimeoutRef = useRef<NodeJS.Timeout>()
  const lastActivityRef = useRef<number>(Date.now())

  // Initialize auth state
  useEffect(() => {
    initializeAuth()
  }, [])

  const initializeAuth = useCallback(async () => {
    try {
      if (isAuthenticated()) {
        // Get stored user data first for immediate UI update
        const storedUser = localStorage.getItem('user_data')
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser)
            setState(prev => ({
              ...prev,
              user: userData,
              isAuthenticated: true,
              isLoading: false,
            }))
          } catch (e) {
            console.error('Error parsing stored user data:', e)
          }
        }

        // Then fetch fresh user data from API
        try {
          const userData = await getCurrentUser()
          localStorage.setItem('user_data', JSON.stringify(userData))
          setState(prev => ({
            ...prev,
            user: userData,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          }))
        } catch (error) {
          // If API call fails but we have stored user, continue with stored data
          if (!storedUser) {
            throw error
          }
        }
      } else {
        setState(prev => ({
          ...prev,
          user: null,
          isAuthenticated: false,
          isLoading: false,
        }))
      }
    } catch (error) {
      console.error('Auth initialization failed:', error)
      // Clear invalid tokens
      authStorage.clear()
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: handleAuthError(error).message,
      })
    }
  }, [])

  const login = useCallback(async (credentials: LoginCredentials) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    console.group('🔐 Auth Context Login')
    console.log('Credentials:', {
      email: credentials.email,
      password: credentials.password ? '[REDACTED]' : 'undefined',
      rememberMe: credentials.rememberMe
    })
    
    try {
      console.log('Calling loginUser...')
      const response = await loginUser(credentials)
      console.log('LoginUser response:', response)
      
      // Ensure we have the response data
      if (!response) {
        throw new Error('No response received from server')
      }
      
      // Backend sends snake_case, safely extract tokens and user
      const accessToken = response.access_token || response.accessToken
      const refreshToken = response.refresh_token || response.refreshToken
      const user = response.user
      const expiresIn = response.expires_in || response.expiresIn
      
      // Validate required fields
      if (!accessToken) {
        throw new Error('No access token received from server')
      }
      
      if (!user) {
        throw new Error('No user data received from server')
      }
      
      // Store tokens
      authStorage.setToken(accessToken)
      if (refreshToken) {
        authStorage.setRefreshToken(refreshToken)
      }
      authStorage.setRememberMe(credentials.rememberMe || false)
      
      // Store user data
      localStorage.setItem('user_data', JSON.stringify(user))
      
      setState({
        user: user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })

      // Redirect to dashboard or intended page
      const redirectTo = localStorage.getItem('redirect_after_login') || '/dashboard'
      localStorage.removeItem('redirect_after_login')
      
      // Use replace instead of push to avoid back button issues
      router.replace(redirectTo)
      
    } catch (error: any) {
      console.error('Login error in auth context:', error)
      const authError = handleAuthError(error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: authError.message,
      }))
      
      // Clear any stored redirect URLs on error
      localStorage.removeItem('redirect_after_login')
      
      // Don't throw the error, let the component handle the state
      // throw error
    } finally {
      console.groupEnd()
    }
  }, [router])

  const signup = useCallback(async (credentials: SignUpCredentials) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await signUpUser(credentials)
      
      // Ensure we have the response data
      if (!response) {
        throw new Error('No response received from server')
      }
      
      // Backend sends snake_case, safely extract tokens and user
      const accessToken = response.access_token || response.accessToken
      const refreshToken = response.refresh_token || response.refreshToken
      const user = response.user
      const expiresIn = response.expires_in || response.expiresIn
      
      // Validate required fields
      if (!accessToken) {
        throw new Error('No access token received from server')
      }
      
      if (!user) {
        throw new Error('No user data received from server')
      }
      
      // Store tokens
      authStorage.setToken(accessToken)
      if (refreshToken) {
        authStorage.setRefreshToken(refreshToken)
      }
      
      // Store user data
      localStorage.setItem('user_data', JSON.stringify(user))
      
      setState({
        user: user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })

      // Redirect to dashboard
      router.replace('/dashboard')
      
    } catch (error) {
      const authError = handleAuthError(error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: authError.message,
      }))
      throw error
    }
  }, [router])

  const logout = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }))
    
    try {
      await logoutUser()
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      // Always clear state and redirect
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      })
      
      // Clear any stored redirect URLs
      localStorage.removeItem('redirect_after_login')
      
      router.replace('/login')
    }
  }, [router])

  const refreshUser = useCallback(async () => {
    try {
      if (isAuthenticated()) {
        const userData = await getCurrentUser()
        localStorage.setItem('user_data', JSON.stringify(userData))
        setState(prev => ({
          ...prev,
          user: userData,
          error: null,
        }))
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error)
      const authError = handleAuthError(error)
      setState(prev => ({
        ...prev,
        error: authError.message,
      }))
    }
  }, [])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  // Enhanced token refresh with better error handling
  const refreshTokenIfNeeded = useCallback(async () => {
    if (!state.isAuthenticated) return

    try {
      const token = authStorage.getToken()
      if (!token) return

      // Try to decode JWT to get expiry
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        const expiryTime = payload.exp * 1000
        const timeUntilExpiry = expiryTime - Date.now()
        
        // Refresh if less than 5 minutes until expiry
        if (timeUntilExpiry <= 5 * 60 * 1000) {
          console.log('Token expiring soon, refreshing...')
          await refreshAuthToken()
          await refreshUser()
          console.log('Token refresh successful')
        }
      } catch (error) {
        // If we can't decode, try to refresh anyway
        console.log('Cannot decode token, attempting refresh...')
        await refreshAuthToken()
        await refreshUser()
        console.log('Token refresh after decode error successful')
      }
    } catch (error) {
      console.error('Token refresh failed:', error)
      // If refresh fails, clear session and redirect to login
      if (error.message?.includes('No refresh token') || error.message?.includes('Session expired')) {
        console.log('Session expired, logging out...')
        await logout()
      }
    }
  }, [state.isAuthenticated, refreshUser, logout])
  
  // Manual token refresh for external calls
  const manualRefreshToken = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }))
      await refreshAuthToken()
      await refreshUser()
      console.log('Manual token refresh successful')
    } catch (error) {
      console.error('Manual token refresh failed:', error)
      throw error
    } finally {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [refreshUser])
  
  // Check if token is expiring soon (for UI indicators)
  const checkTokenExpiring = useCallback(() => {
    if (!state.isAuthenticated) return false
    
    const token = authStorage.getToken()
    if (!token) return false
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const expiryTime = payload.exp * 1000
      const timeUntilExpiry = expiryTime - Date.now()
      // Return true if less than 10 minutes until expiry
      return timeUntilExpiry <= 10 * 60 * 1000
    } catch {
      return false
    }
  }, [state.isAuthenticated])

  // Activity tracking
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
    
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current)
    }
    
    // Auto logout after 30 minutes of inactivity
    activityTimeoutRef.current = setTimeout(() => {
      if (state.isAuthenticated) {
        console.log('Session expired due to inactivity')
        logout()
      }
    }, 30 * 60 * 1000)
  }, [state.isAuthenticated, logout])

  // Set up session management
  useEffect(() => {
    if (state.isAuthenticated && !state.isLoading) {
      // Set up token refresh interval (every 2 minutes for more responsive checking)
      refreshIntervalRef.current = setInterval(refreshTokenIfNeeded, 2 * 60 * 1000)
      
      // Initial token check when auth state changes
      refreshTokenIfNeeded()
      
      // Set up activity tracking
      const activities = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
      let activityThrottle: NodeJS.Timeout
      
      const throttledUpdateActivity = () => {
        if (activityThrottle) clearTimeout(activityThrottle)
        activityThrottle = setTimeout(updateActivity, 1000)
      }

      activities.forEach(activity => {
        document.addEventListener(activity, throttledUpdateActivity, true)
      })

      updateActivity() // Initial activity update
      
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current)
        }
        if (activityTimeoutRef.current) {
          clearTimeout(activityTimeoutRef.current)
        }
        if (activityThrottle) {
          clearTimeout(activityThrottle)
        }
        activities.forEach(activity => {
          document.removeEventListener(activity, throttledUpdateActivity, true)
        })
      }
    }
  }, [state.isAuthenticated, state.isLoading, refreshTokenIfNeeded, updateActivity])

  // Handle page visibility and focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && state.isAuthenticated) {
        refreshTokenIfNeeded()
        updateActivity()
      }
    }

    const handleFocus = () => {
      if (state.isAuthenticated) {
        refreshTokenIfNeeded()
        updateActivity()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [state.isAuthenticated, refreshTokenIfNeeded, updateActivity])

  const contextValue: AuthContextType = {
    ...state,
    login,
    signup,
    logout,
    refreshUser,
    clearError,
    refreshToken: manualRefreshToken,
    isTokenExpiring: checkTokenExpiring,
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}