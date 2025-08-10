import React from "react"
import { cn } from "@/lib/utils"
import { AlertCircle, X } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface ErrorAlertProps {
  title?: string
  message: string
  onClose?: () => void
  className?: string
  variant?: "default" | "destructive"
  showIcon?: boolean
  closable?: boolean
}

export function ErrorAlert({
  title = "Error",
  message,
  onClose,
  className,
  variant = "destructive",
  showIcon = true,
  closable = true,
}: ErrorAlertProps) {
  return (
    <Alert
      variant={variant}
      className={cn(
        "relative animate-in fade-in-0 slide-in-from-top-1",
        className
      )}
    >
      {showIcon && <AlertCircle className="h-4 w-4" />}
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{message}</AlertDescription>
      
      {closable && onClose && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2 h-6 w-6 p-0 hover:bg-transparent"
          onClick={onClose}
          aria-label="Close alert"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </Alert>
  )
}

interface FieldErrorProps {
  error?: string
  className?: string
}

export function FieldError({ error, className }: FieldErrorProps) {
  if (!error) return null

  return (
    <div
      className={cn(
        "flex items-start gap-1.5 text-sm text-red-600 dark:text-red-400 animate-in fade-in-0 slide-in-from-top-1",
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
      <span>{error}</span>
    </div>
  )
}