"use client"

import React, { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Auth Error Boundary caught an error:', error, errorInfo)
    this.setState({
      error,
      errorInfo,
    })
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  handleLoginRedirect = () => {
    // Clear any authentication data
    localStorage.clear()
    sessionStorage.clear()
    
    // Redirect to login
    window.location.href = '/login'
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      const isAuthError = this.state.error?.message.includes('auth') || 
                         this.state.error?.message.includes('token') ||
                         this.state.error?.message.includes('unauthorized')

      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-xl">
                {isAuthError ? 'Authentication Error' : 'Something went wrong'}
              </CardTitle>
              <CardDescription>
                {isAuthError 
                  ? 'There was a problem with your authentication. Please sign in again.'
                  : 'An unexpected error occurred. Please try again.'
                }
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-4 text-sm">
                  <summary className="cursor-pointer text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
                    Error Details
                  </summary>
                  <div className="mt-2 p-3 bg-slate-100 dark:bg-slate-800 rounded-md overflow-auto text-xs">
                    <div className="font-mono">
                      <div className="font-bold mb-2">Error:</div>
                      <div className="mb-4 text-red-600 dark:text-red-400">
                        {this.state.error?.message}
                      </div>
                      <div className="font-bold mb-2">Stack:</div>
                      <div className="whitespace-pre-wrap text-slate-600 dark:text-slate-400">
                        {this.state.error?.stack}
                      </div>
                    </div>
                  </div>
                </details>
              )}

              <div className="flex gap-2">
                {isAuthError ? (
                  <Button
                    onClick={this.handleLoginRedirect}
                    className="flex-1"
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In Again
                  </Button>
                ) : (
                  <Button
                    onClick={this.handleRetry}
                    variant="outline"
                    className="flex-1"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                )}
                
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook version for functional components
export function useAuthErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = () => setError(null)

  const captureError = (error: Error) => {
    console.error('Auth error captured:', error)
    setError(error)
  }

  return {
    error,
    resetError,
    captureError,
    hasError: !!error,
  }
}