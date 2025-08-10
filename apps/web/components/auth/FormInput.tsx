import React, { useState, useId } from "react"
import { cn } from "@/lib/utils"
import { Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface FormInputProps {
  name: string
  label: string
  type?: string
  error?: string
  success?: boolean
  required?: boolean
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  onFocus?: () => void
  placeholder?: string
  disabled?: boolean
  autoComplete?: string
  showPasswordToggle?: boolean
  helpText?: string
  maxLength?: number
  className?: string
  inputClassName?: string
  labelClassName?: string
}

export function FormInput({
  name,
  label,
  type = "text",
  error,
  success,
  required,
  value,
  onChange,
  onBlur,
  onFocus,
  placeholder,
  disabled,
  autoComplete,
  showPasswordToggle = false,
  helpText,
  maxLength,
  className,
  inputClassName,
  labelClassName,
}: FormInputProps) {
  const inputId = useId()
  const errorId = error ? `${inputId}-error` : undefined
  const helpId = helpText ? `${inputId}-help` : undefined
  const [showPassword, setShowPassword] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const actualType = showPasswordToggle && type === "password" 
    ? (showPassword ? "text" : "password")
    : type

  const handleFocus = () => {
    setIsFocused(true)
    if (onFocus) onFocus()
  }

  const handleBlur = () => {
    setIsFocused(false)
    if (onBlur) onBlur()
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label
        htmlFor={inputId}
        className={cn(
          "text-sm font-medium text-slate-700 dark:text-slate-300",
          disabled && "opacity-50",
          labelClassName
        )}
      >
        {label}
        {required && (
          <span className="ml-1 text-red-500" aria-label="required">
            *
          </span>
        )}
      </Label>

      <div className="relative">
        <Input
          id={inputId}
          name={name}
          type={actualType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          maxLength={maxLength}
          className={cn(
            "pr-10 transition-all duration-200",
            "bg-white dark:bg-slate-800",
            "border-slate-200 dark:border-slate-700",
            isFocused && !error && "border-blue-500 dark:border-blue-400 ring-1 ring-blue-500 dark:ring-blue-400",
            error && "border-red-500 dark:border-red-400 focus:border-red-500 dark:focus:border-red-400 focus:ring-red-500 dark:focus:ring-red-400",
            success && "border-green-500 dark:border-green-400",
            disabled && "opacity-50 cursor-not-allowed",
            inputClassName
          )}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={[errorId, helpId].filter(Boolean).join(" ") || undefined}
        />

        {/* Password toggle button */}
        {showPasswordToggle && type === "password" && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            onClick={() => setShowPassword(!showPassword)}
            disabled={disabled}
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        )}

        {/* Success indicator */}
        {success && !error && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <CheckCircle className="h-4 w-4 text-green-500" />
          </div>
        )}

        {/* Error indicator */}
        {error && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <AlertCircle className="h-4 w-4 text-red-500" />
          </div>
        )}
      </div>

      {/* Help text */}
      {helpText && !error && (
        <p
          id={helpId}
          className="text-xs text-slate-500 dark:text-slate-400"
        >
          {helpText}
        </p>
      )}

      {/* Error message */}
      {error && (
        <div
          id={errorId}
          className="flex items-start gap-1.5 text-sm text-red-600 dark:text-red-400"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Character count */}
      {maxLength && (
        <div className="text-xs text-slate-500 dark:text-slate-400 text-right">
          {value.length} / {maxLength}
        </div>
      )}
    </div>
  )
}