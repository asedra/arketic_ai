"use client"

import React from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle, Sparkles, Trophy, Star, Heart, Zap } from 'lucide-react'

interface SuccessCelebrationProps {
  type?: 'default' | 'upload' | 'sync' | 'save' | 'complete' | 'achievement'
  size?: 'sm' | 'md' | 'lg'
  message?: string
  description?: string
  className?: string
  onComplete?: () => void
  autoHide?: boolean
  duration?: number
}

const celebrationConfig = {
  default: {
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/10',
    borderColor: 'border-green-200 dark:border-green-800',
    message: 'Success!'
  },
  upload: {
    icon: Sparkles,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/10',
    borderColor: 'border-blue-200 dark:border-blue-800',
    message: 'Upload Complete!'
  },
  sync: {
    icon: Zap,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/10',
    borderColor: 'border-purple-200 dark:border-purple-800',
    message: 'Synced Successfully!'
  },
  save: {
    icon: Heart,
    color: 'text-pink-500',
    bgColor: 'bg-pink-50 dark:bg-pink-900/10',
    borderColor: 'border-pink-200 dark:border-pink-800',
    message: 'Saved Successfully!'
  },
  complete: {
    icon: Trophy,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/10',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    message: 'Task Complete!'
  },
  achievement: {
    icon: Star,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-900/10',
    borderColor: 'border-amber-200 dark:border-amber-800',
    message: 'Achievement Unlocked!'
  }
}

export function SuccessCelebration({
  type = 'default',
  size = 'md',
  message,
  description,
  className,
  onComplete,
  autoHide = true,
  duration = 3000
}: SuccessCelebrationProps) {
  const [isVisible, setIsVisible] = React.useState(true)
  const [isAnimating, setIsAnimating] = React.useState(true)
  const config = celebrationConfig[type]
  const Icon = config.icon

  const sizeClasses = {
    sm: { icon: 'h-6 w-6', container: 'p-3' },
    md: { icon: 'h-8 w-8', container: 'p-4' },
    lg: { icon: 'h-12 w-12', container: 'p-6' }
  }

  React.useEffect(() => {
    // Stop initial animation after a short delay
    const animationTimer = setTimeout(() => {
      setIsAnimating(false)
    }, 1000)

    // Auto hide if enabled
    if (autoHide) {
      const hideTimer = setTimeout(() => {
        setIsVisible(false)
        onComplete?.()
      }, duration)

      return () => {
        clearTimeout(animationTimer)
        clearTimeout(hideTimer)
      }
    }

    return () => clearTimeout(animationTimer)
  }, [autoHide, duration, onComplete])

  if (!isVisible) return null

  return (
    <div className={cn(
      "fixed top-4 right-4 z-50 transform transition-all duration-500 ease-out",
      "animate-in slide-in-from-right-full",
      className
    )}>
      <div className={cn(
        "flex items-center space-x-3 rounded-lg border shadow-lg backdrop-blur-sm",
        config.bgColor,
        config.borderColor,
        sizeClasses[size].container
      )}>
        {/* Animated icon with celebration effect */}
        <div className="relative">
          {isAnimating && (
            <div className="absolute inset-0 rounded-full animate-ping opacity-30">
              <div className={cn("w-full h-full rounded-full", config.bgColor)} />
            </div>
          )}
          <Icon className={cn(
            sizeClasses[size].icon,
            config.color,
            isAnimating ? "animate-bounce" : ""
          )} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {message || config.message}
          </p>
          {description && (
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              {description}
            </p>
          )}
        </div>

        {/* Confetti effect for special celebrations */}
        {(type === 'achievement' || type === 'complete') && isAnimating && (
          <div className="absolute -top-2 -right-2 pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-yellow-400 rounded-full animate-bounce"
                style={{
                  left: `${Math.random() * 20}px`,
                  top: `${Math.random() * 20}px`,
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '1s'
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Progress celebration for multi-step processes
export function ProgressCelebration({ 
  currentStep, 
  totalSteps, 
  stepName,
  className 
}: { 
  currentStep: number
  totalSteps: number
  stepName?: string
  className?: string 
}) {
  const progress = (currentStep / totalSteps) * 100
  const isComplete = currentStep === totalSteps

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {stepName || `Step ${currentStep} of ${totalSteps}`}
        </span>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {Math.round(progress)}%
        </span>
      </div>
      
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
        <div 
          className={cn(
            "h-2.5 rounded-full transition-all duration-500 ease-out",
            isComplete 
              ? "bg-gradient-to-r from-green-400 to-green-600 animate-pulse" 
              : "bg-gradient-to-r from-blue-400 to-blue-600"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {isComplete && (
        <div className="flex items-center justify-center space-x-2 text-green-600 dark:text-green-400">
          <CheckCircle className="h-4 w-4 animate-bounce" />
          <span className="text-sm font-medium">Complete!</span>
        </div>
      )}
    </div>
  )
}