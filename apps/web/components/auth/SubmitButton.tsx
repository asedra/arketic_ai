import React from "react"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SubmitButtonProps {
  isLoading?: boolean
  disabled?: boolean
  children: React.ReactNode
  loadingText?: string
  type?: "button" | "submit" | "reset"
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  icon?: React.ReactNode
  onClick?: () => void
  fullWidth?: boolean
}

export function SubmitButton({
  isLoading = false,
  disabled = false,
  children,
  loadingText = "Please wait...",
  type = "submit",
  variant = "default",
  size = "default",
  className,
  icon,
  onClick,
  fullWidth = false,
}: SubmitButtonProps) {
  const isDisabled = disabled || isLoading

  return (
    <Button
      type={type}
      disabled={isDisabled}
      variant={variant}
      size={size}
      onClick={onClick}
      className={cn(
        "relative transition-all duration-200",
        fullWidth && "w-full",
        isLoading && "opacity-80",
        className
      )}
      aria-busy={isLoading}
      aria-disabled={isDisabled}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          <span>{loadingText}</span>
        </>
      ) : (
        <>
          {children}
          {icon && <span className="ml-2">{icon}</span>}
        </>
      )}
    </Button>
  )
}