/**
 * Debug helpers for frontend-backend integration
 */

export const DEBUG_MODE = process.env.NODE_ENV === 'development'

export function logApiCall(endpoint: string, method: string, data?: any) {
  if (DEBUG_MODE) {
    console.group(`🌐 API Call: ${method} ${endpoint}`)
    if (data) {
      console.log('📤 Request Data:', data)
    }
    console.groupEnd()
  }
}

export function logApiResponse(endpoint: string, response: any, success: boolean) {
  if (DEBUG_MODE) {
    console.group(`📡 API Response: ${endpoint}`)
    console.log(success ? '✅ Success' : '❌ Error')
    console.log('📥 Response Data:', response)
    console.groupEnd()
  }
}

export function logAuthState(isAuthenticated: boolean, token?: string) {
  if (DEBUG_MODE) {
    console.group('🔐 Authentication State')
    console.log('Authenticated:', isAuthenticated)
    if (token) {
      console.log('Token preview:', `${token.substring(0, 10)}...`)
    }
    console.groupEnd()
  }
}

export function logValidationError(field: string, error: string) {
  if (DEBUG_MODE) {
    console.warn(`⚠️ Validation Error - ${field}: ${error}`)
  }
}

export function logTransformation(input: any, output: any, description: string) {
  if (DEBUG_MODE) {
    console.group(`🔄 Data Transformation: ${description}`)
    console.log('Input:', input)
    console.log('Output:', output)
    console.groupEnd()
  }
}

// Helper to check response structure
export function validateApiResponse(response: any, expectedFields: string[]): boolean {
  if (!response || typeof response !== 'object') {
    console.error('❌ API Response is not an object:', response)
    return false
  }

  const missingFields = expectedFields.filter(field => !(field in response))
  
  if (missingFields.length > 0) {
    console.error('❌ API Response missing fields:', missingFields)
    console.log('Available fields:', Object.keys(response))
    return false
  }

  return true
}

// Performance monitoring
export class ApiPerformanceMonitor {
  private static calls: Map<string, { start: number; count: number }> = new Map()

  static startCall(endpoint: string) {
    if (!DEBUG_MODE) return

    const existing = this.calls.get(endpoint) || { count: 0, start: 0 }
    this.calls.set(endpoint, {
      start: Date.now(),
      count: existing.count + 1
    })
  }

  static endCall(endpoint: string) {
    if (!DEBUG_MODE) return

    const call = this.calls.get(endpoint)
    if (call) {
      const duration = Date.now() - call.start
      console.log(`⏱️ ${endpoint}: ${duration}ms (call #${call.count})`)
      
      if (duration > 3000) {
        console.warn(`🐌 Slow API call detected: ${endpoint} took ${duration}ms`)
      }
    }
  }

  static getStats() {
    if (!DEBUG_MODE) return {}
    return Object.fromEntries(this.calls)
  }
}