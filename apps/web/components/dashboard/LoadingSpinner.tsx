import React from 'react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  text?: string
}

export function LoadingSpinner({ size = 'md', className, text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }
  
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-2 border-slate-300 border-t-blue-600',
          sizeClasses[size]
        )}
      />
      {text && (
        <p className="text-sm text-slate-600 dark:text-slate-400">{text}</p>
      )}
    </div>
  )
}

// Skeleton loading components
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse', className)}>
      <div className="bg-slate-200 dark:bg-slate-700 rounded-lg h-32" />
      <div className="mt-2 space-y-2">
        <div className="bg-slate-200 dark:bg-slate-700 rounded h-4 w-3/4" />
        <div className="bg-slate-200 dark:bg-slate-700 rounded h-4 w-1/2" />
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('animate-pulse space-y-3', className)}>
      <div className="bg-slate-200 dark:bg-slate-700 rounded h-10" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-slate-200 dark:bg-slate-700 rounded h-8" />
      ))}
    </div>
  )
}
