"use client"

import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  AlertTriangle, 
  Wifi, 
  RefreshCw, 
  Home, 
  ArrowLeft,
  Coffee,
  Lightbulb,
  Heart
} from 'lucide-react'

interface DelightfulErrorStateProps {
  type?: 'network' | 'server' | '404' | 'permission' | 'validation' | 'general'
  title?: string
  description?: string
  error?: string
  actionLabel?: string
  secondaryActionLabel?: string
  onAction?: () => void
  onSecondaryAction?: () => void
  showDetails?: boolean
  className?: string
}

const errorConfig = {
  network: {
    title: "Connection hiccup!",
    description: "Seems like the internet took a coffee break. Let's try reconnecting.",
    actionLabel: "Try again",
    secondaryActionLabel: "Check connection",
    icon: Wifi,
    color: "text-orange-500",
    bgColor: "bg-orange-50 dark:bg-orange-900/10",
    illustration: (
      <div className="relative">
        <Wifi className="h-16 w-16 text-orange-400" />
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
          <span className="text-xs text-red-600">!</span>
        </div>
      </div>
    )
  },
  server: {
    title: "Oops! Server's having a moment",
    description: "Our servers are taking a quick breather. They'll be back shortly!",
    actionLabel: "Refresh page",
    secondaryActionLabel: "Report issue",
    icon: AlertTriangle,
    color: "text-red-500",
    bgColor: "bg-red-50 dark:bg-red-900/10",
    illustration: (
      <div className="relative">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
          <Coffee className="h-8 w-8 text-red-500" />
        </div>
        <div className="absolute -top-1 -right-1 animate-bounce">
          <span className="text-lg">💤</span>
        </div>
      </div>
    )
  },
  '404': {
    title: "Lost in cyberspace!",
    description: "This page seems to have wandered off. Let's get you back on track.",
    actionLabel: "Go home",
    secondaryActionLabel: "Go back",
    icon: Home,
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-900/10",
    illustration: (
      <div className="relative">
        <div className="text-6xl mb-4 animate-bounce">🧭</div>
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-2xl animate-spin">🌟</div>
      </div>
    )
  },
  permission: {
    title: "Access denied, but nicely!",
    description: "You don't have permission for this area, but we think you're awesome anyway.",
    actionLabel: "Request access",
    secondaryActionLabel: "Go back",
    icon: AlertTriangle,
    color: "text-yellow-500",
    bgColor: "bg-yellow-50 dark:bg-yellow-900/10",
    illustration: (
      <div className="relative">
        <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
          <span className="text-2xl">🔐</span>
        </div>
        <Heart className="absolute -top-2 -right-2 h-6 w-6 text-pink-400 animate-pulse" />
      </div>
    )
  },
  validation: {
    title: "Almost there!",
    description: "Looks like some information needs a quick double-check.",
    actionLabel: "Fix issues",
    secondaryActionLabel: "Reset form",
    icon: Lightbulb,
    color: "text-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-900/10",
    illustration: (
      <div className="relative">
        <Lightbulb className="h-16 w-16 text-amber-400" />
        <div className="absolute inset-0 border-2 border-dashed border-amber-300 dark:border-amber-700 rounded-full animate-pulse" />
      </div>
    )
  },
  general: {
    title: "Something went sideways",
    description: "Don't worry, these things happen! Let's try that again.",
    actionLabel: "Try again",
    secondaryActionLabel: "Contact support",
    icon: AlertTriangle,
    color: "text-slate-500",
    bgColor: "bg-slate-50 dark:bg-slate-900/10",
    illustration: (
      <div className="relative">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center transform rotate-12">
          <span className="text-2xl">🤷</span>
        </div>
      </div>
    )
  }
}

export function DelightfulErrorState({
  type = 'general',
  title,
  description,
  error,
  actionLabel,
  secondaryActionLabel,
  onAction,
  onSecondaryAction,
  showDetails = false,
  className
}: DelightfulErrorStateProps) {
  const [showFullError, setShowFullError] = React.useState(false)
  const config = errorConfig[type]

  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 px-6 text-center",
      "bg-gradient-to-br from-slate-50/50 to-white dark:from-slate-900/50 dark:to-slate-800/50",
      "rounded-xl border border-slate-200/50 dark:border-slate-700/50",
      "backdrop-blur-sm",
      className
    )}>
      {/* Illustration */}
      <div className="mb-6 transform hover:scale-105 transition-transform duration-300">
        {config.illustration}
      </div>

      {/* Content */}
      <div className="space-y-3 mb-8">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          {title || config.title}
        </h3>
        <p className="text-slate-600 dark:text-slate-400 max-w-md leading-relaxed">
          {description || config.description}
        </p>
      </div>

      {/* Error details */}
      {error && showDetails && (
        <Alert className={cn("mb-6 text-left max-w-md", config.bgColor)}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <button
              onClick={() => setShowFullError(!showFullError)}
              className="text-blue-600 dark:text-blue-400 hover:underline mb-2 block"
            >
              {showFullError ? 'Hide' : 'Show'} technical details
            </button>
            {showFullError && (
              <pre className="text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded overflow-x-auto">
                {error}
              </pre>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {onAction && (
          <Button 
            onClick={onAction}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {actionLabel || config.actionLabel}
          </Button>
        )}
        
        {onSecondaryAction && (
          <Button 
            variant="outline" 
            onClick={onSecondaryAction}
            className="border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transform hover:scale-105 transition-all duration-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {secondaryActionLabel || config.secondaryActionLabel}
          </Button>
        )}
      </div>

      {/* Encouraging message */}
      <div className="mt-6 text-xs text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center space-x-1">
          <span>Made with</span>
          <Heart className="h-3 w-3 text-red-400 animate-pulse" />
          <span>by the Arketic team</span>
        </span>
      </div>
    </div>
  )
}

// Inline error component for forms and smaller spaces
export function InlineError({ 
  message, 
  onRetry,
  className 
}: { 
  message: string
  onRetry?: () => void
  className?: string 
}) {
  return (
    <div className={cn(
      "flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg",
      className
    )}>
      <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
      <span className="text-sm text-red-700 dark:text-red-400 flex-1">{message}</span>
      {onRetry && (
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={onRetry}
          className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}

// Toast-style error notification
export function ErrorToast({ message, onDismiss }: { message: string, onDismiss?: () => void }) {
  React.useEffect(() => {
    if (onDismiss) {
      const timer = setTimeout(onDismiss, 5000)
      return () => clearTimeout(timer)
    }
  }, [onDismiss])

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-full">
      <Alert className="bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 shadow-lg">
        <AlertTriangle className="h-4 w-4 text-red-500" />
        <AlertDescription className="text-red-700 dark:text-red-400 pr-8">
          {message}
        </AlertDescription>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-2 right-2 text-red-500 hover:text-red-700 transition-colors"
          >
            ×
          </button>
        )}
      </Alert>
    </div>
  )
}