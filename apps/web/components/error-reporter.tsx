"use client"

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Bug, 
  AlertTriangle, 
  X, 
  Send, 
  Eye, 
  EyeOff,
  Copy,
  Check,
  RefreshCw
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface ErrorReport {
  id: string
  timestamp: Date
  level: 'error' | 'warning' | 'info'
  message: string
  stack?: string
  userAgent: string
  url: string
  userId?: string
  context?: Record<string, any>
  reported: boolean
}

interface ErrorReporterProps {
  maxErrors?: number
  autoReport?: boolean
  showInDevelopment?: boolean
}

export function ErrorReporter({ 
  maxErrors = 50, 
  autoReport = false,
  showInDevelopment = true 
}: ErrorReporterProps) {
  const [errors, setErrors] = useState<ErrorReport[]>([])
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)
  const [selectedError, setSelectedError] = useState<ErrorReport | null>(null)
  const [reportDescription, setReportDescription] = useState('')
  const [reporterEmail, setReporterEmail] = useState('')
  const [reportCategory, setReportCategory] = useState<string>('bug')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showStack, setShowStack] = useState<string | null>(null)
  const [copiedStack, setCopiedStack] = useState<string | null>(null)

  // Only show in development or production based on settings
  const shouldShow = process.env.NODE_ENV === 'development' ? showInDevelopment : true

  useEffect(() => {
    if (!shouldShow) return

    // Listen for custom error events
    const handleCustomError = (event: CustomEvent<ErrorReport>) => {
      addError(event.detail)
    }

    // Listen for global errors
    const handleGlobalError = (event: ErrorEvent) => {
      const error: ErrorReport = {
        id: Date.now().toString(),
        timestamp: new Date(),
        level: 'error',
        message: event.message,
        stack: event.error?.stack,
        userAgent: navigator.userAgent,
        url: window.location.href,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        },
        reported: false
      }
      addError(error)
    }

    // Listen for unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error: ErrorReport = {
        id: Date.now().toString(),
        timestamp: new Date(),
        level: 'error',
        message: `Unhandled Promise Rejection: ${String(event.reason)}`,
        stack: event.reason?.stack,
        userAgent: navigator.userAgent,
        url: window.location.href,
        context: {
          reason: event.reason
        },
        reported: false
      }
      addError(error)
    }

    window.addEventListener('arketic-error', handleCustomError as EventListener)
    window.addEventListener('error', handleGlobalError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('arketic-error', handleCustomError as EventListener)
      window.removeEventListener('error', handleGlobalError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [shouldShow])

  const addError = (error: ErrorReport) => {
    setErrors(prev => {
      const updated = [error, ...prev].slice(0, maxErrors)
      
      // Auto-report critical errors if enabled
      if (autoReport && error.level === 'error') {
        reportError(error)
      }
      
      return updated
    })
  }

  const reportError = async (error: ErrorReport, description?: string, email?: string, category?: string) => {
    try {
      // In a real application, this would send to an error reporting service
      const reportData = {
        ...error,
        description,
        reporterEmail: email,
        category: category || 'bug',
        reportedAt: new Date().toISOString()
      }

      console.log('Error reported:', reportData)
      
      // Simulate async request
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mark as reported
      setErrors(prev => 
        prev.map(e => 
          e.id === error.id ? { ...e, reported: true } : e
        )
      )

      toast({
        title: "Error Reported",
        description: "Thank you for helping us improve the application.",
        variant: "default",
      })
      
      return true
    } catch (err) {
      toast({
        title: "Report Failed",
        description: "Failed to submit error report. Please try again.",
        variant: "destructive",
      })
      return false
    }
  }

  const handleReportSubmit = async () => {
    if (!selectedError) return

    setIsSubmitting(true)
    const success = await reportError(
      selectedError, 
      reportDescription, 
      reporterEmail, 
      reportCategory
    )
    
    if (success) {
      setIsReportDialogOpen(false)
      setReportDescription('')
      setReporterEmail('')
      setReportCategory('bug')
      setSelectedError(null)
    }
    
    setIsSubmitting(false)
  }

  const copyToClipboard = (text: string, errorId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedStack(errorId)
      setTimeout(() => setCopiedStack(null), 2000)
      toast({
        title: "Copied",
        description: "Error details copied to clipboard",
        variant: "default",
      })
    })
  }

  const clearErrors = () => {
    setErrors([])
    toast({
      title: "Cleared",
      description: "All error logs have been cleared",
      variant: "default",
    })
  }

  const unreportedErrors = errors.filter(e => !e.reported)

  if (!shouldShow || errors.length === 0) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-80 max-h-96 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bug className="h-4 w-4" />
              Error Reporter
              {unreportedErrors.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unreportedErrors.length}
                </Badge>
              )}
            </CardTitle>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={clearErrors}
                className="h-6 w-6 p-0"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setErrors([])}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-2 max-h-64 overflow-y-auto">
          {errors.slice(0, 5).map((error) => (
            <div
              key={error.id}
              className={`p-2 rounded-md border text-xs ${
                error.level === 'error' 
                  ? 'bg-red-50 border-red-200' 
                  : error.level === 'warning'
                  ? 'bg-orange-50 border-orange-200'
                  : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-1">
                  {error.level === 'error' && <AlertTriangle className="h-3 w-3 text-red-500" />}
                  <span className="font-medium">
                    {error.level.toUpperCase()}
                  </span>
                  {error.reported && (
                    <Badge variant="secondary" className="text-xs px-1 py-0">
                      Reported
                    </Badge>
                  )}
                </div>
                <span className="text-gray-500">
                  {error.timestamp.toLocaleTimeString()}
                </span>
              </div>
              
              <p className="text-gray-700 mb-2 line-clamp-2">
                {error.message}
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {error.stack && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowStack(showStack === error.id ? null : error.id)}
                      className="h-5 px-1 text-xs"
                    >
                      {showStack === error.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  )}
                  {error.stack && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(error.stack!, error.id)}
                      className="h-5 px-1 text-xs"
                    >
                      {copiedStack === error.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  )}
                </div>
                
                {!error.reported && (
                  <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedError(error)}
                        className="h-5 px-2 text-xs"
                      >
                        Report
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                )}
              </div>
              
              {showStack === error.id && error.stack && (
                <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono overflow-x-auto">
                  <pre className="whitespace-pre-wrap">{error.stack}</pre>
                </div>
              )}
            </div>
          ))}
          
          {errors.length > 5 && (
            <div className="text-xs text-gray-500 text-center py-1">
              ... and {errors.length - 5} more errors
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Report Error
            </DialogTitle>
          </DialogHeader>
          
          {selectedError && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-sm font-medium mb-1">Error Message:</p>
                <p className="text-xs text-gray-700">{selectedError.message}</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={reportCategory} onValueChange={setReportCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">Bug Report</SelectItem>
                    <SelectItem value="feature">Feature Request</SelectItem>
                    <SelectItem value="performance">Performance Issue</SelectItem>
                    <SelectItem value="ui">UI/UX Issue</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Please describe what you were doing when this error occurred..."
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={reporterEmail}
                  onChange={(e) => setReporterEmail(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  We'll only use this to follow up if needed
                </p>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsReportDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReportSubmit}
                  disabled={isSubmitting}
                  className="flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-3 w-3" />
                      Send Report
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Helper function to manually report errors from components
export function reportComponentError(
  message: string, 
  error?: Error, 
  context?: Record<string, any>
) {
  const errorReport: ErrorReport = {
    id: Date.now().toString(),
    timestamp: new Date(),
    level: 'error',
    message,
    stack: error?.stack,
    userAgent: navigator.userAgent,
    url: window.location.href,
    context,
    reported: false
  }

  // Dispatch custom event
  window.dispatchEvent(new CustomEvent('arketic-error', { detail: errorReport }))
}