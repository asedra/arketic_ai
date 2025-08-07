import { useState, useEffect, useCallback } from 'react'
import { useNotifications } from './useNotifications'

interface AsyncDataState<T> {
  data: T | null
  loading: boolean
  error: string | null
  lastFetch: number | null
}

interface AsyncDataOptions<T> {
  immediate?: boolean
  cacheTime?: number
  staleTime?: number
  retry?: number
  retryDelay?: number
  onSuccess?: (data: T) => void
  onError?: (error: string) => void
  showErrorNotification?: boolean
}

export function useAsyncData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: AsyncDataOptions<T> = {}
) {
  const {
    immediate = true,
    cacheTime = 5 * 60 * 1000, // 5 minutes
    staleTime = 2 * 60 * 1000, // 2 minutes
    retry = 3,
    retryDelay = 1000,
    onSuccess,
    onError,
    showErrorNotification = true
  } = options
  
  const { showError } = useNotifications()
  
  const [state, setState] = useState<AsyncDataState<T>>({
    data: null,
    loading: false,
    error: null,
    lastFetch: null
  })
  
  const execute = useCallback(async (attempt = 1): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const data = await fetchFn()
      setState({
        data,
        loading: false,
        error: null,
        lastFetch: Date.now()
      })
      onSuccess?.(data)
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred'
      
      if (attempt < retry) {
        // Retry with exponential backoff
        setTimeout(() => {
          execute(attempt + 1)
        }, retryDelay * Math.pow(2, attempt - 1))
        return
      }
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))
      
      onError?.(errorMessage)
      
      if (showErrorNotification) {
        showError(`Failed to load ${key}: ${errorMessage}`)
      }
    }
  }, [fetchFn, key, retry, retryDelay, onSuccess, onError, showErrorNotification, showError])
  
  const refetch = useCallback(() => {
    execute()
  }, [execute])
  
  const isStale = useCallback(() => {
    if (!state.lastFetch) return true
    return Date.now() - state.lastFetch > staleTime
  }, [state.lastFetch, staleTime])
  
  const invalidate = useCallback(() => {
    setState(prev => ({ ...prev, lastFetch: null }))
  }, [])
  
  useEffect(() => {
    if (immediate) {
      execute()
    }
  }, [execute, immediate])
  
  // Auto-refetch when data becomes stale and component becomes visible
  useEffect(() => {
    if (!immediate || !state.data) return
    
    const handleVisibilityChange = () => {
      if (!document.hidden && isStale()) {
        refetch()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [immediate, state.data, isStale, refetch])
  
  return {
    ...state,
    execute,
    refetch,
    invalidate,
    isStale: isStale()
  }
}

// Hook for managing multiple async data sources
export function useAsyncDataMultiple<T extends Record<string, any>>(
  sources: {
    [K in keyof T]: {
      fetchFn: () => Promise<T[K]>
      options?: AsyncDataOptions<T[K]>
    }
  }
) {
  const [states, setStates] = useState<{
    [K in keyof T]: AsyncDataState<T[K]>
  }>(() => {
    const initialState = {} as any
    Object.keys(sources).forEach(key => {
      initialState[key] = {
        data: null,
        loading: false,
        error: null,
        lastFetch: null
      }
    })
    return initialState
  })
  
  const execute = useCallback(async (key: keyof T) => {
    const source = sources[key]
    if (!source) return
    
    setStates(prev => ({
      ...prev,
      [key]: { ...prev[key], loading: true, error: null }
    }))
    
    try {
      const data = await source.fetchFn()
      setStates(prev => ({
        ...prev,
        [key]: {
          data,
          loading: false,
          error: null,
          lastFetch: Date.now()
        }
      }))
      source.options?.onSuccess?.(data)
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred'
      setStates(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          loading: false,
          error: errorMessage
        }
      }))
      source.options?.onError?.(errorMessage)
    }
  }, [sources])
  
  const executeAll = useCallback(async () => {
    const promises = Object.keys(sources).map(key => execute(key as keyof T))
    await Promise.allSettled(promises)
  }, [sources, execute])
  
  useEffect(() => {
    executeAll()
  }, [executeAll])
  
  return {
    states,
    execute,
    executeAll,
    isLoading: Object.values(states).some((state: any) => state.loading),
    hasError: Object.values(states).some((state: any) => state.error)
  }
}
