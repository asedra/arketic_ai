import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { authApi } from '../api-client'

export interface User {
  id: string
  email: string
  username?: string
  first_name?: string
  last_name?: string
  role: string
  permissions?: string[]
  created_at?: string
}

export interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  tokenExpiresAt: number | null
  refreshTimer?: NodeJS.Timeout
}

interface AuthStore extends AuthState {
  // Actions
  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<boolean>
  logout: () => Promise<void>
  refreshTokens: () => Promise<boolean>
  validateSession: () => Promise<boolean>
  setTokens: (accessToken: string, refreshToken: string, expiresIn: number) => void
  setUser: (user: User | null) => void
  clearAuth: () => void
  clearError: () => void
  restoreSession: () => Promise<boolean>
  scheduleTokenRefresh: (expiresIn: number) => void
  clearRefreshTimer: () => void
}

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  TOKEN_EXPIRES: 'token_expires_at'
}

// Helper function to decode JWT token
function decodeToken(token: string): any {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}

// Helper function to check if token is expired
function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token)
  if (!decoded || !decoded.exp) return true
  
  const expiryTime = decoded.exp * 1000
  const bufferTime = 60 * 1000 // 1 minute buffer
  return Date.now() >= expiryTime - bufferTime
}

// Helper function to calculate token expiry time
function calculateTokenExpiry(expiresIn: number): number {
  return Date.now() + (expiresIn * 1000)
}

// Helper function to set cookie
function setCookie(name: string, value: string, days: number = 7) {
  if (typeof document === 'undefined') return
  
  const expires = new Date()
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000))
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Strict`
}

// Helper function to remove cookie
function removeCookie(name: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Strict`
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  tokenExpiresAt: null,
  refreshTimer: undefined
}

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        login: async (email, password, rememberMe = false) => {
          set({ isLoading: true, error: null })
          
          try {
            const response = await authApi.login({
              email,
              password,
              remember_me: rememberMe
            })

            if (response.success && response.data) {
              const { access_token, refresh_token, expires_in, user } = response.data
              
              // Store tokens
              get().setTokens(access_token, refresh_token, expires_in)
              
              // Store user data
              get().setUser(user)
              
              // Set authentication state
              set({ 
                isAuthenticated: true, 
                isLoading: false,
                error: null 
              })
              
              // Schedule token refresh
              get().scheduleTokenRefresh(expires_in)
              
              return true
            } else {
              set({ 
                error: response.message || 'Login failed', 
                isLoading: false 
              })
              return false
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Login failed'
            set({ 
              error: errorMessage, 
              isLoading: false 
            })
            return false
          }
        },

        register: async (email, password, firstName, lastName) => {
          set({ isLoading: true, error: null })
          
          try {
            const response = await authApi.register({
              email,
              password,
              firstName,
              lastName
            })

            if (response.success && response.data) {
              const { access_token, refresh_token, expires_in, user } = response.data
              
              // Store tokens
              get().setTokens(access_token, refresh_token, expires_in)
              
              // Store user data
              get().setUser(user)
              
              // Set authentication state
              set({ 
                isAuthenticated: true, 
                isLoading: false,
                error: null 
              })
              
              // Schedule token refresh
              get().scheduleTokenRefresh(expires_in)
              
              return true
            } else {
              set({ 
                error: response.message || 'Registration failed', 
                isLoading: false 
              })
              return false
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Registration failed'
            set({ 
              error: errorMessage, 
              isLoading: false 
            })
            return false
          }
        },

        logout: async () => {
          // Clear refresh timer
          get().clearRefreshTimer()
          
          // Clear all auth data
          get().clearAuth()
          
          // Optionally call logout endpoint to invalidate server-side session
          try {
            await authApi.logout()
          } catch (error) {
            console.error('Logout API call failed:', error)
            // Continue with local logout even if API call fails
          }
          
          // Clear chat store and other stores
          if (typeof window !== 'undefined') {
            const chatStore = (window as any).__CHAT_STORE__
            if (chatStore?.reset) {
              chatStore.reset()
            }
          }
          
          // Redirect to login page
          if (typeof window !== 'undefined') {
            window.location.href = '/login'
          }
        },

        refreshTokens: async () => {
          const refreshToken = get().refreshToken || localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
          
          if (!refreshToken) {
            console.error('No refresh token available')
            get().clearAuth()
            return false
          }

          try {
            const response = await authApi.refreshToken({ refresh_token: refreshToken })
            
            if (response.success && response.data) {
              const { access_token, refresh_token: newRefreshToken, expires_in } = response.data
              
              // Update tokens
              get().setTokens(access_token, newRefreshToken || refreshToken, expires_in)
              
              // Schedule next refresh
              get().scheduleTokenRefresh(expires_in)
              
              return true
            } else {
              console.error('Token refresh failed:', response.message)
              get().clearAuth()
              return false
            }
          } catch (error) {
            console.error('Token refresh error:', error)
            get().clearAuth()
            return false
          }
        },

        validateSession: async () => {
          set({ isLoading: true })
          
          try {
            const response = await authApi.validateToken()
            
            if (response.success && response.data?.valid) {
              const userData = response.data.user
              get().setUser(userData)
              set({ 
                isAuthenticated: true, 
                isLoading: false,
                error: null 
              })
              return true
            } else {
              get().clearAuth()
              set({ isLoading: false })
              return false
            }
          } catch (error) {
            console.error('Session validation failed:', error)
            get().clearAuth()
            set({ isLoading: false })
            return false
          }
        },

        setTokens: (accessToken, refreshToken, expiresIn) => {
          // Store in state
          set({ 
            accessToken, 
            refreshToken,
            tokenExpiresAt: calculateTokenExpiry(expiresIn)
          })
          
          // Store in localStorage for persistence
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken)
            localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken)
            localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRES, calculateTokenExpiry(expiresIn).toString())
            
            // Also set as cookie for SSR
            setCookie('auth_token', accessToken)
          }
        },

        setUser: (user) => {
          set({ user })
          
          // Store in localStorage for persistence
          if (typeof window !== 'undefined' && user) {
            localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user))
          }
        },

        clearAuth: () => {
          // Clear refresh timer
          get().clearRefreshTimer()
          
          // Clear state
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            tokenExpiresAt: null,
            error: null
          })
          
          // Clear localStorage
          if (typeof window !== 'undefined') {
            localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
            localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
            localStorage.removeItem(STORAGE_KEYS.USER_DATA)
            localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRES)
            
            // Clear cookies
            removeCookie('auth_token')
          }
        },

        clearError: () => set({ error: null }),

        restoreSession: async () => {
          if (typeof window === 'undefined') return false
          
          // Check for stored tokens
          const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
          const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
          const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA)
          const tokenExpires = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES)
          
          if (!accessToken || !refreshToken) {
            get().clearAuth()
            return false
          }
          
          // Check if access token is expired
          if (isTokenExpired(accessToken)) {
            console.log('Access token expired, attempting refresh...')
            const refreshSuccess = await get().refreshTokens()
            return refreshSuccess
          }
          
          // Restore session data
          if (userData) {
            try {
              const user = JSON.parse(userData)
              set({
                user,
                accessToken,
                refreshToken,
                isAuthenticated: true,
                tokenExpiresAt: tokenExpires ? parseInt(tokenExpires) : null
              })
              
              // Validate session with backend
              const isValid = await get().validateSession()
              
              if (isValid) {
                // Schedule token refresh
                const expiresAt = tokenExpires ? parseInt(tokenExpires) : 0
                const expiresIn = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
                if (expiresIn > 0) {
                  get().scheduleTokenRefresh(expiresIn)
                }
              }
              
              return isValid
            } catch (error) {
              console.error('Failed to restore session:', error)
              get().clearAuth()
              return false
            }
          }
          
          // If we have tokens but no user data, validate with backend
          set({ accessToken, refreshToken })
          const isValid = await get().validateSession()
          
          if (isValid) {
            // Schedule token refresh
            const expiresAt = tokenExpires ? parseInt(tokenExpires) : 0
            const expiresIn = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
            if (expiresIn > 0) {
              get().scheduleTokenRefresh(expiresIn)
            }
          }
          
          return isValid
        },

        scheduleTokenRefresh: (expiresIn) => {
          // Clear existing timer
          get().clearRefreshTimer()
          
          // Schedule refresh 2 minutes before expiry
          const refreshTime = Math.max(0, (expiresIn - 120) * 1000)
          
          if (refreshTime > 0) {
            const timer = setTimeout(() => {
              console.log('Auto-refreshing token...')
              get().refreshTokens()
            }, refreshTime)
            
            set({ refreshTimer: timer })
          }
        },

        clearRefreshTimer: () => {
          const timer = get().refreshTimer
          if (timer) {
            clearTimeout(timer)
            set({ refreshTimer: undefined })
          }
        }
      }),
      {
        name: 'auth-store',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated
        })
      }
    ),
    { name: 'auth-store' }
  )
)

// Initialize auth store on app start
if (typeof window !== 'undefined') {
  // Store reference for other stores to access
  (window as any).__AUTH_STORE__ = useAuthStore
  
  // Restore session on app start
  useAuthStore.getState().restoreSession().then((restored) => {
    console.log('Session restoration:', restored ? 'successful' : 'failed')
  })
}

// Helper hook for auth status
export const useAuth = () => {
  const { 
    user, 
    isAuthenticated, 
    isLoading, 
    error,
    login,
    logout,
    register,
    clearError
  } = useAuthStore()
  
  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    register,
    clearError
  }
}