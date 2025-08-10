import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define protected routes
const protectedRoutes = [
  '/',  // Root route now requires auth and redirects to dashboard
  '/dashboard',
  '/my-organization',
  '/knowledge',
  '/chat',
  '/api-test',
]

// Define public routes that don't require authentication
const publicRoutes = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
]

// Define API routes that need authentication
const protectedApiRoutes = [
  '/api/v1/compliance',
  '/api/v1/organization',
  '/api/v1/knowledge',
  '/api/v1/chat',
  '/api/v1/settings',
]

// Helper function to validate JWT token
function isTokenValid(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const expiryTime = payload.exp * 1000
    return Date.now() < expiryTime
  } catch {
    return false
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('auth_token')?.value || 
                request.headers.get('Authorization')?.replace('Bearer ', '')

  // Validate token if present
  const isValidToken = token ? isTokenValid(token) : false

  // Special handling for root path
  if (pathname === '/') {
    if (!isValidToken) {
      // Redirect unauthenticated users to login
      return NextResponse.redirect(new URL('/login', request.url))
    }
    // Redirect authenticated users to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname === route || (route !== '/' && pathname.startsWith(route))
  )
  
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route
  )

  const isProtectedApiRoute = protectedApiRoutes.some(route =>
    pathname.startsWith(route)
  )

  // Handle protected API routes
  if (isProtectedApiRoute) {
    if (!isValidToken) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Unauthorized', 
          message: 'Authentication required' 
        }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json' } 
        }
      )
    }
    return NextResponse.next()
  }

  // Handle protected page routes
  if (isProtectedRoute) {
    if (!isValidToken) {
      // Store the attempted URL for redirect after login
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }
    return NextResponse.next()
  }

  // Handle public routes when already authenticated
  if (isPublicRoute && isValidToken && (pathname === '/login' || pathname === '/signup')) {
    // Redirect to dashboard if already authenticated
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Handle public routes
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // All other routes require authentication
  if (!isValidToken) {
    // Store the attempted URL for redirect after login
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}