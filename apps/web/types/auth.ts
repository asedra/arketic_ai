// Authentication related types

export interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
}

export interface SignUpCredentials {
  email: string
  password: string
  confirmPassword: string
  firstName: string
  lastName: string
  acceptTerms: boolean
}

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  avatar?: string
  role: 'admin' | 'user' | 'moderator'
  createdAt: string
  updatedAt: string
  emailVerified: boolean
  twoFactorEnabled: boolean
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

export interface AuthResponse {
  user: User
  accessToken?: string
  refreshToken?: string
  expiresIn?: number
  // Also support snake_case from backend
  access_token?: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  password: string
  confirmPassword: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface LoginFormData {
  email: string
  password: string
  rememberMe: boolean
}

export type LoginFormValues = LoginFormData

// Register form data
export interface RegisterFormData {
  email: string
  password: string
  firstName: string
  lastName: string
}

export interface SignUpFormData {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
  acceptTerms: boolean
}

export interface ForgotPasswordFormData {
  email: string
}

export interface ResetPasswordFormData {
  password: string
  confirmPassword: string
}

// API Error types
export interface AuthError {
  message: string
  code: string
  field?: string
}

export interface ValidationError {
  field: string
  message: string
}

// Session types
export interface Session {
  id: string
  userId: string
  deviceInfo: {
    userAgent: string
    ip: string
    location?: string
  }
  createdAt: string
  lastActivity: string
  isActive: boolean
}

// OAuth types
export interface OAuthProvider {
  id: 'google' | 'github' | 'microsoft'
  name: string
  icon: string
}

export interface OAuthResponse {
  user: User
  accessToken: string
  refreshToken: string
  provider: string
}

// Token refresh response
export interface TokenRefreshResponse {
  accessToken?: string
  refreshToken?: string
  expiresIn?: number
  // Also support snake_case from backend
  access_token?: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
}

// Auth API response wrapper
export interface AuthApiResponse<T> {
  data: T
  success: boolean
  message?: string
  errors?: Record<string, string[]>
}