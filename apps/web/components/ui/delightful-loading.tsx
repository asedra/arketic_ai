"use client"

import React from 'react'
import { cn } from '@/lib/utils'
import { Loader2, Database, FileText, Users, Shield, Sparkles } from 'lucide-react'

interface DelightfulLoadingProps {
  type?: 'default' | 'knowledge' | 'compliance' | 'organization' | 'data' | 'upload'
  size?: 'sm' | 'md' | 'lg'
  message?: string
  className?: string
}

const loadingMessages = {
  knowledge: [
    "Organizing your knowledge...",
    "Connecting the dots...",
    "Brewing fresh insights...",
    "Gathering wisdom..."
  ],
  compliance: [
    "Checking compliance status...",
    "Reviewing regulations...",
    "Ensuring standards...",
    "Validating requirements..."
  ],
  organization: [
    "Mapping your organization...",
    "Connecting team members...",
    "Building the big picture...",
    "Syncing departments..."
  ],
  data: [
    "Crunching the numbers...",
    "Processing data streams...",
    "Analyzing patterns...",
    "Computing insights..."
  ],
  upload: [
    "Uploading with care...",
    "Securing your files...",
    "Processing documents...",
    "Almost there..."
  ]
}

const getRandomMessage = (type: string) => {
  const messages = loadingMessages[type as keyof typeof loadingMessages] || ['Loading...']
  return messages[Math.floor(Math.random() * messages.length)]
}

export function DelightfulLoading({ 
  type = 'default',
  size = 'md',
  message,
  className 
}: DelightfulLoadingProps) {
  const [currentMessage, setCurrentMessage] = React.useState(
    message || getRandomMessage(type)
  )

  // Rotate messages every 2 seconds for engaging loading experience
  React.useEffect(() => {
    if (!message && type !== 'default') {
      const interval = setInterval(() => {
        setCurrentMessage(getRandomMessage(type))
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [type, message])

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  const getIcon = () => {
    switch (type) {
      case 'knowledge':
        return <FileText className={cn(sizeClasses[size], "animate-pulse")} />
      case 'compliance':
        return <Shield className={cn(sizeClasses[size], "animate-pulse")} />
      case 'organization':
        return <Users className={cn(sizeClasses[size], "animate-pulse")} />
      case 'data':
        return <Database className={cn(sizeClasses[size], "animate-pulse")} />
      case 'upload':
        return <Sparkles className={cn(sizeClasses[size], "animate-bounce")} />
      default:
        return <Loader2 className={cn(sizeClasses[size], "animate-spin")} />
    }
  }

  return (
    <div className={cn(
      "flex flex-col items-center justify-center space-y-3 p-6",
      className
    )}>
      <div className="relative">
        {/* Pulsing background circle */}
        <div className="absolute inset-0 rounded-full bg-blue-100 dark:bg-blue-900/20 animate-ping opacity-20" />
        <div className="relative flex items-center justify-center p-3 bg-blue-50 dark:bg-blue-900/10 rounded-full border border-blue-200 dark:border-blue-800">
          {getIcon()}
        </div>
      </div>
      
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 animate-pulse">
          {currentMessage}
        </p>
        <div className="flex justify-center space-x-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
              style={{
                animationDelay: `${i * 0.1}s`,
                animationDuration: '1.4s'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// Skeleton loader for specific content types
export function SkeletonLoader({ type = 'card', className }: { type?: 'card' | 'table' | 'list', className?: string }) {
  if (type === 'card') {
    return (
      <div className={cn("animate-pulse", className)}>
        <div className="bg-slate-200 dark:bg-slate-700 rounded-lg h-48 w-full">
          <div className="p-4 space-y-3">
            <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded w-3/4" />
            <div className="h-3 bg-slate-300 dark:bg-slate-600 rounded w-1/2" />
            <div className="space-y-2">
              <div className="h-2 bg-slate-300 dark:bg-slate-600 rounded" />
              <div className="h-2 bg-slate-300 dark:bg-slate-600 rounded w-5/6" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (type === 'table') {
    return (
      <div className={cn("animate-pulse space-y-3", className)}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex space-x-4 p-4 bg-slate-100 dark:bg-slate-800 rounded">
            <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded w-1/4" />
            <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded w-1/3" />
            <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded w-1/6" />
            <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded w-1/5" />
          </div>
        ))}
      </div>
    )
  }

  // Default list type
  return (
    <div className={cn("animate-pulse space-y-2", className)}>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-3">
          <div className="h-10 w-10 bg-slate-300 dark:bg-slate-600 rounded-full" />
          <div className="flex-1 space-y-1">
            <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded w-3/4" />
            <div className="h-3 bg-slate-300 dark:bg-slate-600 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}