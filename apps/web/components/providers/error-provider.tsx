"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { ErrorBoundary, AsyncErrorBoundary, NetworkErrorBoundary } from "@/components/ui/error-boundary"
import { NetworkStatus } from "@/components/ui/loading"
import { useNetworkStatus } from "@/hooks/use-api"
import { handleError, type AppError } from "@/lib/error-handling"
import { Toaster } from "@/components/ui/toaster"
import { toast } from "@/hooks/use-toast"

interface ErrorContextValue {
  reportError: (error: Error, context?: Record<string, any>) => void
  clearError: () => void
  retryLastAction: () => void
  isOffline: boolean
  hasNetworkIssues: boolean
}

const ErrorContext = createContext<ErrorContextValue | undefined>(undefined)

interface ErrorProviderProps {
  children: React.ReactNode
  enableNetworkDetection?: boolean
  enableGlobalErrorHandling?: boolean
  reportingEndpoint?: string
}

export function ErrorProvider({ 
  children, 
  enableNetworkDetection = true,
  enableGlobalErrorHandling = true,
  reportingEndpoint 
}: ErrorProviderProps) {
  const [lastAction, setLastAction] = useState<(() => void) | null>(null)
  const { isOnline, isConnected, hasNetworkIssues } = useNetworkStatus()

  useEffect(() => {
    if (!enableGlobalErrorHandling) return

    // Global error handlers
    const handleGlobalError = (event: ErrorEvent) => {
      const error = event.error || new Error(event.message)
      handleError(error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        source: 'global-error-handler'
      })
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason))
      
      handleError(error, {
        source: 'unhandled-promise-rejection'
      })
      
      // Prevent default browser behavior
      event.preventDefault()
    }

    const handleResourceError = (event: Event) => {
      const target = event.target as HTMLElement
      if (target && (target.tagName === 'IMG' || target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
        const resourceUrl = (target as any).src || (target as any).href
        handleError(new Error(`Failed to load resource: ${resourceUrl}`), {
          source: 'resource-error',
          resourceType: target.tagName.toLowerCase(),
          resourceUrl
        })
      }
    }

    // Add event listeners
    window.addEventListener('error', handleGlobalError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleResourceError, true) // Capture phase for resource errors

    return () => {
      window.removeEventListener('error', handleGlobalError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleResourceError, true)
    }
  }, [enableGlobalErrorHandling])

  // Network status notifications
  useEffect(() => {
    if (!enableNetworkDetection) return

    if (!isOnline) {
      toast({
        title: "Connection Lost",
        description: "You're currently offline. Some features may not work.",
        variant: "destructive",
      })
    } else if (isConnected === false) {
      toast({
        title: "Connection Issues",
        description: "Having trouble connecting to our servers. Retrying...",
        variant: "destructive",
      })
    } else if (isOnline && isConnected === true) {
      // Show reconnection success only if we were previously offline
      const wasOffline = sessionStorage.getItem('was-offline')
      if (wasOffline) {
        toast({
          title: "Back Online",
          description: "Connection restored successfully.",
          variant: "default",
        })
        sessionStorage.removeItem('was-offline')
      }
    }

    // Remember offline state
    if (!isOnline || isConnected === false) {
      sessionStorage.setItem('was-offline', 'true')
    }
  }, [isOnline, isConnected, enableNetworkDetection])

  const reportError = (error: Error, context?: Record<string, any>) => {
    handleError(error, context)
  }

  const clearError = () => {
    // Clear any persisted error state if needed
    sessionStorage.removeItem('app-error')
  }

  const retryLastAction = () => {
    if (lastAction) {
      try {
        lastAction()
      } catch (error) {
        reportError(error as Error, { source: 'retry-action' })
      }
    }
  }

  const contextValue: ErrorContextValue = {
    reportError,
    clearError,
    retryLastAction,
    isOffline: !isOnline,
    hasNetworkIssues
  }

  return (
    <ErrorContext.Provider value={contextValue}>
      <ErrorBoundary 
        level="page"
        onError={(error, errorInfo) => {
          reportError(error, { 
            componentStack: errorInfo.componentStack,
            source: 'error-boundary'
          })
        }}
      >
        <AsyncErrorBoundary>
          <NetworkErrorBoundary>
            {enableNetworkDetection && (
              <NetworkStatus 
                isOnline={isOnline} 
                isConnected={isConnected} 
                className="fixed top-4 right-4 z-50"
              />
            )}
            {children}
            <Toaster />
          </NetworkErrorBoundary>
        </AsyncErrorBoundary>
      </ErrorBoundary>
    </ErrorContext.Provider>
  )
}

export function useErrorHandler() {
  const context = useContext(ErrorContext)
  if (context === undefined) {
    throw new Error('useErrorHandler must be used within an ErrorProvider')
  }
  return context
}

// HOC for wrapping components with error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryOptions?: {
    level?: "page" | "component" | "section"
    fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  }
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryOptions}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}

// Hook for graceful error handling in components
export function useGracefulError() {
  const { reportError } = useErrorHandler()

  const handleAsyncError = (asyncFn: () => Promise<any>) => {
    return async (...args: any[]) => {
      try {
        return await asyncFn.apply(null, args)
      } catch (error) {
        reportError(error as Error, { source: 'async-handler' })
        throw error // Re-throw so the component can handle it if needed
      }
    }
  }

  const handleSyncError = (syncFn: () => any) => {
    return (...args: any[]) => {
      try {
        return syncFn.apply(null, args)
      } catch (error) {
        reportError(error as Error, { source: 'sync-handler' })
        throw error
      }
    }
  }

  return {
    handleAsyncError,
    handleSyncError,
    reportError
  }
}