import { useMemo, useCallback, useRef, useEffect, useState } from 'react'

/**
 * Performance optimization hooks for Arketic frontend
 */

// Debounce hook for search inputs
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Throttle hook for scroll events
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const throttleRef = useRef<number | null>(null)
  const lastArgsRef = useRef<Parameters<T>>()

  return useCallback(
    ((...args: Parameters<T>) => {
      lastArgsRef.current = args

      if (throttleRef.current === null) {
        throttleRef.current = setTimeout(() => {
          if (lastArgsRef.current) {
            callback(...lastArgsRef.current)
          }
          throttleRef.current = null
        }, delay)
      }
    }) as T,
    [callback, delay]
  )
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting)
      },
      options
    )

    observer.observe(element)

    return () => {
      observer.unobserve(element)
    }
  }, [options])

  return isIntersecting
}

// Memoized filter hook for large datasets
export function useMemoizedFilter<T>(
  data: T[],
  filterFn: (item: T) => boolean,
  dependencies: any[]
): T[] {
  return useMemo(() => {
    return data.filter(filterFn)
  }, [data, ...dependencies])
}

// Virtual list hook for large datasets
export function useVirtualList<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) {
  const [scrollTop, setScrollTop] = useState(0)

  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight)
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    )

    return {
      startIndex,
      endIndex,
      items: items.slice(startIndex, endIndex),
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight
    }
  }, [items, itemHeight, containerHeight, scrollTop])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  return {
    ...visibleItems,
    handleScroll
  }
}