"use client"

import { toast } from "@/hooks/use-toast"

export type ErrorSeverity = "low" | "medium" | "high" | "critical"

export interface AppError extends Error {
  code?: string
  severity?: ErrorSeverity
  userMessage?: string
  timestamp?: Date
  context?: Record<string, any>
  retryable?: boolean
}

export class CustomError extends Error implements AppError {
  code?: string
  severity: ErrorSeverity
  userMessage: string
  timestamp: Date
  context?: Record<string, any>
  retryable: boolean

  constructor(
    message: string,
    options: {
      code?: string
      severity?: ErrorSeverity
      userMessage?: string
      context?: Record<string, any>
      retryable?: boolean
    } = {}
  ) {
    super(message)
    this.name = "CustomError"
    this.code = options.code
    this.severity = options.severity || "medium"
    this.userMessage = options.userMessage || "Something went wrong. Please try again."
    this.timestamp = new Date()
    this.context = options.context
    this.retryable = options.retryable ?? true
  }
}

export class NetworkError extends CustomError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, {
      code: "NETWORK_ERROR",
      severity: "high",
      userMessage: "Unable to connect to the server. Please check your internet connection and try again.",
      context,
      retryable: true
    })
    this.name = "NetworkError"
  }
}

export class ValidationError extends CustomError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, {
      code: "VALIDATION_ERROR",
      severity: "low",
      userMessage: "Please check your input and try again.",
      context,
      retryable: false
    })
    this.name = "ValidationError"
  }
}

export class UnauthorizedError extends CustomError {
  constructor(message: string = "Unauthorized access") {
    super(message, {
      code: "UNAUTHORIZED",
      severity: "high",
      userMessage: "You don't have permission to perform this action. Please sign in again.",
      retryable: false
    })
    this.name = "UnauthorizedError"
  }
}

export class NotFoundError extends CustomError {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`, {
      code: "NOT_FOUND",
      severity: "medium",
      userMessage: `The requested ${resource.toLowerCase()} could not be found.`,
      retryable: false
    })
    this.name = "NotFoundError"
  }
}

export class ServerError extends CustomError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, {
      code: "SERVER_ERROR",
      severity: "critical",
      userMessage: "Our servers are experiencing issues. We're working to fix this. Please try again later.",
      context,
      retryable: true
    })
    this.name = "ServerError"
  }
}

// Error classification helper
export function classifyError(error: Error): AppError {
  if (error instanceof CustomError) {
    return error
  }

  // Network errors
  if (error.message.includes("fetch") || error.message.includes("network")) {
    return new NetworkError(error.message)
  }

  // Validation errors
  if (error.message.includes("validation") || error.message.includes("invalid")) {
    return new ValidationError(error.message)
  }

  // Default classification
  return new CustomError(error.message, {
    code: "UNKNOWN_ERROR",
    severity: "medium",
    userMessage: "An unexpected error occurred. Please try again.",
    retryable: true
  })
}

// Global error handler
export class ErrorHandler {
  private static instance: ErrorHandler
  private errorReportingEnabled = process.env.NODE_ENV === "production"

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler()
    }
    return ErrorHandler.instance
  }

  handleError(error: Error, context?: Record<string, any>): void {
    const appError = classifyError(error)
    
    // Add context if provided
    if (context && appError.context) {
      appError.context = { ...appError.context, ...context }
    } else if (context) {
      appError.context = context
    }

    // Log error (in development) or report to service (in production)
    this.logError(appError)

    // Show user-friendly notification
    this.showUserNotification(appError)
  }

  private logError(error: AppError): void {
    const logData = {
      name: error.name,
      message: error.message,
      code: error.code,
      severity: error.severity,
      timestamp: error.timestamp,
      context: error.context,
      stack: error.stack
    }

    if (this.errorReportingEnabled) {
      // In production, send to error reporting service
      console.error("Error reported:", logData)
      // TODO: Integrate with error reporting service like Sentry
    } else {
      // In development, log to console
      console.group(`🚨 ${error.severity?.toUpperCase()} ERROR`)
      console.error("Error:", error.message)
      console.error("Code:", error.code)
      console.error("User Message:", error.userMessage)
      console.error("Context:", error.context)
      console.error("Stack:", error.stack)
      console.groupEnd()
    }
  }

  private showUserNotification(error: AppError): void {
    const toastOptions = {
      title: this.getErrorTitle(error.severity),
      description: error.userMessage,
      variant: this.getToastVariant(error.severity)
    }

    // Don't show toast for low severity errors unless in development
    if (error.severity === "low" && process.env.NODE_ENV === "production") {
      return
    }

    toast(toastOptions as any)
  }

  private getErrorTitle(severity?: ErrorSeverity): string {
    switch (severity) {
      case "critical":
        return "Critical Error"
      case "high":
        return "Error"
      case "medium":
        return "Warning"
      case "low":
        return "Notice"
      default:
        return "Error"
    }
  }

  private getToastVariant(severity?: ErrorSeverity): "default" | "destructive" {
    return severity === "low" ? "default" : "destructive"
  }
}

// Convenience function for global error handling
export const handleError = (error: Error, context?: Record<string, any>) => {
  ErrorHandler.getInstance().handleError(error, context)
}

// Error boundary helper for React Error Boundaries
export function getErrorBoundaryFallback(error: Error, resetError: () => void) {
  const appError = classifyError(error)
  
  return {
    title: appError.severity === "critical" ? "Application Error" : "Something went wrong",
    message: appError.userMessage,
    canRetry: appError.retryable,
    onRetry: resetError,
    severity: appError.severity
  }
}

// Retry helper with exponential backoff
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number
    baseDelay?: number
    maxDelay?: number
    backoffFactor?: number
    retryCondition?: (error: Error) => boolean
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    retryCondition = (error) => classifyError(error).retryable
  } = options

  let lastError: Error

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === maxAttempts || !retryCondition(lastError)) {
        throw lastError
      }

      const delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt - 1), maxDelay)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

// Circuit breaker pattern for preventing cascading failures
export class CircuitBreaker {
  private failureCount = 0
  private lastFailureTime = 0
  private state: "closed" | "open" | "half-open" = "closed"

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly recoveryTimeout: number = 60000 // 1 minute
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime < this.recoveryTimeout) {
        throw new CustomError("Circuit breaker is open", {
          code: "CIRCUIT_BREAKER_OPEN",
          severity: "high",
          userMessage: "Service is temporarily unavailable. Please try again later.",
          retryable: true
        })
      } else {
        this.state = "half-open"
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess(): void {
    this.failureCount = 0
    this.state = "closed"
  }

  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()

    if (this.failureCount >= this.failureThreshold) {
      this.state = "open"
    }
  }

  getState(): "closed" | "open" | "half-open" {
    return this.state
  }
}