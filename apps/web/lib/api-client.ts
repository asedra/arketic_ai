"use client"

import { NetworkError, ServerError, UnauthorizedError, ValidationError, withRetry, CircuitBreaker } from "./error-handling"
import { logApiCall, logApiResponse, ApiPerformanceMonitor } from "./debug-helpers"

export interface ApiResponse<T = any> {
  data: T
  success: boolean
  message?: string
  errors?: Record<string, string[]>
  meta?: {
    pagination?: {
      page: number
      per_page: number
      total: number
      total_pages: number
    }
  }
}

export interface ApiError {
  message: string
  code?: string
  status?: number
  errors?: Record<string, string[]>
}

export interface RequestConfig extends RequestInit {
  timeout?: number
  retries?: number
  retryDelay?: number
  skipErrorHandling?: boolean
}

class ApiClient {
  private baseURL: string
  private defaultTimeout = 30000
  private circuitBreaker = new CircuitBreaker()
  private tokenRefreshPromise: Promise<string> | null = null

  constructor(baseURL?: string) {
    // Auto-detect API URL based on environment
    this.baseURL = baseURL || this.getApiUrl()
  }
  
  private getApiUrl(): string {
    // Check if running in browser
    if (typeof window !== 'undefined') {
      return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    }
    
    // Server-side: use Docker service name if in Docker environment
    if (process.env.DOCKER_ENV === 'true') {
      return 'http://api:8000'
    }
    
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  }

  private async request<T = any>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      timeout = this.defaultTimeout,
      retries = 3,
      retryDelay = 1000,
      skipErrorHandling = false,
      ...fetchConfig
    } = config

    const url = `${this.baseURL}${endpoint}`
    const method = fetchConfig.method || 'GET'
    
    // Debug logging
    logApiCall(endpoint, method, fetchConfig.body ? JSON.parse(fetchConfig.body as string) : undefined)
    ApiPerformanceMonitor.startCall(endpoint)
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const requestConfig: RequestInit = {
      ...fetchConfig,
      headers: {
        "Content-Type": "application/json",
        ...await this.getAuthHeaders(),
        ...fetchConfig.headers,
      },
      signal: controller.signal,
    }

    // Debug: Log the exact request body being sent
    if (endpoint.includes('/ai-message') && fetchConfig.body) {
      console.log('🔍 API Client Debug - Final request body:', fetchConfig.body)
      console.log('🔍 API Client Debug - Body type:', typeof fetchConfig.body)
      console.log('🔍 API Client Debug - Body parsed back:', JSON.parse(fetchConfig.body as string))
    }

    try {
      const response = await this.circuitBreaker.execute(async () => {
        return await withRetry(
          async () => {
            const res = await fetch(url, requestConfig)
            
            clearTimeout(timeoutId)
            
            if (!res.ok) {
              try {
                await this.handleHttpError(res)
              } catch (error: any) {
                // Special handling for token refresh retry
                if (error.message === 'RETRY_WITH_NEW_TOKEN') {
                  // Update headers with new token and retry
                  const newHeaders = await this.getAuthHeaders()
                  const retryConfig = {
                    ...requestConfig,
                    headers: {
                      ...requestConfig.headers,
                      ...newHeaders
                    }
                  }
                  const retryRes = await fetch(url, retryConfig)
                  if (!retryRes.ok) {
                    await this.handleHttpError(retryRes)
                  }
                  return retryRes
                }
                throw error
              }
            }
            
            return res
          },
          {
            maxAttempts: retries,
            baseDelay: retryDelay,
            retryCondition: (error) => {
              // Retry on network errors, 5xx server errors, and token refresh scenarios
              return error instanceof NetworkError || 
                     (error instanceof ServerError && error.message.includes("5")) ||
                     error.message === 'RETRY_WITH_NEW_TOKEN'
            }
          }
        )
      })

      const data = await response.json()
      
      // Debug logging
      ApiPerformanceMonitor.endCall(endpoint)
      logApiResponse(endpoint, data, true)
      
      // Special handling for auth endpoints that return data directly
      if (endpoint.includes('/auth/') && data && !('data' in data) && ('access_token' in data || 'user' in data)) {
        console.log('🔄 Auth endpoint returning data directly, wrapping in standard format')
        console.log('Original data:', data)
        const wrappedResponse = {
          data: data,
          success: true,
          message: 'Authentication successful'
        } as ApiResponse<T>
        console.log('Wrapped response:', wrappedResponse)
        return wrappedResponse
      }
      
      // Ensure data has the expected ApiResponse structure
      if (data && typeof data === 'object' && !('data' in data) && !('success' in data)) {
        // This might be a direct data response, wrap it
        return {
          data: data,
          success: true
        } as ApiResponse<T>
      }
      
      return data as ApiResponse<T>
    } catch (error) {
      ApiPerformanceMonitor.endCall(endpoint)
      clearTimeout(timeoutId)
      
      // Debug logging for errors
      logApiResponse(endpoint, error, false)
      
      if (!skipErrorHandling) {
        this.handleError(error as Error, { endpoint, config })
      }
      
      throw error
    }
  }

  private async handleHttpError(response: Response): Promise<never> {
    const contentType = response.headers.get("content-type")
    let errorData: any = {}

    try {
      if (contentType?.includes("application/json")) {
        errorData = await response.json()
      } else {
        errorData = { message: await response.text() }
      }
    } catch {
      errorData = { message: "Unknown error occurred" }
    }
    
    console.log('🚨 HTTP Error Details:')
    console.log('Status:', response.status)
    console.log('Status Text:', response.statusText)
    console.log('Error Data:', errorData)
    console.log('URL:', response.url)

    // Handle different error formats from backend
    const baseMessage = errorData.detail || errorData.message || `HTTP ${response.status}: ${response.statusText}`

    switch (response.status) {
      case 400:
        throw new ValidationError(baseMessage, { 
          status: response.status,
          errors: errorData.errors 
        })
      case 401:
        console.error('🚫 401 Unauthorized Error:')
        console.error('Response:', errorData)
        console.error('Request endpoint:', response.url)
        
        // Try token refresh before redirecting to login
        if (typeof window !== 'undefined' && this.shouldAttemptTokenRefresh(response.url)) {
          try {
            console.log('Attempting automatic token refresh...')
            await this.refreshToken()
            // Don't throw error, let the request retry with new token
            throw new Error('RETRY_WITH_NEW_TOKEN')
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError)
            // Clear invalid tokens and redirect to login
            this.clearAuthTokens()
            
            // Store current URL for redirect after login
            const currentPath = window.location.pathname
            if (currentPath !== '/login' && currentPath !== '/signup') {
              localStorage.setItem('redirect_after_login', currentPath)
            }
            
            // Don't auto-redirect if we're already on login page to avoid loops
            if (currentPath !== '/login') {
              console.log('Redirecting to login due to 401')
              window.location.href = '/login'
            }
          }
        }
        const errorMessage = errorData.detail || errorData.message || 'Authentication required'
        throw new UnauthorizedError(errorMessage)
      case 403:
        throw new UnauthorizedError("Access forbidden")
      case 404:
        throw new ValidationError("Resource not found", { status: response.status })
      case 422:
        console.error('422 Validation Error Details:', errorData)
        throw new ValidationError(baseMessage, { 
          status: response.status,
          errors: errorData.errors,
          detail: errorData.detail 
        })
      case 429:
        throw new NetworkError("Too many requests. Please slow down.", { 
          status: response.status 
        })
      case 500:
      case 502:
      case 503:
      case 504:
        console.error('Server Error Details:', {
          status: response.status,
          url: response.url,
          errorData: errorData
        })
        throw new ServerError(baseMessage, { 
          status: response.status,
          errors: errorData.errors,
          detail: errorData.detail 
        })
      default:
        throw new NetworkError(baseMessage, { status: response.status })
    }
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {}
    
    if (typeof window !== 'undefined') {
      // Try cookie first, then localStorage
      const cookieToken = this.getCookieToken()
      const storageToken = localStorage.getItem('auth_token')
      let token = cookieToken || storageToken
      
      // Check if token is expired and attempt auto-refresh
      if (token && this.isTokenExpiring(token)) {
        try {
          token = await this.refreshToken()
        } catch (error) {
          console.error('Auto token refresh failed:', error)
          // Continue with existing token, let the request fail naturally
        }
      }
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }
    
    return headers
  }
  
  private isTokenExpiring(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const expiryTime = payload.exp * 1000
      const timeUntilExpiry = expiryTime - Date.now()
      // Return true if less than 2 minutes until expiry
      return timeUntilExpiry <= 2 * 60 * 1000
    } catch {
      // If we can't decode, assume it's not expiring
      return false
    }
  }
  
  private getCookieToken(): string | null {
    if (typeof document === 'undefined') return null
    
    const value = `; ${document.cookie}`
    const parts = value.split(`; auth_token=`)
    if (parts.length === 2) {
      return decodeURIComponent(parts.pop()?.split(';').shift() || '')
    }
    return null
  }
  
  private shouldAttemptTokenRefresh(url: string): boolean {
    // Don't attempt refresh for auth endpoints to avoid infinite loops
    return !url.includes('/auth/login') && 
           !url.includes('/auth/register') && 
           !url.includes('/auth/refresh') &&
           !url.includes('/auth/logout')
  }

  private async refreshToken(): Promise<string> {
    if (this.tokenRefreshPromise) {
      return this.tokenRefreshPromise
    }

    this.tokenRefreshPromise = this.performTokenRefresh()
    
    try {
      const newToken = await this.tokenRefreshPromise
      this.tokenRefreshPromise = null
      return newToken
    } catch (error) {
      this.tokenRefreshPromise = null
      throw error
    }
  }

  private async performTokenRefresh(): Promise<string> {
    if (typeof window === 'undefined') {
      throw new UnauthorizedError('No refresh token available')
    }

    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      throw new UnauthorizedError('No refresh token available')
    }

    try {
      const response = await fetch(`${this.baseURL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken })
      })

      if (!response.ok) {
        throw new UnauthorizedError('Token refresh failed')
      }

      const data = await response.json()
      console.log('API Client token refresh response:', data)
      
      // Backend returns data directly (snake_case format)
      if (!data || !data.access_token) {
        console.error('Invalid token refresh response:', data)
        throw new Error('No access token in refresh response')
      }
      
      const newToken = data.access_token
      
      // Update stored tokens
      localStorage.setItem('auth_token', newToken)
      const refreshToken = data.refresh_token
      if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken)
      }
      
      console.log('API Client token refresh successful')
      return newToken
    } catch (error) {
      // Clear invalid tokens
      localStorage.removeItem('auth_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user_data')
      
      // Redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      
      throw new UnauthorizedError('Session expired. Please log in again.')
    }
  }
  
  private clearAuthTokens(): void {
    if (typeof window === 'undefined') return
    
    // Clear localStorage
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_data')
    localStorage.removeItem('remember_me')
    
    // Clear cookies
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
  }

  private handleError(error: Error, context: Record<string, any>): void {
    if (error.name === "AbortError") {
      throw new NetworkError("Request timeout", context)
    }
    
    if (error.message.includes("fetch")) {
      throw new NetworkError("Network request failed", context)
    }
    
    throw error
  }

  // HTTP Methods
  async get<T = any>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: "GET" })
  }

  async post<T = any>(
    endpoint: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T = any>(
    endpoint: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async patch<T = any>(
    endpoint: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T = any>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: "DELETE" })
  }

  // File upload with progress
  async uploadFile<T = any>(
    endpoint: string,
    file: File,
    options: {
      onProgress?: (progress: number) => void
      additionalData?: Record<string, any>
      config?: RequestConfig
    } = {}
  ): Promise<ApiResponse<T>> {
    const { onProgress, additionalData = {}, config = {} } = options
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const formData = new FormData()

      formData.append("file", file)
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value))
      })

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = (event.loaded / event.total) * 100
          onProgress(progress)
        }
      })

      xhr.addEventListener("load", () => {
        try {
          if (xhr.status >= 200 && xhr.status < 300) {
            const response = JSON.parse(xhr.responseText)
            resolve(response)
          } else {
            const error = new ServerError(`Upload failed: ${xhr.statusText}`)
            reject(error)
          }
        } catch (error) {
          reject(new ServerError("Invalid response from server"))
        }
      })

      xhr.addEventListener("error", () => {
        reject(new NetworkError("Upload failed"))
      })

      xhr.addEventListener("timeout", () => {
        reject(new NetworkError("Upload timeout"))
      })

      xhr.timeout = config.timeout || this.defaultTimeout
      xhr.open("POST", `${this.baseURL}${endpoint}`)
      
      // Add auth headers automatically
      this.getAuthHeaders().then(authHeaders => {
        const allHeaders = { ...authHeaders, ...config.headers as Record<string, string> || {} }
        Object.entries(allHeaders).forEach(([key, value]) => {
          if (key.toLowerCase() !== "content-type") { // Let browser set content-type for FormData
            xhr.setRequestHeader(key, value)
          }
        })
        
        xhr.send(formData)
      }).catch(error => {
        console.error('Failed to get auth headers for file upload:', error)
        // Send without auth headers as fallback
        const headers = config.headers as Record<string, string> || {}
        Object.entries(headers).forEach(([key, value]) => {
          if (key.toLowerCase() !== "content-type") {
            xhr.setRequestHeader(key, value)
          }
        })
        xhr.send(formData)
      })
    })
  }

  // Batch requests
  async batch<T = any>(
    requests: Array<{
      method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
      endpoint: string
      data?: any
    }>,
    config?: RequestConfig
  ): Promise<Array<ApiResponse<T>>> {
    const promises = requests.map((req) => {
      switch (req.method) {
        case "GET":
          return this.get<T>(req.endpoint, config)
        case "POST":
          return this.post<T>(req.endpoint, req.data, config)
        case "PUT":
          return this.put<T>(req.endpoint, req.data, config)
        case "PATCH":
          return this.patch<T>(req.endpoint, req.data, config)
        case "DELETE":
          return this.delete<T>(req.endpoint, config)
        default:
          throw new ValidationError(`Unsupported method: ${req.method}`)
      }
    })

    return Promise.allSettled(promises).then((results) =>
      results.map((result) => {
        if (result.status === "fulfilled") {
          return result.value
        } else {
          // Return error response format
          return {
            data: null,
            success: false,
            message: result.reason.message,
          } as ApiResponse<T>
        }
      })
    )
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.get("/health", { 
        timeout: 5000, 
        retries: 1,
        skipErrorHandling: true 
      })
      return true
    } catch {
      return false
    }
  }

  // Get circuit breaker status
  getCircuitBreakerState(): "closed" | "open" | "half-open" {
    return this.circuitBreaker.getState()
  }
}

// Create singleton instance
export const apiClient = new ApiClient()

// Authentication API
export const authApi = {
  login: (credentials: { email: string; password: string; rememberMe?: boolean }) => {
    console.log('🔑 AuthAPI Login called with:', {
      email: credentials.email,
      password: credentials.password ? '[REDACTED]' : 'undefined',
      rememberMe: credentials.rememberMe
    })
    return apiClient.post('/api/v1/auth/login', credentials)
  },
  
  register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    apiClient.post('/api/v1/auth/register', data),
  
  logout: () =>
    apiClient.post('/api/v1/auth/logout'),
  
  refresh: () => {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null
    if (!refreshToken) {
      throw new UnauthorizedError('No refresh token available')
    }
    return apiClient.post('/api/v1/auth/refresh', { refresh_token: refreshToken })
  },
  
  getMe: () =>
    apiClient.get('/api/v1/auth/me'),
  
  forgotPassword: (email: string) =>
    apiClient.post('/api/v1/auth/forgot-password', { email }),
  
  resetPassword: (token: string, password: string) =>
    apiClient.post('/api/v1/auth/reset-password', { token, password }),
  
  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.post('/api/v1/auth/change-password', { currentPassword, newPassword }),
}

// Specialized API clients for different domains
export const complianceApi = {
  getDocuments: (filters?: Record<string, any>) =>
    apiClient.get("/api/v1/compliance/", { 
      headers: { ...filters && { "X-Filters": JSON.stringify(filters) } }
    }),
  
  getDocument: (id: string) =>
    apiClient.get(`/api/v1/compliance/${id}`),
  
  createDocument: (data: any) =>
    apiClient.post("/api/v1/compliance/", data),
  
  updateDocument: (id: string, data: any) =>
    apiClient.put(`/api/v1/compliance/${id}`, data),
  
  deleteDocument: (id: string) =>
    apiClient.delete(`/api/v1/compliance/${id}`),
  
  uploadDocument: (file: File, onProgress?: (progress: number) => void) =>
    apiClient.uploadFile("/api/v1/compliance/upload", file, { onProgress }),
}

// Knowledge API interfaces
export interface UploadTextDocumentRequest {
  title: string
  content: string
  description?: string
  tags?: string[]
  collection_id?: string
}

export interface UploadFileRequest {
  file: File
  description?: string
  tags?: string[]
  collection_id?: string
}

export interface DocumentResponse {
  id: string
  title: string
  content?: string
  file_path?: string
  description?: string
  tags?: string[]
  collection_id?: string
  created_at: string
  updated_at: string
  file_size?: number
  file_type?: string
}

export interface EmbeddingChunk {
  chunk_id: string
  chunk_index: number
  chunk_text: string
  token_count: number
  embedding_preview: number[]
  embedding_dimensions: number
  created_at: string
}

export interface DocumentEmbeddingsResponse {
  document_id: string
  title: string
  total_chunks: number
  total_tokens: number
  embedding_model: string
  embedding_dimensions: number
  chunks: EmbeddingChunk[]
  metadata?: Record<string, any>
}

export interface SearchRequest {
  query: string
  limit?: number
  threshold?: number
  collection_id?: string
}

export interface RAGQueryRequest {
  question: string
  collection_id?: string
  limit?: number
  threshold?: number
}

export interface CollectionRequest {
  name: string
  description?: string
  metadata?: Record<string, any>
}

export interface CollectionResponse {
  id: string
  name: string
  description?: string
  metadata?: Record<string, any>
  document_count: number
  created_at: string
  updated_at: string
}

export const knowledgeApi = {
  // Document management
  uploadTextDocument: (data: UploadTextDocumentRequest) =>
    apiClient.post<DocumentResponse>("/api/v1/knowledge/upload", data),
  
  uploadFile: (file: File, options: { 
    description?: string
    tags?: string[]
    collection_id?: string
    onProgress?: (progress: number) => void
  } = {}) => {
    const { onProgress, ...additionalData } = options
    return apiClient.uploadFile<DocumentResponse>(
      "/api/v1/knowledge/upload/file", 
      file, 
      { onProgress, additionalData }
    )
  },
  
  listDocuments: (limit = 50, offset = 0) =>
    apiClient.get<DocumentResponse[]>(`/api/v1/knowledge/list?limit=${limit}&offset=${offset}`),
  
  getDocument: (documentId: string) =>
    apiClient.get<DocumentResponse>(`/api/v1/knowledge/${documentId}`),
  
  getDocumentEmbeddings: (documentId: string) =>
    apiClient.get<DocumentEmbeddingsResponse>(`/api/v1/knowledge/${documentId}/embeddings`),
  
  deleteDocument: (documentId: string) =>
    apiClient.delete(`/api/v1/knowledge/${documentId}`),
  
  // Search and query
  searchDocuments: (data: SearchRequest) =>
    apiClient.post<DocumentResponse[]>("/api/v1/knowledge/search", data),
  
  ragQuery: (data: RAGQueryRequest) =>
    apiClient.post<{ answer: string; sources: DocumentResponse[]; context: string[] }>("/api/v1/knowledge/query", data),
  
  findSimilarDocuments: (documentId: string, limit = 10) =>
    apiClient.get<DocumentResponse[]>(`/api/v1/knowledge/similar/${documentId}?limit=${limit}`),
  
  // Collection management
  createCollection: (data: CollectionRequest) =>
    apiClient.post<CollectionResponse>("/api/v1/collections", data),
  
  listCollections: () =>
    apiClient.get<CollectionResponse[]>("/api/v1/collections"),
  
  updateCollection: (collectionId: string, data: Partial<CollectionRequest>) =>
    apiClient.put<CollectionResponse>(`/api/v1/collections/${collectionId}`, data),
  
  deleteCollection: (collectionId: string) =>
    apiClient.delete(`/api/v1/collections/${collectionId}`),
  
  // Legacy methods for backward compatibility
  getItems: (search?: string) =>
    apiClient.get("/api/v1/compliance/", {
      headers: { ...search && { "X-Search": search } }
    }),
  
  syncIntegrations: () =>
    apiClient.post("/api/v1/compliance/sync"),
}

// Assistant API types
export interface AssistantCreateRequest {
  name: string
  description?: string
  system_prompt?: string
  ai_model?: string
  temperature?: number
  max_tokens?: number
  is_public?: boolean
  knowledge_base_ids?: string[]
  document_ids?: string[]
  configuration?: Record<string, any>
}

export interface AssistantUpdateRequest {
  name?: string
  description?: string
  system_prompt?: string
  ai_model?: string
  temperature?: number
  max_tokens?: number
  status?: 'active' | 'inactive' | 'draft' | 'archived'
  is_public?: boolean
  knowledge_base_ids?: string[]
  document_ids?: string[]
  configuration?: Record<string, any>
}

export interface AssistantResponse {
  id: string
  name: string
  description?: string
  ai_model: string
  ai_model_display: string
  temperature: number
  max_tokens: number
  status: string
  is_public: boolean
  creator_id: string
  total_conversations: number
  total_messages: number
  total_tokens_used: number
  knowledge_count: number
  document_count: number
  created_at: string
  updated_at: string
  last_used_at?: string
}

export interface AssistantDetailResponse extends AssistantResponse {
  system_prompt?: string
  configuration?: Record<string, any>
  knowledge_bases?: Array<{
    knowledge_base_id: string
    name: string
    description?: string
  }>
  documents?: Array<{
    document_id: string
    title: string
    knowledge_base_id: string
  }>
}

export interface AssistantListResponse {
  assistants: AssistantResponse[]
  total: number
  page: number
  limit: number
  has_next: boolean
  has_prev: boolean
}

export interface ManageKnowledgeRequest {
  knowledge_base_ids?: string[]
  document_ids?: string[]
  action: 'add' | 'remove' | 'replace'
}

export interface AIModel {
  value: string
  label: string
  description: string
  max_tokens: number
  cost_per_1k_tokens?: number
}

export interface ModelsResponse {
  models: AIModel[]
  default_model: string
}

export const assistantApi = {
  // Core assistant management
  createAssistant: (data: AssistantCreateRequest) =>
    apiClient.post<AssistantDetailResponse>("/api/v1/assistants/", data),
  
  listAssistants: (params?: {
    query?: string
    ai_model?: string
    status?: string
    is_public?: boolean
    creator_id?: string
    page?: number
    limit?: number
    sort_by?: string
    sort_order?: 'asc' | 'desc'
  }) => {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value))
        }
      })
    }
    const queryString = queryParams.toString()
    return apiClient.get<AssistantListResponse>(`/api/v1/assistants/${queryString ? `?${queryString}` : ''}`)
  },
  
  getAssistant: (assistantId: string, includeDetails = true) =>
    apiClient.get<AssistantDetailResponse>(`/api/v1/assistants/${assistantId}?include_details=${includeDetails}`),
  
  updateAssistant: (assistantId: string, data: AssistantUpdateRequest) =>
    apiClient.put<AssistantDetailResponse>(`/api/v1/assistants/${assistantId}`, data),
  
  deleteAssistant: (assistantId: string) =>
    apiClient.delete<{ message: string; assistant_id: string }>(`/api/v1/assistants/${assistantId}`),
  
  // Knowledge management
  getAssistantKnowledge: (assistantId: string) =>
    apiClient.get<{
      assistant_id: string
      knowledge_bases: Array<{
        id: string
        name: string
        description?: string
        type: string
        document_count: number
      }>
      documents: Array<{
        id: string
        title: string
        knowledge_base_id?: string
        collection_name?: string
        source_type: string
        file_name?: string
      }>
    }>(`/api/v1/assistants/${assistantId}/knowledge`),
  
  updateAssistantKnowledge: (assistantId: string, data: {
    knowledge_base_ids: string[]
    document_ids: string[]
  }) =>
    apiClient.post<{
      success: boolean
      message: string
      knowledge_base_count: number
      document_count: number
    }>(`/api/v1/assistants/${assistantId}/knowledge`, data),
  
  getAvailableKnowledge: (assistantId: string) =>
    apiClient.get<{
      collections: Array<{
        id: string
        name: string
        description?: string
        type: string
        document_count: number
        is_public: boolean
        documents: Array<{
          id: string
          title: string
          source_type: string
          file_name?: string
          chunk_count?: number
          token_count?: number
        }>
      }>
      selected_collection_ids: string[]
      selected_document_ids: string[]
    }>(`/api/v1/assistants/${assistantId}/available-knowledge`),
  
  manageKnowledge: (assistantId: string, data: ManageKnowledgeRequest) =>
    apiClient.post<{ message: string; action: string; result: any }>(`/api/v1/assistants/${assistantId}/knowledge`, data),
  
  // Chat integration
  getChatConfig: (assistantId: string) =>
    apiClient.get<{
      success: boolean
      data: {
        id: string
        name: string
        description?: string
        system_prompt: string
        ai_model: string
        temperature: number
        max_tokens: number
        knowledge_base_ids: string[]
        document_ids: string[]
        configuration?: Record<string, any>
      }
      timestamp: string
    }>(`/api/v1/assistants/${assistantId}/chat-config`),
  
  // Usage tracking
  logUsage: (assistantId: string, action: string, chatId?: string, tokensUsed?: number, processingTimeMs?: number) => {
    const queryParams = new URLSearchParams({ action })
    if (chatId) queryParams.append('chat_id', chatId)
    if (tokensUsed !== undefined) queryParams.append('tokens_used', String(tokensUsed))
    if (processingTimeMs !== undefined) queryParams.append('processing_time_ms', String(processingTimeMs))
    return apiClient.post<{ success: boolean; message: string; timestamp: string }>(
      `/api/v1/assistants/${assistantId}/usage?${queryParams.toString()}`
    )
  },
  
  // Administrative endpoints
  getAvailableModels: () =>
    apiClient.get<ModelsResponse>("/api/v1/assistants/models/available"),
  
  getFeaturedAssistants: (limit = 10) =>
    apiClient.get<AssistantResponse[]>(`/api/v1/assistants/public/featured?limit=${limit}`),
  
  // Health check
  checkHealth: () =>
    apiClient.get<{ status: string; service: string; timestamp: string; version: string }>("/api/v1/assistants/health")
}

// People API types
export interface PersonRole {
  ADMIN: "ADMIN",
  USER: "USER",
  MANAGER: "MANAGER",
  VIEWER: "VIEWER"
}

export interface PersonStatus {
  active: "active",
  inactive: "inactive",
  pending: "pending"
}

export interface PersonCreateRequest {
  first_name: string
  last_name: string
  email: string
  phone?: string
  job_title?: string
  department?: string
  site?: string
  location?: string
  role: "admin" | "user" | "manager" | "viewer"
  manager_id?: string
  hire_date?: string
  notes?: string
}

export interface PersonUpdateRequest {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  job_title?: string
  department?: string
  site?: string
  location?: string
  role?: "admin" | "user" | "manager" | "viewer"
  status?: "active" | "inactive" | "pending"
  manager_id?: string
  hire_date?: string
  notes?: string
}

export interface PersonResponse {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  job_title?: string
  department?: string
  site?: string
  location?: string
  role: "admin" | "user" | "manager" | "viewer"
  status: "active" | "inactive" | "pending"
  full_name: string
  is_active: boolean
  manager_id?: string
  hire_date?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface PersonListResponse {
  people: PersonResponse[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export const organizationApi = {
  getProfile: () =>
    apiClient.get("/api/v1/organization/profile"),
  
  updateProfile: (data: any) =>
    apiClient.put("/api/v1/organization/profile", data),
  
  // People endpoints with proper types
  getPeople: (page: number = 1, pageSize: number = 20) =>
    apiClient.get<PersonListResponse>(`/api/v1/organization/people/?page=${page}&page_size=${pageSize}`),
  
  getPerson: (id: string) =>
    apiClient.get<PersonResponse>(`/api/v1/organization/people/${id}`),
  
  createPerson: (data: PersonCreateRequest) =>
    apiClient.post<PersonResponse>("/api/v1/organization/people/", data),
  
  updatePerson: (id: string, data: PersonUpdateRequest) =>
    apiClient.put<PersonResponse>(`/api/v1/organization/people/${id}`, data),
  
  deletePerson: (id: string) =>
    apiClient.delete(`/api/v1/organization/people/${id}`),
  
  getServices: () =>
    apiClient.get("/api/v1/organization/services"),
  
  getOrgChart: () =>
    apiClient.get("/api/v1/organization/org-chart"),
  
  getIsoCompliance: () =>
    apiClient.get("/api/v1/organization/iso"),
  
  getDocuments: () =>
    apiClient.get("/api/v1/organization/documents"),
}

// Settings API interfaces
export interface OpenAISettingsRequest {
  api_key: string
  model: string
  max_tokens?: number
  temperature?: number
}

export interface OpenAISettingsResponse {
  api_key: string // masked for security
  model: string
  max_tokens: number
  temperature: number
  created_at: string
  updated_at: string
}

export interface ConnectionTestResponse {
  success: boolean
  message: string
  model_info: {
    model: string
    max_tokens: number
    temperature: number
  } | null
  response_time_ms: number | null
}

// Settings API - uses backend OpenAI Settings API endpoints
const settingsApiClient = new ApiClient()

export const settingsApi = {
  // Get all user settings
  getSettings: () =>
    settingsApiClient.get<{ openai: OpenAISettingsResponse | null }>("/api/v1/openai-settings/settings"),
  
  // Get OpenAI settings specifically
  getOpenAISettings: () =>
    settingsApiClient.get<OpenAISettingsResponse>("/api/v1/openai-settings/settings/openai-key"),
  
  // Alternative endpoint for getting OpenAI settings
  getOpenAISettingsAlt: () =>
    settingsApiClient.get<OpenAISettingsResponse>("/api/v1/openai-settings/openai/settings"),
  
  // Update OpenAI settings (POST method)
  updateOpenAISettings: (data: OpenAISettingsRequest) =>
    settingsApiClient.post<{
      success: boolean
      message: string
      data: {
        model: string
        max_tokens: number
        temperature: number
        user_id: string
      }
    }>("/api/v1/openai-settings/settings/openai", data),
  
  // Update OpenAI settings (PUT method)  
  updateOpenAIKey: (data: OpenAISettingsRequest) =>
    settingsApiClient.put<{
      success: boolean
      message: string
      data: {
        model: string
        max_tokens: number
        temperature: number
        user_id: string
      }
    }>("/api/v1/openai-settings/settings/openai-key", data),
  
  // Alternative endpoint for setting OpenAI settings
  setOpenAISettings: (data: OpenAISettingsRequest) =>
    settingsApiClient.post<{
      success: boolean
      message: string
      data: {
        model: string
        max_tokens: number
        temperature: number
        user_id: string
      }
    }>("/api/v1/openai-settings/openai/settings", data),
  
  // Clear all OpenAI settings
  clearOpenAISettings: () =>
    settingsApiClient.delete<{
      success: boolean
      message: string
    }>("/api/v1/openai-settings/settings/openai"),
  
  // Test OpenAI connection with stored settings
  testOpenAIConnection: () =>
    settingsApiClient.post<ConnectionTestResponse>("/api/v1/openai-settings/settings/test-openai"),
}

// Chat API interfaces
export interface CreateChatRequest {
  title: string
  description?: string
  chat_type?: 'DIRECT' | 'GROUP' | 'CHANNEL'
  assistant_id?: string | null
  ai_model?: string
  ai_persona?: string
  system_prompt?: string
  temperature?: number
  max_tokens?: number
  is_private?: boolean
  tags?: string[]
}

export interface SendMessageRequest {
  content: string
  message_type?: 'USER' | 'AI' | 'SYSTEM'
  reply_to_id?: string
  message_metadata?: Record<string, any>
}

export interface ChatWithAIRequest {
  message: string
  stream?: boolean
  save_to_history?: boolean
  assistant_id?: string
}

export interface ChatWithAIResponse {
  success: boolean
  message: string
  streaming: boolean
  data: {
    user_message?: MessageResponse
    ai_response?: MessageResponse & {
      model_used: string
      processing_time_ms: number
      tokens_used: {
        input: number
        output: number
        total: number
      }
      finish_reason: string
    }
    chat_info: {
      chat_id: string
      total_messages: number
      total_tokens_used: number
    }
  }
  timestamp: string
}

export interface OpenAITestRequest {
  message: string
  model?: string
  temperature?: number
  system_prompt?: string
}

export interface OpenAITestResponse {
  success: boolean
  message?: string
  error?: string
  error_code?: string
  data?: {
    request: OpenAITestRequest
    response: {
      content: string
      model_used: string
      processing_time_ms: number
      tokens_used: {
        input: number
        output: number
        total: number
      }
      finish_reason: string
    }
    user_info: {
      user_id: string
      username: string
    }
    api_info: {
      integration_type: string
      messages_count: number
      has_system_prompt: boolean
      openai_response_id: string
    }
  }
  timestamp: string
}

export interface ChatResponse {
  id: string
  title: string
  description?: string
  chat_type: string
  assistant_id?: string | null
  assistant_name?: string | null
  ai_model?: string
  ai_persona?: string
  message_count: number
  last_activity_at: string
  created_at: string
  is_private: boolean
  tags?: string[]
}

export interface MessageResponse {
  id: string
  chat_id: string
  sender_id?: string
  content: string
  message_type: string
  ai_model_used?: string
  tokens_used?: number
  processing_time_ms?: number
  status: string
  created_at: string
  is_edited: boolean
}

export interface ChatHistoryResponse {
  chat: ChatResponse
  messages: MessageResponse[]
  participant_count: number
}

// WebSocket manager for real-time chat
export class ChatWebSocketManager {
  private connections: Map<string, WebSocket> = new Map()
  private reconnectAttempts: Map<string, number> = new Map()
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  
  private getWebSocketUrl(): string {
    if (typeof window !== 'undefined') {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      return apiUrl.replace('http', 'ws')
    }
    
    // Server-side WebSocket URL
    if (process.env.DOCKER_ENV === 'true') {
      return 'ws://api:8000'
    }
    
    return 'ws://localhost:8000'
  }
  
  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null
    
    // Try cookie first, then localStorage
    const cookieToken = this.getCookieToken()
    const storageToken = localStorage.getItem('auth_token')
    return cookieToken || storageToken
  }
  
  private getCookieToken(): string | null {
    if (typeof document === 'undefined') return null
    
    const value = `; ${document.cookie}`
    const parts = value.split(`; auth_token=`)
    if (parts.length === 2) {
      return decodeURIComponent(parts.pop()?.split(';').shift() || '')
    }
    return null
  }
  
  connect(chatId: string, onMessage: (data: any) => void, onError?: (error: Event) => void): WebSocket | null {
    // Check if WebSocket is available
    if (typeof window === 'undefined' || typeof window.WebSocket === 'undefined') {
      const wsError = new Error('WebSocket is not available in this environment')
      console.error('WebSocket connection failed:', wsError.message)
      if (onError) {
        onError(wsError as any)
      }
      return null
    }
    
    const token = this.getAuthToken()
    
    if (!token) {
      const authError = new Error('No authentication token found. Please log in again.')
      console.error('WebSocket connection failed:', authError.message)
      
      // Redirect to login if not already there
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        const currentPath = window.location.pathname
        localStorage.setItem('redirect_after_login', currentPath)
        window.location.href = '/login'
      }
      
      if (onError) {
        onError(authError as any)
      }
      return null
    }
    
    const baseWsUrl = this.getWebSocketUrl()
    const wsUrl = `${baseWsUrl}/api/v1/chat/chats/${chatId}/ws?token=${encodeURIComponent(token)}`
    
    console.log(`Attempting to connect to WebSocket: ${chatId}`)
    
    try {
      const ws = new window.WebSocket(wsUrl)
      
      ws.onopen = () => {
        console.log(`✅ Connected to chat ${chatId}`)
        this.reconnectAttempts.set(chatId, 0)
      }
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          onMessage(data)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error, event.data)
        }
      }
      
      ws.onclose = (event) => {
        console.log(`🔌 Disconnected from chat ${chatId} (Code: ${event.code}, Reason: ${event.reason})`)
        this.connections.delete(chatId)
        
        // Handle authentication errors (1008 = Policy Violation, often used for auth failures)
        if (event.code === 1008 || event.code === 4001) {
          console.error('WebSocket authentication failed')
          
          // Clear invalid tokens
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token')
            localStorage.removeItem('refresh_token')
            localStorage.removeItem('user_data')
            
            // Redirect to login
            if (!window.location.pathname.includes('/login')) {
              const currentPath = window.location.pathname
              localStorage.setItem('redirect_after_login', currentPath)
              window.location.href = '/login'
            }
          }
          return
        }
        
        // Attempt to reconnect for other close codes
        const attempts = this.reconnectAttempts.get(chatId) || 0
        if (attempts < this.maxReconnectAttempts && event.code !== 1000) { // Don't reconnect on normal closure
          this.reconnectAttempts.set(chatId, attempts + 1)
          const delay = this.reconnectDelay * Math.pow(2, attempts)
          
          console.log(`⏳ Reconnecting to chat ${chatId} in ${delay}ms (attempt ${attempts + 1}/${this.maxReconnectAttempts})`)
          
          setTimeout(() => {
            this.connect(chatId, onMessage, onError)
          }, delay)
        } else if (attempts >= this.maxReconnectAttempts) {
          console.error(`❌ Max reconnection attempts reached for chat ${chatId}`)
          const maxAttemptsError = new Error(`Failed to reconnect to chat after ${this.maxReconnectAttempts} attempts`)
          if (onError) onError(maxAttemptsError as any)
        }
      }
      
      ws.onerror = (error) => {
        console.error(`❌ WebSocket error for chat ${chatId}:`, error)
        if (onError) onError(error)
      }
      
      this.connections.set(chatId, ws)
      return ws
    } catch (error) {
      console.error(`Failed to create WebSocket connection for chat ${chatId}:`, error)
      if (onError) onError(error as any)
      return null
    }
  }
  
  disconnect(chatId: string) {
    const ws = this.connections.get(chatId)
    if (ws) {
      ws.close()
      this.connections.delete(chatId)
      this.reconnectAttempts.delete(chatId)
    }
  }
  
  sendMessage(chatId: string, message: any) {
    const ws = this.connections.get(chatId)
    if (ws && ws.readyState === (typeof window !== 'undefined' && window.WebSocket ? window.WebSocket.OPEN : 1)) {
      try {
        ws.send(JSON.stringify(message))
        console.log(`📤 Sent message to chat ${chatId}:`, message.type || 'message')
      } catch (error) {
        console.error(`Failed to send message to chat ${chatId}:`, error)
      }
    } else {
      console.warn(`Cannot send message to chat ${chatId}: WebSocket not connected (state: ${ws?.readyState})`)
    }
  }
  
  sendTypingIndicator(chatId: string, isTyping: boolean) {
    this.sendMessage(chatId, {
      type: 'typing',
      isTyping
    })
  }
  
  disconnectAll() {
    for (const [chatId] of this.connections) {
      this.disconnect(chatId)
    }
  }
}

// Create singleton WebSocket manager
export const chatWebSocketManager = new ChatWebSocketManager()

// Chat API methods
export const chatApi = {
  // Chat management
  createChat: (data: CreateChatRequest) => {
    console.log('API Client: Creating chat with data:', data)
    return apiClient.post<ChatResponse>("/api/v1/chat/chats", data)
  },
  
  getUserChats: (limit = 50, offset = 0) =>
    apiClient.get<ChatResponse[]>(`/api/v1/chat/chats?limit=${limit}&offset=${offset}`),
  
  getChatHistory: (chatId: string, limit = 100, offset = 0) =>
    apiClient.get<ChatHistoryResponse>(`/api/v1/chat/chats/${chatId}?limit=${limit}&offset=${offset}`),
  
  deleteChat: (chatId: string) =>
    apiClient.delete(`/api/v1/chat/chats/${chatId}`),
  
  // Messaging
  sendMessage: (chatId: string, data: SendMessageRequest) =>
    apiClient.post<MessageResponse>(`/api/v1/chat/chats/${chatId}/messages`, data),
  
  // AI Chat Integration
  chatWithAI: (chatId: string, data: ChatWithAIRequest) => {
    console.log(`API Client: Sending AI message to chat ${chatId}:`, data)
    console.log(`API Client: Data stringified:`, JSON.stringify(data))
    console.log(`API Client: Message content:`, {
      content: data.message,
      length: data.message?.length,
      type: typeof data.message
    })
    return apiClient.post<ChatWithAIResponse>(`/api/v1/chat/chats/${chatId}/ai-message`, data)
  },
  
  // OpenAI Direct Integration
  testOpenAIDirect: (data: OpenAITestRequest) =>
    apiClient.post<OpenAITestResponse>("/api/v1/chat/openai/test", data),
  
  // Chat participants and status
  getChatParticipants: (chatId: string) =>
    apiClient.get(`/api/v1/chat/chats/${chatId}/participants`),
  
  // Typing indicator
  sendTypingIndicator: (chatId: string) =>
    apiClient.post(`/api/v1/chat/chats/${chatId}/typing`),
  
  // System statistics and testing
  getChatStats: () =>
    apiClient.get("/api/v1/chat/stats"),
  
  testChatConnection: () =>
    apiClient.post("/api/v1/chat/test/connection"),
  
  getWebSocketTestUrl: (chatId: string) =>
    apiClient.get(`/api/v1/chat/websocket/test/${chatId}`),
  
  // Test chat system connectivity
  testConnection: () =>
    apiClient.post("/api/v1/chat/test/connection"),
  
  // WebSocket connections
  connectToChat: (chatId: string, onMessage: (data: any) => void, onError?: (error: Event) => void) => {
    const connection = chatWebSocketManager.connect(chatId, onMessage, onError)
    if (!connection) {
      throw new Error('Failed to establish WebSocket connection. Please check your authentication and try again.')
    }
    return connection
  },
  
  disconnectFromChat: (chatId: string) =>
    chatWebSocketManager.disconnect(chatId),
  
  sendTypingIndicator: (chatId: string, isTyping: boolean) =>
    chatWebSocketManager.sendTypingIndicator(chatId, isTyping),
  
  // Helper methods
  formatMessage: (message: MessageResponse) => ({
    ...message,
    timestamp: new Date(message.created_at),
    isAI: message.message_type === 'AI',
    isUser: message.message_type === 'USER'
  }),
  
  formatChat: (chat: ChatResponse) => ({
    ...chat,
    lastActivity: new Date(chat.last_activity_at),
    createdAt: new Date(chat.created_at)
  })
}

// Cleanup function for chat connections
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    chatWebSocketManager.disconnectAll()
  })
}

// Network status utilities
export const networkUtils = {
  isOnline: () => navigator.onLine,
  
  onNetworkChange: (callback: (isOnline: boolean) => void) => {
    const handleOnline = () => callback(true)
    const handleOffline = () => callback(false)
    
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  },
  
  async checkConnectivity(): Promise<boolean> {
    return apiClient.healthCheck()
  }
}