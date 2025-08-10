import React from "react"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
  label?: string
  fullScreen?: boolean
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
}

export function LoadingSpinner({
  size = "md",
  className,
  label = "Loading...",
  fullScreen = false,
}: LoadingSpinnerProps) {
  const spinner = (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2
        className={cn(
          "animate-spin text-blue-600 dark:text-blue-400",
          sizeClasses[size]
        )}
      />
      {label && (
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {label}
        </span>
      )}
      <span className="sr-only">{label}</span>
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        {spinner}
      </div>
    )
  }

  return spinner
}

interface LoadingOverlayProps {
  isLoading: boolean
  children: React.ReactNode
  className?: string
  label?: string
}

export function LoadingOverlay({
  isLoading,
  children,
  className,
  label = "Loading...",
}: LoadingOverlayProps) {
  return (
    <div className={cn("relative", className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-lg">
          <LoadingSpinner size="md" label={label} />
        </div>
      )}
    </div>
  )
}