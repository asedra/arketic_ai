"use client"

import React from "react"
import { Loader2, Wifi, WifiOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader } from "./card"
import { Skeleton } from "./skeleton"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
  text?: string
  inline?: boolean
}

export function LoadingSpinner({ size = "md", className, text, inline = false }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8",
    xl: "h-12 w-12"
  }

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-xl"
  }

  if (inline) {
    return (
      <span className={cn("inline-flex items-center gap-2", className)}>
        <Loader2 className={cn("animate-spin", sizeClasses[size])} />
        {text && <span className={textSizeClasses[size]}>{text}</span>}
      </span>
    )
  }

  return (
    <div className={cn("flex flex-col items-center justify-center gap-2", className)}>
      <Loader2 className={cn("animate-spin", sizeClasses[size])} />
      {text && (
        <p className={cn("text-muted-foreground", textSizeClasses[size])}>
          {text}
        </p>
      )}
    </div>
  )
}

interface LoadingCardProps {
  className?: string
  rows?: number
  showHeader?: boolean
  showAvatar?: boolean
  animated?: boolean
}

export function LoadingCard({ className, rows = 3, showHeader = true, showAvatar = false, animated = true }: LoadingCardProps) {
  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader className="space-y-2">
          <div className={cn("flex items-center space-x-2", animated && "animate-pulse")}>
            {showAvatar && (
              <Skeleton className="h-10 w-10 rounded-full" />
            )}
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        </CardHeader>
      )}
      <CardContent className={cn("space-y-3", animated && "animate-pulse")}>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton 
            key={i} 
            className={cn(
              "h-3",
              i === rows - 1 ? "w-2/3" : "w-full"
            )} 
          />
        ))}
      </CardContent>
    </Card>
  )
}

interface LoadingTableProps {
  rows?: number
  columns?: number
  className?: string
}

export function LoadingTable({ rows = 5, columns = 4, className }: LoadingTableProps) {
  return (
    <div className={cn("space-y-2 animate-pulse", className)}>
      {/* Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-4 bg-slate-300 dark:bg-slate-600 rounded"></div>
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
          ))}
        </div>
      ))}
    </div>
  )
}

interface LoadingSkeletonProps {
  className?: string
  count?: number
}

export function LoadingSkeleton({ className, count = 1 }: LoadingSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton 
          key={i}
          className={cn("h-4", className)}
        />  
      ))}
    </>
  )
}

// New comprehensive loading components

interface FullPageLoadingProps {
  title?: string
  subtitle?: string
  showProgress?: boolean
  progress?: number
}

export function FullPageLoading({ 
  title = "Loading...", 
  subtitle, 
  showProgress = false, 
  progress = 0 
}: FullPageLoadingProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-md mx-auto px-4">
        <LoadingSpinner size="xl" />
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
          {showProgress && (
            <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
              <p className="text-xs text-muted-foreground mt-2">
                {Math.round(progress)}% complete
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface LoadingListProps {
  items?: number
  showSearch?: boolean
  showFilters?: boolean
  className?: string
}

export function LoadingList({ items = 5, showSearch = false, showFilters = false, className }: LoadingListProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {showSearch && (
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 flex-1" />
          {showFilters && <Skeleton className="h-10 w-24" />}
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: items }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-4 animate-pulse">
                <Skeleton className="h-12 w-12 rounded" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

interface LoadingGridProps {
  items?: number
  columns?: number
  showHeader?: boolean
  className?: string
}

export function LoadingGrid({ items = 6, columns = 3, showHeader = false, className }: LoadingGridProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {showHeader && (
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
      )}
      <div 
        className={`grid gap-4`}
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: items }).map((_, i) => (
          <LoadingCard key={i} rows={3} showHeader showAvatar />
        ))}
      </div>
    </div>
  )
}

interface LoadingFormProps {
  fields?: number
  showSubmit?: boolean
  className?: string
}

export function LoadingForm({ fields = 4, showSubmit = true, className }: LoadingFormProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-96" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        {showSubmit && (
          <div className="flex justify-end pt-4">
            <Skeleton className="h-10 w-24" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Network status indicators
interface NetworkStatusProps {
  isOnline?: boolean
  isConnected?: boolean
  className?: string
}

export function NetworkStatus({ isOnline = true, isConnected = true, className }: NetworkStatusProps) {
  if (isOnline && isConnected) {
    return null // Don't show anything when everything is working
  }

  return (
    <div className={cn("flex items-center gap-2 px-3 py-2 rounded-md", 
      !isOnline ? "bg-red-50 text-red-700 border border-red-200" : 
      !isConnected ? "bg-orange-50 text-orange-700 border border-orange-200" : "",
      className
    )}>
      {!isOnline ? (
        <>
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">No internet connection</span>
        </>
      ) : !isConnected ? (
        <>
          <Wifi className="h-4 w-4" />
          <span className="text-sm font-medium">Connection issues</span>
        </>
      ) : null}
    </div>
  )
}

// Smart loading component that adapts based on loading time
interface SmartLoadingProps {
  isLoading: boolean
  error?: Error | null
  children: React.ReactNode
  fallback?: React.ReactNode
  minLoadingTime?: number
  showProgressAfter?: number
}

export function SmartLoading({ 
  isLoading, 
  error, 
  children, 
  fallback,
  minLoadingTime = 300,
  showProgressAfter = 2000
}: SmartLoadingProps) {
  const [showProgress, setShowProgress] = React.useState(false)
  const [shouldShow, setShouldShow] = React.useState(false)
  const startTimeRef = React.useRef<number>()

  React.useEffect(() => {
    if (isLoading) {
      startTimeRef.current = Date.now()
      const timer = setTimeout(() => setShouldShow(true), minLoadingTime)
      const progressTimer = setTimeout(() => setShowProgress(true), showProgressAfter)
      
      return () => {
        clearTimeout(timer)
        clearTimeout(progressTimer)
      }
    } else {
      setShouldShow(false)
      setShowProgress(false)
    }
  }, [isLoading, minLoadingTime, showProgressAfter])

  if (error) {
    return null // Let error boundary handle it
  }

  if (isLoading && shouldShow) {
    return (
      <div className="space-y-4">
        {fallback || <LoadingSpinner text="Loading..." />}
        {showProgress && (
          <p className="text-sm text-muted-foreground text-center">
            This is taking longer than usual...
          </p>
        )}
      </div>
    )
  }

  return <>{children}</>
}

// Hook for managing loading states
export function useLoadingState(initialLoading = false) {
  const [isLoading, setIsLoading] = React.useState(initialLoading)
  const [error, setError] = React.useState<Error | null>(null)

  const startLoading = React.useCallback(() => {
    setIsLoading(true)
    setError(null)
  }, [])

  const stopLoading = React.useCallback(() => {
    setIsLoading(false)
  }, [])

  const setLoadingError = React.useCallback((error: Error) => {
    setIsLoading(false)
    setError(error)
  }, [])

  const reset = React.useCallback(() => {
    setIsLoading(false)
    setError(null)
  }, [])

  return {
    isLoading,
    error,
    startLoading,
    stopLoading,
    setLoadingError,
    reset
  }
}