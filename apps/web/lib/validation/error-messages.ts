// Authentication error messages
export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: "Invalid email or password. Please try again.",
  ACCOUNT_LOCKED: "Your account has been temporarily locked. Please try again later.",
  EMAIL_NOT_VERIFIED: "Please verify your email address before signing in.",
  SERVER_ERROR: "Something went wrong. Please try again.",
  NETWORK_ERROR: "Connection error. Please check your internet connection.",
  RATE_LIMITED: "Too many attempts. Please wait before trying again.",
  TOKEN_EXPIRED: "Your session has expired. Please sign in again.",
  VALIDATION_FAILED: "Please correct the errors below and try again.",
  EMAIL_ALREADY_EXISTS: "An account with this email already exists.",
  WEAK_PASSWORD: "Password is too weak. Please choose a stronger password.",
  ACCOUNT_NOT_FOUND: "No account found with this email address.",
  INVALID_RESET_TOKEN: "Invalid or expired reset token. Please request a new one.",
  PERMISSION_DENIED: "You don't have permission to perform this action.",
  SESSION_EXPIRED: "Your session has expired. Please sign in again.",
} as const

// Validation error messages
export const VALIDATION_ERRORS = {
  REQUIRED: "This field is required",
  EMAIL_INVALID: "Please enter a valid email address",
  EMAIL_TOO_LONG: "Email address is too long",
  PASSWORD_TOO_SHORT: "Password must be at least 8 characters",
  PASSWORD_TOO_LONG: "Password is too long (max 128 characters)",
  PASSWORD_TOO_WEAK: "Password must contain uppercase, lowercase, number, and special character",
  PASSWORDS_DONT_MATCH: "Passwords do not match",
  NAME_TOO_SHORT: "Name must be at least 2 characters",
  NAME_TOO_LONG: "Name is too long (max 50 characters)",
  NAME_INVALID_CHARS: "Name can only contain letters and spaces",
  TERMS_NOT_ACCEPTED: "You must accept the terms and conditions",
  INVALID_FORMAT: "Invalid format",
  FIELD_REQUIRED: "This field is required",
} as const

// Success messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: "Welcome back! You have successfully signed in.",
  SIGNUP_SUCCESS: "Account created successfully! Welcome to Arketic.",
  LOGOUT_SUCCESS: "You have been successfully logged out.",
  PASSWORD_RESET_EMAIL_SENT: "Password reset instructions have been sent to your email.",
  PASSWORD_RESET_SUCCESS: "Your password has been reset successfully.",
  EMAIL_VERIFIED: "Your email has been verified successfully.",
  PROFILE_UPDATED: "Your profile has been updated successfully.",
  SETTINGS_SAVED: "Your settings have been saved.",
} as const

// Form field labels
export const FIELD_LABELS = {
  EMAIL: "Email Address",
  PASSWORD: "Password",
  CONFIRM_PASSWORD: "Confirm Password",
  FIRST_NAME: "First Name",
  LAST_NAME: "Last Name",
  FULL_NAME: "Full Name",
  REMEMBER_ME: "Remember me",
  ACCEPT_TERMS: "I accept the terms and conditions",
} as const

// Form placeholders
export const PLACEHOLDERS = {
  EMAIL: "Enter your email address",
  PASSWORD: "Enter your password",
  CONFIRM_PASSWORD: "Confirm your password",
  FIRST_NAME: "John",
  LAST_NAME: "Doe",
  FULL_NAME: "John Doe",
  NEW_PASSWORD: "Create a strong password",
} as const

// Button labels
export const BUTTON_LABELS = {
  SIGN_IN: "Sign In",
  SIGN_UP: "Sign Up",
  SIGNING_IN: "Signing in...",
  SIGNING_UP: "Creating account...",
  RESET_PASSWORD: "Reset Password",
  RESETTING_PASSWORD: "Resetting password...",
  SEND_RESET_EMAIL: "Send Reset Email",
  SENDING_EMAIL: "Sending email...",
  SAVE_CHANGES: "Save Changes",
  SAVING: "Saving...",
  CANCEL: "Cancel",
  CONTINUE: "Continue",
  BACK: "Back",
  RETRY: "Retry",
} as const

// Helper function to get error message
export function getErrorMessage(error: string | undefined): string {
  if (!error) return AUTH_ERRORS.SERVER_ERROR
  
  const errorLower = error.toLowerCase()
  
  if (errorLower.includes('invalid') || errorLower.includes('unauthorized')) {
    return AUTH_ERRORS.INVALID_CREDENTIALS
  }
  if (errorLower.includes('network') || errorLower.includes('fetch')) {
    return AUTH_ERRORS.NETWORK_ERROR
  }
  if (errorLower.includes('rate') || errorLower.includes('too many')) {
    return AUTH_ERRORS.RATE_LIMITED
  }
  if (errorLower.includes('locked')) {
    return AUTH_ERRORS.ACCOUNT_LOCKED
  }
  if (errorLower.includes('expired')) {
    return AUTH_ERRORS.TOKEN_EXPIRED
  }
  if (errorLower.includes('exists')) {
    return AUTH_ERRORS.EMAIL_ALREADY_EXISTS
  }
  if (errorLower.includes('not found')) {
    return AUTH_ERRORS.ACCOUNT_NOT_FOUND
  }
  
  return error || AUTH_ERRORS.SERVER_ERROR
}