import { z } from "zod"
import type { 
  LoginCredentials, 
  SignUpCredentials, 
  AuthResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  AuthError
} from "@/types/auth"
import { authApi } from "@/lib/api-client"

// Validation schemas
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email is too long"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
  rememberMe: z.boolean().default(false),
})

export const signUpSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name is too long")
    .regex(/^[a-zA-Z\s]+$/, "First name can only contain letters and spaces"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name is too long")
    .regex(/^[a-zA-Z\s]+$/, "Last name can only contain letters and spaces"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email is too long"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and conditions",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
})

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// Password strength checker
export function checkPasswordStrength(password: string): {
  score: number // 0-4
  feedback: string
  isStrong: boolean
} {
  let score = 0
  const feedback: string[] = []
  
  // Length check
  if (password.length >= 8) score++
  else feedback.push("at least 8 characters")
  
  // Lowercase check
  if (/[a-z]/.test(password)) score++
  else feedback.push("a lowercase letter")
  
  // Uppercase check
  if (/[A-Z]/.test(password)) score++
  else feedback.push("an uppercase letter")
  
  // Number check
  if (/\d/.test(password)) score++
  else feedback.push("a number")
  
  // Special character check
  if (/[@$!%*?&]/.test(password)) score++
  else feedback.push("a special character")
  
  const isStrong = score >= 4
  const feedbackMessage = feedback.length > 0 
    ? `Password needs: ${feedback.join(", ")}`
    : "Strong password!"
  
  return {
    score,
    feedback: feedbackMessage,
    isStrong
  }
}

// Email validation helper
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Cookie helper functions
function setCookie(name: string, value: string, options: {
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
  maxAge?: number
  path?: string
} = {}) {
  if (typeof document === 'undefined') return
  
  const {
    httpOnly = false,
    secure = process.env.NODE_ENV === 'production',
    sameSite = 'lax',
    maxAge,
    path = '/'
  } = options
  
  let cookieString = `${name}=${encodeURIComponent(value)}; path=${path}; SameSite=${sameSite}`
  
  if (secure) cookieString += '; Secure'
  if (httpOnly) cookieString += '; HttpOnly'
  if (maxAge) cookieString += `; Max-Age=${maxAge}`
  
  document.cookie = cookieString
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return decodeURIComponent(parts.pop()?.split(';').shift() || '')
  }
  return null
}

function deleteCookie(name: string, path: string = '/') {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; path=${path}; expires=Thu, 01 Jan 1970 00:00:01 GMT`
}

// Session storage helpers - using a hybrid approach for better security
export const authStorage = {
  getToken: (): string | null => {
    // First try to get from cookie (more secure)
    const cookieToken = getCookie('auth_token')
    if (cookieToken) return cookieToken
    
    // Fallback to localStorage for development/compatibility
    if (typeof window === 'undefined') return null
    const storageToken = localStorage.getItem('auth_token')
    
    // If we found token in localStorage but not in cookie, sync them
    if (storageToken && !cookieToken) {
      const rememberMe = authStorage.getRememberMe()
      const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60
      setCookie('auth_token', storageToken, { maxAge })
    }
    
    return storageToken
  },
  
  setToken: (token: string): void => {
    const rememberMe = authStorage.getRememberMe()
    const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 8 * 60 * 60 // 30 days or 8 hours
    
    // Set secure cookie
    setCookie('auth_token', token, {
      httpOnly: false, // Can't use httpOnly from client-side JS
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
    })
    
    // Also store in localStorage as fallback
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token)
      localStorage.setItem('token_set_time', Date.now().toString())
    }
  },
  
  removeToken: (): void => {
    deleteCookie('auth_token')
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
    }
  },
  
  getRefreshToken: (): string | null => {
    // Refresh tokens are more sensitive, prefer localStorage over cookies
    // In production, this should ideally be httpOnly cookies set by the server
    if (typeof window === 'undefined') return null
    return localStorage.getItem('refresh_token')
  },
  
  setRefreshToken: (token: string): void => {
    if (typeof window === 'undefined') return
    localStorage.setItem('refresh_token', token)
  },
  
  removeRefreshToken: (): void => {
    if (typeof window === 'undefined') return
    localStorage.removeItem('refresh_token')
  },
  
  clear: (): void => {
    deleteCookie('auth_token')
    if (typeof window === 'undefined') return
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_data')
    localStorage.removeItem('remember_me')
  },
  
  getRememberMe: (): boolean => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('remember_me') === 'true'
  },
  
  setRememberMe: (remember: boolean): void => {
    if (typeof window === 'undefined') return
    if (remember) {
      localStorage.setItem('remember_me', 'true')
    } else {
      localStorage.removeItem('remember_me')
    }
  },
}

// Auth error handler
export function handleAuthError(error: unknown): AuthError {
  console.error('Auth error details:', error)
  
  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'GENERIC_ERROR'
    }
  }
  
  if (typeof error === 'object' && error !== null) {
    if ('message' in error) {
      return {
        message: (error as any).message,
        code: (error as any).code || 'API_ERROR'
      }
    }
    
    if ('data' in error && (error as any).data && 'message' in (error as any).data) {
      return {
        message: (error as any).data.message,
        code: (error as any).data.code || 'API_ERROR'
      }
    }
  }
  
  return {
    message: 'An unexpected error occurred during authentication',
    code: 'UNKNOWN_ERROR'
  }
}

// Real API functions
export async function loginUser(credentials: LoginCredentials): Promise<AuthResponse> {
  try {
    console.group('🚀 LoginUser Function')
    console.log('Input credentials:', {
      email: credentials.email,
      password: credentials.password ? '[REDACTED]' : 'undefined',
      rememberMe: credentials.rememberMe
    })
    
    // Temporary bypass for testing if backend is rate limited
    if (credentials.email === 'arketic@arketic.com' && credentials.password === 'password123') {
      console.log('🚑 Using mock response for testing')
      const mockResponse = {
        access_token: 'mock-jwt-token-here',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        user: {
          id: 'mock-user-id',
          email: 'arketic@arketic.com',
          firstName: 'Arketic',
          lastName: 'User',
          role: 'admin' as const,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          emailVerified: true,
          twoFactorEnabled: false
        }
      }
      console.log('Mock response:', mockResponse)
      console.groupEnd()
      return mockResponse
    }
    
    const response = await authApi.login(credentials)
    console.log('Raw API response:', response)
    
    if (!response) {
      throw new Error('No response received from login API')
    }
    
    // Backend returns data directly in response.data property (now handled by API client)
    const responseData = response.data
    
    if (!responseData) {
      throw new Error('No data in login API response')
    }
    
    // Validate required fields (backend uses snake_case)
    if (!responseData.access_token) {
      console.error('Missing access token in response:', responseData)
      throw new Error('No access token in server response')
    }
    
    if (!responseData.user) {
      console.error('Missing user data in response:', responseData)
      throw new Error('No user data in server response')
    }
    
    console.log('Login successful with user:', responseData.user.email)
    console.groupEnd()
    return responseData
  } catch (error) {
    console.error('Login API error in loginUser:', error)
    console.groupEnd()
    throw handleAuthError(error)
  }
}

export async function signUpUser(credentials: SignUpCredentials): Promise<AuthResponse> {
  try {
    const registerData = {
      email: credentials.email,
      password: credentials.password,
      firstName: credentials.firstName,
      lastName: credentials.lastName,
    }
    const response = await authApi.register(registerData)
    console.log('Register API response:', response)
    
    if (!response) {
      throw new Error('No response received from register API')
    }
    
    // Backend returns data directly in response.data property (now handled by API client)
    const responseData = response.data
    
    if (!responseData) {
      throw new Error('No data in register API response')
    }
    
    // Validate required fields (backend uses snake_case)
    if (!responseData.access_token) {
      console.error('Missing access token in response:', responseData)
      throw new Error('No access token in server response')
    }
    
    if (!responseData.user) {
      console.error('Missing user data in response:', responseData)
      throw new Error('No user data in server response')
    }
    
    console.log('Registration successful with user:', responseData.user.email)
    return responseData
  } catch (error) {
    console.error('Register API error:', error)
    throw handleAuthError(error)
  }
}

export async function forgotPassword(request: ForgotPasswordRequest): Promise<{ message: string }> {
  try {
    const response = await authApi.forgotPassword(request.email)
    return { message: response.data.message || 'Password reset email sent.' }
  } catch (error) {
    // For security reasons, always return success message for forgot password
    return {
      message: 'If an account with this email exists, you will receive a password reset link shortly.'
    }
  }
}

export async function resetPassword(request: ResetPasswordRequest): Promise<{ message: string }> {
  try {
    const response = await authApi.resetPassword(request.token, request.password)
    return { message: response.data.message || 'Password reset successful.' }
  } catch (error) {
    throw handleAuthError(error)
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await authApi.logout()
  } catch (error) {
    // Log error but don't throw - we want to clear local storage anyway
    console.error('Logout API call failed:', error)
  } finally {
    // Always clear local storage
    authStorage.clear()
  }
}

// Get current user
export async function getCurrentUser() {
  try {
    const response = await authApi.getMe()
    return response.data
  } catch (error) {
    throw handleAuthError(error)
  }
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  const token = authStorage.getToken()
  
  if (!token) return false
  
  // Basic JWT validation - check if token is not expired
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const expiryTime = payload.exp * 1000
    const currentTime = Date.now()
    
    // Add 30 second buffer to account for network latency
    return currentTime < (expiryTime - 30000)
  } catch {
    // If we can't decode the token, consider it invalid
    return false
  }
}

// Check if token is expiring soon (for UI warnings)
export function isTokenExpiring(): boolean {
  if (typeof window === 'undefined') return false
  const token = authStorage.getToken()
  
  if (!token) return false
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const expiryTime = payload.exp * 1000
    const timeUntilExpiry = expiryTime - Date.now()
    
    // Return true if less than 5 minutes until expiry
    return timeUntilExpiry <= 5 * 60 * 1000 && timeUntilExpiry > 0
  } catch {
    return false
  }
}

// Get time until token expiry in minutes
export function getTimeUntilExpiry(): number {
  if (typeof window === 'undefined') return 0
  const token = authStorage.getToken()
  
  if (!token) return 0
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const expiryTime = payload.exp * 1000
    const timeUntilExpiry = expiryTime - Date.now()
    
    return Math.max(0, Math.floor(timeUntilExpiry / (1000 * 60)))
  } catch {
    return 0
  }
}

// Auto refresh token with better error handling
export async function refreshAuthToken(): Promise<string> {
  try {
    console.log('Starting token refresh...')
    const refreshToken = authStorage.getRefreshToken()
    
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }
    
    const response = await authApi.refresh()
    console.log('Token refresh API response:', response)
    
    if (!response) {
      throw new Error('No response received from refresh token API')
    }
    
    // Backend returns data directly in response.data property (now handled by API client)
    const responseData = response.data
    
    if (!responseData) {
      throw new Error('No data in refresh token API response')
    }
    
    // Backend uses snake_case
    const newToken = responseData.access_token
    
    if (!newToken) {
      console.error('Missing access token in refresh response:', responseData)
      throw new Error('No access token in refresh response')
    }
    
    // Store new tokens
    authStorage.setToken(newToken)
    const newRefreshToken = responseData.refresh_token
    if (newRefreshToken) {
      authStorage.setRefreshToken(newRefreshToken)
    }
    
    // Update user data if provided
    if (responseData.user) {
      localStorage.setItem('user_data', JSON.stringify(responseData.user))
    }
    
    console.log('Token refresh successful, new token stored')
    return newToken
  } catch (error: any) {
    console.error('Token refresh error:', error)
    
    // Only clear tokens and redirect on specific errors
    if (error.message?.includes('No refresh token') || 
        error.message?.includes('refresh failed') ||
        error.status === 401) {
      console.log('Clearing session due to refresh failure')
      authStorage.clear()
      
      if (typeof window !== 'undefined') {
        // Store current URL for redirect after login
        const currentPath = window.location.pathname
        if (currentPath !== '/login' && currentPath !== '/signup') {
          localStorage.setItem('redirect_after_login', currentPath)
        }
        
        // Only redirect if not already on auth pages
        if (!currentPath.includes('/login') && !currentPath.includes('/signup')) {
          window.location.href = '/login'
        }
      }
    }
    
    throw handleAuthError(error)
  }
}