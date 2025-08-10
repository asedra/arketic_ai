"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRight } from "lucide-react"
import { toast } from "sonner"

import { loginSchema, type LoginFormData } from "@/lib/validation/auth-schemas"
import { useAuth } from "@/lib/auth-context"
import { useAuthForm } from "@/lib/hooks/use-auth-form"
import { AUTH_ERRORS, SUCCESS_MESSAGES, BUTTON_LABELS, PLACEHOLDERS } from "@/lib/validation/error-messages"

import { FormInput } from "@/components/auth/FormInput"
import { SubmitButton } from "@/components/auth/SubmitButton"
import { ErrorAlert } from "@/components/ui/ErrorAlert"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form"

interface LoginFormProps {
  onSuccess?: () => void
  redirectTo?: string
}

export function LoginForm({ onSuccess, redirectTo = "/dashboard" }: LoginFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, isLoading, error, clearError, isAuthenticated } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
    mode: "onBlur",
  })

  const {
    errors,
    serverError,
    validateField,
    clearFieldError,
    handleSubmit: handleFormSubmit,
    clearErrors,
    setServerError,
  } = useAuthForm({
    schema: loginSchema,
    onSubmit: async (data: LoginFormData) => {
      setIsSubmitting(true)
      clearError()
      
      try {
        await login({
          email: data.email,
          password: data.password,
          rememberMe: data.rememberMe,
        })
        
        toast.success(SUCCESS_MESSAGES.LOGIN_SUCCESS, {
          description: "Redirecting to your dashboard...",
          duration: 2000,
        })
        
        if (onSuccess) {
          onSuccess()
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : AUTH_ERRORS.SERVER_ERROR
        setServerError(errorMessage)
        
        // Provide specific error toast based on error type
        if (errorMessage.toLowerCase().includes("invalid") || errorMessage.toLowerCase().includes("unauthorized")) {
          toast.error("Invalid Credentials", {
            description: AUTH_ERRORS.INVALID_CREDENTIALS,
            duration: 5000,
          })
        } else if (errorMessage.toLowerCase().includes("network")) {
          toast.error("Connection Error", {
            description: AUTH_ERRORS.NETWORK_ERROR,
            duration: 5000,
          })
        } else {
          toast.error("Login Failed", {
            description: errorMessage,
            duration: 5000,
          })
        }
        
        throw error
      } finally {
        setIsSubmitting(false)
      }
    },
  })

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const urlRedirect = searchParams.get('redirect')
      const storedRedirect = localStorage.getItem('redirect_after_login')
      const redirect = urlRedirect || storedRedirect || redirectTo
      
      localStorage.removeItem('redirect_after_login')
      router.replace(redirect)
    }
  }, [isAuthenticated, router, searchParams, redirectTo])

  // Store redirect URL for after login
  useEffect(() => {
    const redirect = searchParams.get('redirect')
    if (redirect && redirect !== '/login' && redirect !== '/signup') {
      localStorage.setItem('redirect_after_login', redirect)
    }
  }, [searchParams])

  // Handle auth context errors
  useEffect(() => {
    if (error) {
      setServerError(error)
    }
  }, [error, setServerError])

  const onSubmit = async (values: LoginFormData) => {
    await handleFormSubmit(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Server Error Alert */}
        {serverError && (
          <ErrorAlert
            title="Login Failed"
            message={serverError}
            onClose={() => setServerError(null)}
            className="mb-4"
          />
        )}

        {/* Email Field */}
        <FormField
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <FormInput
              name="email"
              label="Email Address"
              type="email"
              value={field.value}
              onChange={(value) => {
                field.onChange(value)
                if (fieldState.error) {
                  validateField("email", value)
                }
              }}
              onBlur={() => {
                field.onBlur()
                validateField("email", field.value)
              }}
              error={fieldState.error?.message || errors.email}
              placeholder={PLACEHOLDERS.EMAIL}
              disabled={isSubmitting || isLoading}
              required
              autoComplete="email"
            />
          )}
        />

        {/* Password Field */}
        <FormField
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <FormInput
              name="password"
              label="Password"
              type="password"
              value={field.value}
              onChange={(value) => {
                field.onChange(value)
                if (fieldState.error) {
                  validateField("password", value)
                }
              }}
              onBlur={() => {
                field.onBlur()
                validateField("password", field.value)
              }}
              error={fieldState.error?.message || errors.password}
              placeholder={PLACEHOLDERS.PASSWORD}
              disabled={isSubmitting || isLoading}
              required
              autoComplete="current-password"
              showPasswordToggle
            />
          )}
        />

        {/* Remember Me */}
        <FormField
          control={form.control}
          name="rememberMe"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isSubmitting || isLoading}
                  aria-label="Remember me"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-sm font-normal text-slate-600 dark:text-slate-400 cursor-pointer">
                  Remember me
                </FormLabel>
              </div>
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <SubmitButton
          type="submit"
          isLoading={isSubmitting || isLoading}
          disabled={isSubmitting || isLoading}
          loadingText={BUTTON_LABELS.SIGNING_IN}
          fullWidth
          className="h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium"
          icon={<ArrowRight className="h-4 w-4" />}
        >
          {BUTTON_LABELS.SIGN_IN}
        </SubmitButton>
      </form>
    </Form>
  )
}