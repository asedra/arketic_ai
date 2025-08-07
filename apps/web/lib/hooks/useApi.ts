import { useState, useEffect, useCallback } from 'react'
import { apiClient, type ApiResponse } from '../api-client'
import { useArketicStore } from '../state-manager'

interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

interface UseApiOptions {
  immediate?: boolean
  retries?: number
  onSuccess?: (data: any) => void
  onError?: (error: string) => void
}

export function useApi<T = any>(
  endpoint: string,
  options: UseApiOptions = {}
) {
  const { immediate = true, retries = 3, onSuccess, onError } = options
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null
  })
  
  const setLoading = useArketicStore(state => state.setLoading)
  
  const execute = useCallback(async (requestOptions?: any) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    setLoading(endpoint, true)
    
    try {
      const response: ApiResponse<T> = await apiClient.get(endpoint, {
        retries,
        ...requestOptions
      })
      
      if (response.success) {
        setState({
          data: response.data,
          loading: false,
          error: null
        })
        onSuccess?.(response.data)
      } else {
        const errorMessage = response.message || 'Request failed'
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage
        }))
        onError?.(errorMessage)
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Network error occurred'
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))
      onError?.(errorMessage)
    } finally {
      setLoading(endpoint, false)
    }
  }, [endpoint, retries, onSuccess, onError, setLoading])
  
  const refetch = useCallback(() => execute(), [execute])
  
  useEffect(() => {
    if (immediate) {
      execute()
    }
  }, [execute, immediate])
  
  return {
    ...state,
    execute,
    refetch
  }
}

export function useApiMutation<T = any, TVariables = any>(
  endpoint: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST'
) {
  const [state, setState] = useState<UseApiState<T> & { isIdle: boolean }>({
    data: null,
    loading: false,
    error: null,
    isIdle: true
  })
  
  const setLoading = useArketicStore(state => state.setLoading)
  
  const mutate = useCallback(async (variables?: TVariables, options?: any) => {
    setState(prev => ({ ...prev, loading: true, error: null, isIdle: false }))
    setLoading(`${method}:${endpoint}`, true)
    
    try {
      let response: ApiResponse<T>
      
      switch (method) {
        case 'POST':
          response = await apiClient.post(endpoint, variables, options)
          break
        case 'PUT':
          response = await apiClient.put(endpoint, variables, options)
          break
        case 'PATCH':
          response = await apiClient.patch(endpoint, variables, options)
          break
        case 'DELETE':
          response = await apiClient.delete(endpoint, options)
          break
        default:
          throw new Error(`Unsupported method: ${method}`)
      }
      
      if (response.success) {
        setState({
          data: response.data,
          loading: false,
          error: null,
          isIdle: false
        })
        return response.data
      } else {
        const errorMessage = response.message || 'Mutation failed'
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
          isIdle: false
        }))
        throw new Error(errorMessage)
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Network error occurred'
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        isIdle: false
      }))
      throw error
    } finally {
      setLoading(`${method}:${endpoint}`, false)
    }
  }, [endpoint, method, setLoading])
  
  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      isIdle: true
    })
  }, [])
  
  return {
    ...state,
    mutate,
    reset
  }
}

// Specialized hooks for common API operations
export const useUsers = (options?: UseApiOptions) => {
  return useApi('/organization/people', options)
}

export const useKnowledgeItems = (search?: string, options?: UseApiOptions) => {
  return useApi(`/knowledge/items${search ? `?search=${encodeURIComponent(search)}` : ''}`, options)
}

export const useComplianceData = (options?: UseApiOptions) => {
  return useApi('/organization/iso-compliance', options)
}

export const useCreateUser = () => {
  return useApiMutation('/organization/people', 'POST')
}

export const useUpdateUser = () => {
  return useApiMutation('/organization/people', 'PUT')
}

export const useDeleteUser = () => {
  return useApiMutation('/organization/people', 'DELETE')
}
