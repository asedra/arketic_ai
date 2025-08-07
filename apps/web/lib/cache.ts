// Advanced caching utilities for API calls and computed values
import { useCallback, useEffect, useRef, useState } from 'react'

// Memory cache with TTL support
class MemoryCache {
  private cache = new Map<string, { value: any; expires: number }>()
  private defaultTTL: number

  constructor(defaultTTL = 5 * 60 * 1000) { // 5 minutes default
    this.defaultTTL = defaultTTL
  }

  set(key: string, value: any, ttl?: number): void {
    const expires = Date.now() + (ttl || this.defaultTTL)
    this.cache.set(key, { value, expires })
  }

  get(key: string): any | null {
    const item = this.cache.get(key)
    if (!item) return null

    if (Date.now() > item.expires) {
      this.cache.delete(key)
      return null
    }

    return item.value
  }

  has(key: string): boolean {
    const item = this.cache.get(key)
    if (!item) return false

    if (Date.now() > item.expires) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key)
      }
    }
  }
}

// Global cache instance
export const globalCache = new MemoryCache()

// Auto cleanup every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => globalCache.cleanup(), 5 * 60 * 1000)
}

// Hook for cached API calls
export function useCachedAPI<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttl?: number
    enabled?: boolean
    onError?: (error: Error) => void
  } = {}
) {
  const { ttl, enabled = true, onError } = options
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const fetcherRef = useRef(fetcher)

  // Update fetcher ref when it changes
  useEffect(() => {
    fetcherRef.current = fetcher
  }, [fetcher])

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled) return

    // Check cache first unless forcing refresh
    if (!forceRefresh && globalCache.has(key)) {
      const cachedData = globalCache.get(key)
      setData(cachedData)
      return cachedData
    }

    setLoading(true)
    setError(null)

    try {
      const result = await fetcherRef.current()
      globalCache.set(key, result, ttl)
      setData(result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      onError?.(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [key, enabled, ttl, onError])

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchData()
    }
  }, [fetchData, enabled])

  const invalidate = useCallback(() => {
    globalCache.delete(key)
  }, [key])

  const refresh = useCallback(() => {
    return fetchData(true)
  }, [fetchData])

  return {
    data,
    loading,
    error,
    refresh,
    invalidate,
    isStale: !globalCache.has(key)
  }
}

// Hook for caching computed values
export function useCachedComputation<T>(
  key: string,
  computeFn: () => T,
  deps: React.DependencyList,
  ttl?: number
): T {
  const depsRef = useRef<React.DependencyList>([])
  const computeFnRef = useRef(computeFn)

  // Update refs
  useEffect(() => {
    computeFnRef.current = computeFn
  }, [computeFn])

  // Check if dependencies changed
  const depsChanged = deps.length !== depsRef.current.length || 
    deps.some((dep, i) => !Object.is(dep, depsRef.current[i]))

  if (depsChanged || !globalCache.has(key)) {
    const result = computeFnRef.current()
    globalCache.set(key, result, ttl)
    depsRef.current = deps
    return result
  }

  return globalCache.get(key)
}

// Batch cache operations
export function useBatchCache() {
  const set = useCallback((entries: Array<{ key: string; value: any; ttl?: number }>) => {
    entries.forEach(({ key, value, ttl }) => {
      globalCache.set(key, value, ttl)
    })
  }, [])

  const get = useCallback((keys: string[]) => {
    return keys.map(key => ({
      key,
      value: globalCache.get(key),
      exists: globalCache.has(key)
    }))
  }, [])

  const invalidate = useCallback((keys: string[]) => {
    keys.forEach(key => globalCache.delete(key))
  }, [])

  return { set, get, invalidate }
}

// Cache statistics for monitoring
export function useCacheStats() {
  const [stats, setStats] = useState({
    size: 0,
    hitRate: 0,
    missRate: 0
  })

  useEffect(() => {
    const updateStats = () => {
      setStats({
        size: globalCache.size(),
        hitRate: 0, // Would need to track hits/misses
        missRate: 0
      })
    }

    const interval = setInterval(updateStats, 1000)
    updateStats()

    return () => clearInterval(interval)
  }, [])

  return stats
}

// Preload cache with data
export function preloadCache(entries: Array<{ key: string; value: any; ttl?: number }>) {
  entries.forEach(({ key, value, ttl }) => {
    globalCache.set(key, value, ttl)
  })
}

// Cache key generators for consistency
export const cacheKeys = {
  people: (filters?: Record<string, any>) => 
    `people:${filters ? JSON.stringify(filters) : 'all'}`,
  
  compliance: (documentId?: string) => 
    documentId ? `compliance:${documentId}` : 'compliance:all',
  
  orgChart: (nodeId?: string) => 
    nodeId ? `org-chart:${nodeId}` : 'org-chart:root',
  
  isoData: (standard?: string) => 
    `iso:${standard || 'all'}`,
  
  documents: (category?: string) => 
    `documents:${category || 'all'}`,
  
  services: (siteId?: string) => 
    `services:${siteId || 'all'}`
}

// Export for debugging in development
if (process.env.NODE_ENV === 'development') {
  ;(window as any).__arketicCache = globalCache
}