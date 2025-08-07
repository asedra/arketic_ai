"use client"

import React from 'react'
import { cn } from '@/lib/utils'
import { Button, ButtonProps } from '@/components/ui/button'
import { Loader2, Sparkles } from 'lucide-react'

interface DelightfulButtonProps extends ButtonProps {
  loading?: boolean
  success?: boolean
  ripple?: boolean
  glow?: boolean
  bounce?: boolean
  loadingText?: string
  successText?: string
  successDuration?: number
  onSuccessComplete?: () => void
}

export function DelightfulButton({
  children,
  loading = false,
  success = false,
  ripple = true,
  glow = false,
  bounce = false,
  loadingText,
  successText,
  successDuration = 2000,
  onSuccessComplete,
  className,
  onClick,
  disabled,
  ...props
}: DelightfulButtonProps) {
  const [isPressed, setIsPressed] = React.useState(false)
  const [showSuccess, setShowSuccess] = React.useState(false)
  const [ripplePos, setRipplePos] = React.useState<{x: number, y: number} | null>(null)
  const buttonRef = React.useRef<HTMLButtonElement>(null)

  // Handle success state
  React.useEffect(() => {
    if (success) {
      setShowSuccess(true)
      const timer = setTimeout(() => {
        setShowSuccess(false)
        onSuccessComplete?.()
      }, successDuration)
      return () => clearTimeout(timer)
    }
  }, [success, successDuration, onSuccessComplete])

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (loading || disabled) return

    // Create ripple effect
    if (ripple && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      setRipplePos({ x, y })
      
      // Clear ripple after animation
      setTimeout(() => setRipplePos(null), 600)
    }

    // Press effect
    setIsPressed(true)
    setTimeout(() => setIsPressed(false), 150)

    onClick?.(e)
  }

  const getButtonContent = () => {
    if (showSuccess) {
      return (
        <span className="flex items-center space-x-2">
          <Sparkles className="h-4 w-4 animate-spin" />
          <span>{successText || 'Success!'}</span>
        </span>
      )
    }

    if (loading) {
      return (
        <span className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{loadingText || 'Loading...'}</span>
        </span>
      )
    }

    return children
  }

  return (
    <Button
      ref={buttonRef}
      onClick={handleClick}
      disabled={disabled || loading}
      className={cn(
        "relative overflow-hidden transition-all duration-200 ease-out",
        // Glow effect
        glow && "shadow-lg hover:shadow-xl ring-2 ring-blue-500/20 hover:ring-blue-500/40",
        // Bounce effect
        bounce && "hover:scale-105 active:scale-95",
        // Press effect
        isPressed ? "scale-95" : "",
        // Success state
        showSuccess && "bg-green-500 hover:bg-green-600 text-white",
        // Loading state
        loading && "cursor-not-allowed opacity-80",
        className
      )}
      {...props}
    >
      {/* Ripple effect */}
      {ripplePos && (
        <span
          className="absolute bg-white/30 rounded-full animate-ping"
          style={{
            left: ripplePos.x - 10,
            top: ripplePos.y - 10,
            width: 20,
            height: 20,
            pointerEvents: 'none'
          }}
        />
      )}

      {/* Button content */}
      <span className="relative z-10">
        {getButtonContent()}
      </span>
    </Button>
  )
}

// Floating Action Button with delightful interactions
export function FloatingActionButton({
  onClick,
  icon: Icon,
  label,
  variant = 'default',
  position = 'bottom-right',
  className
}: {
  onClick?: () => void
  icon?: any
  label?: string
  variant?: 'default' | 'primary' | 'success' | 'warning'
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  className?: string
}) {
  const [isHovered, setIsHovered] = React.useState(false)
  const [isPressed, setIsPressed] = React.useState(false)

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6'
  }

  const variantClasses = {
    default: 'bg-slate-900 hover:bg-slate-800 text-white',
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white'
  }

  return (
    <div className={cn("fixed z-50", positionClasses[position])}>
      <button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        className={cn(
          "group relative flex items-center justify-center",
          "w-14 h-14 rounded-full shadow-lg hover:shadow-xl",
          "transform transition-all duration-200 ease-out",
          "focus:outline-none focus:ring-4 focus:ring-blue-500/20",
          variantClasses[variant],
          isPressed ? "scale-90" : isHovered ? "scale-110" : "scale-100",
          className
        )}
      >
        {/* Background pulse on hover */}
        <div className={cn(
          "absolute inset-0 rounded-full transition-opacity duration-300",
          "bg-white/20 opacity-0 group-hover:opacity-100"
        )} />

        {/* Icon */}
        {Icon && (
          <Icon className="h-6 w-6 z-10 transition-transform duration-200 group-hover:rotate-12" />
        )}

        {/* Label tooltip */}
        {label && (
          <div className={cn(
            "absolute right-full mr-3 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg",
            "opacity-0 group-hover:opacity-100 transition-all duration-200",
            "whitespace-nowrap pointer-events-none",
            "transform translate-x-2 group-hover:translate-x-0"
          )}>
            {label}
            <div className="absolute top-1/2 -right-1 w-2 h-2 bg-slate-900 transform rotate-45 -translate-y-1/2" />
          </div>
        )}
      </button>
    </div>
  )
}

// Button group with smooth transitions
export function DelightfulButtonGroup({
  buttons,
  className
}: {
  buttons: Array<{
    label: string
    value: string
    active?: boolean
    onClick?: () => void
    icon?: any
  }>
  className?: string
}) {
  return (
    <div className={cn("flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1", className)}>
      {buttons.map((button, index) => {
        const Icon = button.icon
        return (
          <button
            key={button.value}
            onClick={button.onClick}
            className={cn(
              "relative flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md",
              "transition-all duration-200 ease-out transform",
              "hover:scale-105 active:scale-95",
              button.active
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            )}
          >
            {Icon && <Icon className="h-4 w-4 mr-1" />}
            {button.label}
            
            {/* Active indicator */}
            {button.active && (
              <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-4 h-0.5 bg-blue-500 rounded-full" />
            )}
          </button>
        )
      })}
    </div>
  )
}