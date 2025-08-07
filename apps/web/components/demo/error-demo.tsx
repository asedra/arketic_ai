"use client"

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Bug,
  Zap,
  Globe,
  Database,
  AlertTriangle,
  RefreshCw,
  Wifi
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useApi, useMutation } from '@/hooks/use-api'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { LoadingSpinner, SmartLoading } from '@/components/ui/loading'
import { reportComponentError } from '@/components/error-reporter'
import { handleError, NetworkError, ValidationError, ServerError, UnauthorizedError } from '@/lib/error-handling'

// Component that throws errors for testing
function ErrorThrowingComponent({ errorType }: { errorType: string }) {
  React.useEffect(() => {
    if (errorType === 'render') {
      throw new Error('Intentional render error for testing')
    }
  }, [errorType])

  if (errorType === 'throw') {
    throw new Error('Intentional component error for testing')
  }

  return <div>This component is working fine!</div>
}

// Component that demonstrates async errors
function AsyncErrorComponent() {
  const [triggerError, setTriggerError] = useState(false)

  React.useEffect(() => {
    if (triggerError) {
      // Simulate async error
      setTimeout(() => {
        throw new Error('Async error thrown after timeout')
      }, 1000)
    }
  }, [triggerError])

  return (
    <div className="space-y-2">
      <Button 
        onClick={() => setTriggerError(true)}
        variant="destructive"
        size="sm"
        disabled={triggerError}
      >
        {triggerError ? 'Error triggered...' : 'Trigger Async Error'}
      </Button>
      {triggerError && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            An async error will be thrown in 1 second...
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

// Component that demonstrates API errors
function ApiErrorComponent() {
  const {
    data,
    loading,
    error,
    execute: refetch
  } = useApi('/api/test-endpoint', {
    immediate: false,
    showErrorToast: true
  })

  const mutation = useMutation('/api/test-mutation', 'POST', {
    showErrorToast: true,
    showSuccessToast: true
  })

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button 
          onClick={() => refetch()}
          variant="outline"
          size="sm"
          disabled={loading}
        >
          {loading ? <LoadingSpinner size="sm" inline /> : 'Test GET Error'}
        </Button>
        <Button 
          onClick={() => mutation.mutate({ test: 'data' })}
          variant="outline"
          size="sm"
          disabled={mutation.loading}
        >
          {mutation.loading ? <LoadingSpinner size="sm" inline /> : 'Test POST Error'}
        </Button>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            API Error: {error.message}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

// Component that demonstrates form validation errors
function FormErrorComponent() {
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      handleError(new ValidationError('Form validation failed'), {
        fields: errors,
        source: 'form-demo'
      })
      return
    }

    toast({
      title: "Success",
      description: "Form validation passed!",
      variant: "default",
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={errors.email ? 'border-red-300' : ''}
        />
        {errors.email && (
          <p className="text-xs text-red-600 mt-1">{errors.email}</p>
        )}
      </div>
      <Button type="submit" size="sm">
        Validate Form
      </Button>
    </form>
  )
}

export function ErrorDemo() {
  const [errorBoundaryReset, setErrorBoundaryReset] = useState(0)

  const triggerManualError = (type: string) => {
    switch (type) {
      case 'network':
        handleError(new NetworkError('Failed to connect to server'), {
          source: 'manual-trigger',
          endpoint: '/api/test'
        })
        break
      case 'validation':
        handleError(new ValidationError('Invalid input provided'), {
          source: 'manual-trigger',
          field: 'username'
        })
        break
      case 'server':
        handleError(new ServerError('Internal server error occurred'), {
          source: 'manual-trigger',
          statusCode: 500
        })
        break
      case 'unauthorized':
        handleError(new UnauthorizedError('Access denied'), {
          source: 'manual-trigger'
        })
        break
      case 'custom':
        reportComponentError(
          'Custom error reported from demo component',
          new Error('Demo error'),
          { feature: 'error-demo', userAction: 'testing' }
        )
        break
      case 'promise':
        // Trigger unhandled promise rejection
        Promise.reject(new Error('Unhandled promise rejection for testing'))
        break
      default:
        handleError(new Error('Generic error for testing'), {
          source: 'manual-trigger',
          type
        })
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Error Handling Demo</h1>
        <p className="text-gray-600">
          This page demonstrates comprehensive error handling and loading states in the Arketic platform.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Manual Error Triggers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Manual Error Triggers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={() => triggerManualError('network')}
                variant="outline"
                size="sm"
                className="text-red-600"
              >
                <Globe className="h-4 w-4 mr-1" />
                Network
              </Button>
              <Button 
                onClick={() => triggerManualError('server')}
                variant="outline"
                size="sm"
                className="text-orange-600"
              >
                <Database className="h-4 w-4 mr-1" />
                Server
              </Button>
              <Button 
                onClick={() => triggerManualError('validation')}
                variant="outline"
                size="sm"
                className="text-yellow-600"
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                Validation
              </Button>
              <Button 
                onClick={() => triggerManualError('unauthorized')}
                variant="outline"
                size="sm"
                className="text-purple-600"
              >
                <Zap className="h-4 w-4 mr-1" />
                Auth
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={() => triggerManualError('custom')}
                variant="outline"
                size="sm"
              >
                Custom Report
              </Button>
              <Button 
                onClick={() => triggerManualError('promise')}
                variant="outline"
                size="sm"
              >
                Promise Reject
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Boundary Demo */}
        <Card>
          <CardHeader>
            <CardTitle>Error Boundary Demo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ErrorBoundary 
              key={errorBoundaryReset}
              level="component"
              onError={(error, errorInfo) => {
                console.log('Error boundary caught:', error, errorInfo)
              }}
            >
              <div className="space-y-2">
                <Button 
                  onClick={() => setErrorBoundaryReset(prev => prev + 1)}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Reset Boundary
                </Button>
                <div className="flex gap-2">
                  <ErrorThrowingComponent errorType="" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={() => {
                      // This will be caught by error boundary
                      throw new Error('Button click error')
                    }}
                    variant="destructive"
                    size="sm"
                  >
                    Throw Error
                  </Button>
                  <Button 
                    onClick={() => {
                      // Simulate component error
                      const errorComponent = document.createElement('div')
                      errorComponent.innerHTML = 'Error triggered'
                      throw new Error('Simulated component error')
                    }}
                    variant="destructive"
                    size="sm"
                  >
                    Component Error
                  </Button>
                </div>
              </div>
            </ErrorBoundary>
          </CardContent>
        </Card>

        {/* API Error Demo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              API Error Handling
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ApiErrorComponent />
          </CardContent>
        </Card>

        {/* Form Validation Demo */}
        <Card>
          <CardHeader>
            <CardTitle>Form Validation</CardTitle>
          </CardHeader>
          <CardContent>
            <FormErrorComponent />
          </CardContent>
        </Card>

        {/* Async Error Demo */}
        <Card>
          <CardHeader>
            <CardTitle>Async Error Handling</CardTitle>
          </CardHeader>
          <CardContent>
            <AsyncErrorComponent />
          </CardContent>
        </Card>

        {/* Loading States Demo */}
        <Card>
          <CardHeader>
            <CardTitle>Loading States</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Badge variant="secondary">Spinner Sizes</Badge>
              <div className="flex items-center gap-3">
                <LoadingSpinner size="sm" />
                <LoadingSpinner size="md" />
                <LoadingSpinner size="lg" />
                <LoadingSpinner size="xl" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Badge variant="secondary">With Text</Badge>
              <LoadingSpinner size="md" text="Loading data..." />
            </div>
            
            <div className="space-y-2">
              <Badge variant="secondary">Inline Loading</Badge>
              <div className="flex items-center gap-2">
                <span>Processing</span>
                <LoadingSpinner size="sm" inline />
                <span>please wait...</span>
              </div>
            </div>

            <div className="space-y-2">
              <Badge variant="secondary">Smart Loading</Badge>
              <SmartLoading isLoading={false} error={null}>
                <p className="text-sm text-gray-600">Content loaded successfully!</p>
              </SmartLoading>
            </div>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Note:</strong> This demo page is for testing error handling features. 
          In production, the Error Reporter component will be less prominent and some error 
          triggers will be disabled. Check the browser console and the Error Reporter widget 
          in the bottom-right corner to see how errors are captured and reported.
        </AlertDescription>
      </Alert>
    </div>
  )
}