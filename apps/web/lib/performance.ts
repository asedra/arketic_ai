// Performance monitoring and optimization utilities
import { useCallback, useEffect, useRef, useState } from 'react'

// Performance monitoring hook
export function usePerformanceMonitor(componentName: string) {
  const mountTime = useRef<number>(Date.now())
  const renderCount = useRef<number>(0)
  
  useEffect(() => {
    renderCount.current += 1
    
    // Monitor component lifecycle
    const loadTime = Date.now() - mountTime.current
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${componentName}:`, {
        mountTime: loadTime,
        renderCount: renderCount.current
      })
    }
    
    // Report to web vitals if available
    if (typeof window !== 'undefined' && 'webVitals' in window) {
      ;(window as any).webVitals?.reportPerformanceMetric({
        name: `component_${componentName.toLowerCase().replace(/\s+/g, '_')}_load`,
        value: loadTime,
        label: 'component_performance'
      })
    }
  })

  return { renderCount: renderCount.current }
}

// Debounced callback hook for performance
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>()
  
  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args)
    }, delay)
  }, [callback, delay]) as T
}

// Intersection observer hook for lazy loading
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [hasIntersected, setHasIntersected] = useState(false)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting)
      if (entry.isIntersecting && !hasIntersected) {
        setHasIntersected(true)
      }
    }, options)

    observer.observe(element)

    return () => observer.disconnect()
  }, [elementRef, options, hasIntersected])

  return { isIntersecting, hasIntersected }
}

// Virtualization helper for large lists
export function useVirtualization<T>(
  items: T[],
  containerHeight: number,
  itemHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0)
  
  const visibleItemsCount = Math.ceil(containerHeight / itemHeight)
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(items.length - 1, startIndex + visibleItemsCount + overscan * 2)
  
  const visibleItems = items.slice(startIndex, endIndex + 1)
  const offsetY = startIndex * itemHeight
  const totalHeight = items.length * itemHeight

  return {
    visibleItems,
    startIndex,
    endIndex,
    offsetY,
    totalHeight,
    setScrollTop
  }
}

// Cache hook for expensive computations
export function useCache<T>(
  factory: () => T,
  deps: React.DependencyList
): T {
  const cache = useRef<{ deps: React.DependencyList; value: T } | null>(null)
  
  if (!cache.current || !areDepsMemo(cache.current.deps, deps)) {
    cache.current = {
      deps: [...deps],
      value: factory()
    }
  }
  
  return cache.current.value
}

function areDepsMemo(oldDeps: React.DependencyList, newDeps: React.DependencyList): boolean {
  if (oldDeps.length !== newDeps.length) return false
  return oldDeps.every((dep, i) => Object.is(dep, newDeps[i]))
}

// Error boundary hook
export function useErrorBoundary() {
  const [error, setError] = useState<Error | null>(null)
  
  const resetError = useCallback(() => {
    setError(null)
  }, [])
  
  const captureError = useCallback((error: Error) => {
    setError(error)
  }, [])
  
  useEffect(() => {
    if (error) {
      console.error('Component Error:', error)
    }
  }, [error])
  
  return { error, resetError, captureError }
}

// Bundle size analyzer (dev only)
export function reportBundleSize(componentName: string) {
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    // Simple bundle size estimation
    const scripts = Array.from(document.scripts)
    const totalSize = scripts.reduce((sum, script) => {
      return sum + (script.src ? 1 : script.innerHTML.length)
    }, 0)
    
    console.log(`[Bundle] ${componentName} - Estimated bundle impact:`, totalSize)
  }
}