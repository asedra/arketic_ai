import { useState, useCallback, useEffect } from "react"
import { z } from "zod"
import { getErrorMessage } from "@/lib/validation/error-messages"

interface UseAuthFormOptions<T extends z.ZodSchema> {
  schema: T
  onSubmit: (data: z.infer<T>) => Promise<void>
  onSuccess?: () => void
  onError?: (error: string) => void
}

interface UseAuthFormReturn<T extends z.ZodSchema> {
  isSubmitting: boolean
  errors: Record<string, string>
  serverError: string | null
  validateField: (name: string, value: any) => void
  clearFieldError: (name: string) => void
  handleSubmit: (data: z.infer<T>) => Promise<void>
  clearErrors: () => void
  setServerError: (error: string | null) => void
  isValid: boolean
}

export function useAuthForm<T extends z.ZodSchema>({
  schema,
  onSubmit,
  onSuccess,
  onError,
}: UseAuthFormOptions<T>): UseAuthFormReturn<T> {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [isValid, setIsValid] = useState(false)

  // Field-level validation
  const validateField = useCallback(
    (name: string, value: any) => {
      try {
        // Create a partial object with only the field being validated
        const partialData = { [name]: value }
        
        // Try to parse just this field
        const fieldSchema = schema.shape[name as keyof typeof schema.shape]
        if (fieldSchema) {
          fieldSchema.parse(value)
          
          // Clear error if validation passes
          setErrors((prev) => {
            const newErrors = { ...prev }
            delete newErrors[name]
            return newErrors
          })
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          const fieldError = error.errors[0]
          setErrors((prev) => ({
            ...prev,
            [name]: fieldError.message,
          }))
        }
      }
    },
    [schema]
  )

  // Clear specific field error
  const clearFieldError = useCallback((name: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[name]
      return newErrors
    })
  }, [])

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors({})
    setServerError(null)
  }, [])

  // Handle form submission
  const handleSubmit = useCallback(
    async (data: z.infer<T>) => {
      // Clear previous errors
      clearErrors()
      setIsSubmitting(true)

      try {
        // Validate all data
        const validatedData = schema.parse(data)
        
        // Submit the form
        await onSubmit(validatedData)
        
        // Call success callback if provided
        if (onSuccess) {
          onSuccess()
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          // Handle validation errors
          const fieldErrors: Record<string, string> = {}
          error.errors.forEach((err) => {
            const path = err.path.join(".")
            if (path) {
              fieldErrors[path] = err.message
            }
          })
          setErrors(fieldErrors)
          
          // Set a general validation error
          setServerError("Please correct the errors below and try again.")
          
          if (onError) {
            onError("Validation failed")
          }
        } else if (error instanceof Error) {
          // Handle server errors
          const errorMessage = getErrorMessage(error.message)
          setServerError(errorMessage)
          
          if (onError) {
            onError(errorMessage)
          }
        } else {
          // Handle unknown errors
          const errorMessage = "An unexpected error occurred. Please try again."
          setServerError(errorMessage)
          
          if (onError) {
            onError(errorMessage)
          }
        }
      } finally {
        setIsSubmitting(false)
      }
    },
    [schema, onSubmit, onSuccess, onError, clearErrors]
  )

  // Update isValid when errors change
  useEffect(() => {
    setIsValid(Object.keys(errors).length === 0 && !serverError)
  }, [errors, serverError])

  return {
    isSubmitting,
    errors,
    serverError,
    validateField,
    clearFieldError,
    handleSubmit,
    clearErrors,
    setServerError,
    isValid,
  }
}

// Hook for debouncing validation
export function useDebouncedValidation(
  validateFn: (name: string, value: any) => void,
  delay: number = 300
) {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)

  const debouncedValidate = useCallback(
    (name: string, value: any) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      const newTimeoutId = setTimeout(() => {
        validateFn(name, value)
      }, delay)

      setTimeoutId(newTimeoutId)
    },
    [validateFn, delay, timeoutId]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [timeoutId])

  return debouncedValidate
}