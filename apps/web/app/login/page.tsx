"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, Loader2, ArrowRight, Shield, AlertCircle, CheckCircle } from "lucide-react"
import { loginSchema } from "@/lib/auth"
import { useAuth } from "@/lib/auth-context"
import type { LoginFormValues } from "@/types/auth"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, isLoading, error, clearError, isAuthenticated } = useAuth()
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "test@arketic.com",
      password: "testpass123",
      rememberMe: false,
    },
  })

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // Get redirect URL from multiple sources with priority
      const urlRedirect = searchParams.get('redirect')
      const storedRedirect = localStorage.getItem('redirect_after_login')
      const redirect = urlRedirect || storedRedirect || '/dashboard'
      
      // Clean up stored redirect
      localStorage.removeItem('redirect_after_login')
      
      // Show success message and redirect
      toast.success('Welcome back!', {
        description: 'Redirecting to your dashboard...',
        duration: 2000,
      })
      
      router.replace(redirect)
    }
  }, [isAuthenticated, router, searchParams])

  // Store redirect URL for after login
  useEffect(() => {
    const redirect = searchParams.get('redirect')
    if (redirect && redirect !== '/login' && redirect !== '/signup') {
      localStorage.setItem('redirect_after_login', redirect)
    }
  }, [searchParams])
  
  // Define onSubmit with useCallback to prevent recreation on every render
  const onSubmit = useCallback(async (values: LoginFormValues) => {
    clearError()
    
    // Debug: Log form submission
    console.group('🔐 Login Form Submission')
    console.log('Form Values:', {
      email: values.email,
      password: values.password.substring(0, 3) + '*'.repeat(values.password.length - 3),
      rememberMe: values.rememberMe
    })
    console.groupEnd()
    
    try {
      await login({
        email: values.email,
        password: values.password,
        rememberMe: values.rememberMe,
      })
      
      // Login success is handled by the useEffect above when isAuthenticated changes
      console.log('Login request completed successfully')
    } catch (error) {
      // Error handling is done in the auth context and error state
      console.error('Login submission error:', error)
    }
  }, [clearError, login])
  
  // Handle error state changes with better UX
  useEffect(() => {
    if (error) {
      console.error('🚨 Login error in component:', error)
      
      // Provide more specific error messages
      let title = 'Login Failed'
      let description = error
      
      if (error.includes('Invalid credentials') || error.includes('Unauthorized')) {
        title = 'Invalid Credentials'
        description = 'Please check your email and password and try again.'
      } else if (error.includes('Network') || error.includes('fetch')) {
        title = 'Connection Error'
        description = 'Please check your internet connection and try again.'
      } else if (error.includes('Server') || error.includes('500')) {
        title = 'Server Error'
        description = 'Our servers are experiencing issues. Please try again later.'
      }
      
      toast.error(title, {
        description: description,
        duration: 6000,
        action: {
          label: 'Retry',
          onClick: () => form.handleSubmit(onSubmit)()
        }
      })
    }
  }, [error, form, onSubmit])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md relative">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Welcome back
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Sign in to Arketic
          </p>
        </div>

        <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 shadow-xl border-0">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-semibold text-center text-slate-900 dark:text-slate-100">
              Sign In
            </CardTitle>
            <CardDescription className="text-center text-slate-600 dark:text-slate-400">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Error Alert */}
                {error && (
                  <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-md flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}
                
                
                {/* Email Field */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 dark:text-slate-300">
                        Email Address
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          name="email"
                          type="email"
                          placeholder="Enter your email"
                          disabled={isLoading}
                          className="h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200"
                          autoComplete="email"
                          required
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Password Field */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 dark:text-slate-300">
                        Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            name="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            disabled={isLoading}
                            className="h-11 pr-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200"
                            autoComplete="current-password"
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={isLoading}
                            tabIndex={-1}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <FormField
                    control={form.control}
                    name="rememberMe"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-normal text-slate-600 dark:text-slate-400">
                            Remember me
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <Link
                    href="/forgot-password"
                    className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                
                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium transition-all duration-200"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          
          <CardFooter>
            <div className="w-full text-center text-sm text-slate-600 dark:text-slate-400">
              Don't have an account?{" "}
              <Link
                href="/signup"
                className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors hover:underline"
              >
                Create account
              </Link>
            </div>
          </CardFooter>
        </Card>
        
        {/* Demo Credentials */}
        <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Test Credentials (Database User):
          </h3>
          <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <p><strong>Email:</strong> test@arketic.com</p>
            <p><strong>Password:</strong> testpass123</p>
            <p className="text-green-600 dark:text-green-400 mt-2">
              Note: Real database user for testing authentication
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}