/**
 * Frontend caching strategies for Arketic
 */

interface CacheConfig {
  ttl: number // Time to live in milliseconds
  maxSize: number // Maximum number of items in cache
}

class CacheManager {
  private cache = new Map<string, { data: any; timestamp: number; hits: number }>()
  private config: CacheConfig

  constructor(config: CacheConfig = { ttl: 5 * 60 * 1000, maxSize: 100 }) {
    this.config = config
  }

  set(key: string, data: any): void {
    // Remove oldest items if cache is full
    if (this.cache.size >= this.config.maxSize) {
      const oldestKey = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0]
      this.cache.delete(oldestKey)
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0
    })
  }

  get(key: string): any | null {
    const item = this.cache.get(key)
    
    if (!item) {
      return null
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > this.config.ttl) {
      this.cache.delete(key)
      return null
    }

    // Increment hit counter
    item.hits++
    return item.data
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      items: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        hits: value.hits,
        age: Date.now() - value.timestamp
      }))
    }
  }
}

// Create cache instances for different data types
export const peopleCache = new CacheManager({ ttl: 10 * 60 * 1000, maxSize: 50 }) // 10 minutes
export const orgCache = new CacheManager({ ttl: 30 * 60 * 1000, maxSize: 20 }) // 30 minutes
export const complianceCache = new CacheManager({ ttl: 5 * 60 * 1000, maxSize: 100 }) // 5 minutes
export const imageCache = new CacheManager({ ttl: 60 * 60 * 1000, maxSize: 200 }) // 1 hour

// Utility functions for common caching patterns
export function createCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|')
  return `${prefix}:${sortedParams}`
}

export function withCache<T>(
  cache: CacheManager,
  key: string,
  fetcher: () => Promise<T> | T
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    try {
      // Try to get from cache first
      const cached = cache.get(key)
      if (cached !== null) {
        resolve(cached)
        return
      }

      // Fetch data if not in cache
      const data = await fetcher()
      cache.set(key, data)
      resolve(data)
    } catch (error) {
      reject(error)
    }
  })
}

// React hook for cached data fetching
import { useState, useEffect, useCallback } from 'react'

export function useCachedData<T>(
  cache: CacheManager,
  key: string,
  fetcher: () => Promise<T> | T,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const result = await withCache(cache, key, fetcher)
        
        if (!cancelled) {
          setData(result)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Unknown error'))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      cancelled = true
    }
  }, [cache, key, ...dependencies])

  const invalidate = useCallback(() => {
    cache.delete(key)
  }, [cache, key])

  return { data, loading, error, invalidate }
}

// Local storage cache for persistence
export class PersistentCache extends CacheManager {
  private storageKey: string

  constructor(storageKey: string, config?: CacheConfig) {
    super(config)
    this.storageKey = storageKey
    this.loadFromStorage()
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const data = JSON.parse(stored)
        Object.entries(data).forEach(([key, value]) => {
          this.cache.set(key, value as any)
        })
      }
    } catch (error) {
      console.warn('Failed to load cache from storage:', error)
    }
  }

  private saveToStorage(): void {
    try {
      const data = Object.fromEntries(this.cache.entries())
      localStorage.setItem(this.storageKey, JSON.stringify(data))
    } catch (error) {
      console.warn('Failed to save cache to storage:', error)
    }
  }

  set(key: string, data: any): void {
    super.set(key, data)
    this.saveToStorage()
  }

  delete(key: string): void {
    super.delete(key)
    this.saveToStorage()
  }

  clear(): void {
    super.clear()
    localStorage.removeItem(this.storageKey)
  }
}

// Service Worker cache integration
export function registerSWCache() {
  if ('serviceWorker' in navigator && 'caches' in window) {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration)
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error)
      })
  }
}