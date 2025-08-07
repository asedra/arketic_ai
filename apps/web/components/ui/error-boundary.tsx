"use client"

import React from "react"
import { AlertTriangle, RefreshCw, Mail, Home } from "lucide-react"
import { Button } from "./button"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Badge } from "./badge"
import { classifyError, getErrorBoundaryFallback, handleError, type AppError } from "@/lib/error-handling"

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  level?: "page" | "component" | "section"
  showReportButton?: boolean
  context?: Record<string, any>
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryCount = 0
  private maxRetries = 3

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { context, onError } = this.props
    
    // Enhanced error handling with context
    const enrichedError = {
      ...error,
      componentStack: errorInfo.componentStack,
      errorBoundaryLevel: this.props.level || "component",
      context: {
        ...context,
        retryCount: this.retryCount,
        timestamp: new Date().toISOString()
      }
    }

    // Use global error handler
    handleError(error, enrichedError.context)
    
    // Call custom error handler if provided
    onError?.(error, errorInfo)
  }

  resetError = () => {
    this.retryCount++
    this.setState({ hasError: false, error: null })
  }

  reportError = () => {
    if (this.state.error) {
      // In a real app, this would open a support ticket or feedback form
      const subject = encodeURIComponent(`Error Report: ${this.state.error.name}`)
      const body = encodeURIComponent(
        `Error: ${this.state.error.message}\n\n` +
        `Stack: ${this.state.error.stack}\n\n` +
        `Timestamp: ${new Date().toISOString()}\n` +
        `User Agent: ${navigator.userAgent}`
      )
      window.open(`mailto:support@arketic.com?subject=${subject}&body=${body}`)
    }
  }

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback, level = "component", showReportButton = true } = this.props
      
      if (Fallback && this.state.error) {
        return <Fallback error={this.state.error} resetError={this.resetError} />
      }

      if (!this.state.error) return null

      const errorDetails = getErrorBoundaryFallback(this.state.error, this.resetError)
      const isPageLevel = level === "page"
      const tooManyRetries = this.retryCount >= this.maxRetries

      const content = (
        <Card className={`border-red-200 dark:border-red-800 ${isPageLevel ? 'mx-auto max-w-md' : ''}`}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
                {errorDetails.title}
              </CardTitle>
              {errorDetails.severity && (
                <Badge 
                  variant={errorDetails.severity === "critical" ? "destructive" : "secondary"}
                  className="text-xs"
                >
                  {errorDetails.severity}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {errorDetails.message}
            </p>
            
            {tooManyRetries && (
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md">
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  Multiple retry attempts failed. This might be a persistent issue.
                </p>
              </div>
            )}

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-xs">
                <summary className="cursor-pointer text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300">
                  Error Details (Development)
                </summary>
                <div className="mt-2 space-y-2">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded">
                    <strong>Error:</strong> {this.state.error.message}
                  </div>
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded">
                    <strong>Retry Count:</strong> {this.retryCount}
                  </div>
                  <pre className="p-2 bg-slate-100 dark:bg-slate-800 rounded text-red-600 dark:text-red-400 whitespace-pre-wrap text-xs overflow-auto max-h-32">
                    {this.state.error.stack}
                  </pre>
                </div>
              </details>
            )}

            <div className="flex flex-wrap gap-2">
              {errorDetails.canRetry && !tooManyRetries && (
                <Button 
                  onClick={this.resetError}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again ({this.maxRetries - this.retryCount} left)
                </Button>
              )}
              
              {isPageLevel && (
                <Button 
                  onClick={() => window.location.href = '/'}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  Go Home
                </Button>
              )}
              
              {showReportButton && (
                <Button 
                  onClick={this.reportError}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Report Issue
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )

      if (isPageLevel) {
        return (
          <div className="min-h-[50vh] flex items-center justify-center p-4">
            {content}
          </div>
        )
      }

      return content
    }

    return this.props.children
  }
}

// Hook-based error boundary for functional components
export function useErrorHandler() {
  return (error: Error, context?: Record<string, any>) => {
    handleError(error, context)
  }
}

// Async error boundary for handling promise rejections
export function AsyncErrorBoundary({ 
  children, 
  fallback 
}: { 
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
}) {
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      setError(new Error(event.reason))
      event.preventDefault()
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  const resetError = () => setError(null)

  if (error) {
    if (fallback) {
      const Fallback = fallback
      return <Fallback error={error} resetError={resetError} />
    }

    return (
      <ErrorBoundary>
        <div>Async Error: {error.message}</div>
      </ErrorBoundary>
    )
  }

  return <>{children}</>
}

// Network-aware error boundary
export function NetworkErrorBoundary({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine)

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isOnline) {
    return (
      <Card className="border-orange-200 dark:border-orange-800">
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No Internet Connection
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Please check your internet connection and try again.
          </p>
          <Button 
            onClick={() => window.location.reload()}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return <>{children}</>
}