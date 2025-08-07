/**
 * Web Vitals monitoring and optimization for Arketic
 */

import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

// Web Vitals tracking
export function trackWebVitals() {
  if (typeof window === 'undefined') return

  // Cumulative Layout Shift (CLS) - should be < 0.1
  getCLS((metric) => {
    console.log('CLS:', metric)
    sendToAnalytics('CLS', metric)
  })

  // First Input Delay (FID) - should be < 100ms
  getFID((metric) => {
    console.log('FID:', metric)
    sendToAnalytics('FID', metric)
  })

  // First Contentful Paint (FCP) - should be < 1.8s
  getFCP((metric) => {
    console.log('FCP:', metric)
    sendToAnalytics('FCP', metric)
  })

  // Largest Contentful Paint (LCP) - should be < 2.5s
  getLCP((metric) => {
    console.log('LCP:', metric)
    sendToAnalytics('LCP', metric)
  })

  // Time to First Byte (TTFB) - should be < 0.8s
  getTTFB((metric) => {
    console.log('TTFB:', metric)
    sendToAnalytics('TTFB', metric)
  })
}

function sendToAnalytics(metricName: string, metric: any) {
  // Send to Google Analytics
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', metricName, {
      value: Math.round(metricName === 'CLS' ? metric.value * 1000 : metric.value),
      event_category: 'Web Vitals',
      event_label: metricName,
      non_interaction: true
    })
  }

  // Send to custom analytics endpoint
  if (process.env.NODE_ENV === 'production') {
    fetch('/api/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        metric: metricName,
        value: metric.value,
        id: metric.id,
        delta: metric.delta,
        rating: metric.rating,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      })
    }).catch(console.error)
  }
}

// Performance observer for custom metrics
export class PerformanceMonitor {
  private observers: PerformanceObserver[] = []

  constructor() {
    this.initObservers()
  }

  private initObservers() {
    if (typeof window === 'undefined') return

    // Monitor long tasks (> 50ms)
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            console.warn('Long task detected:', entry.duration, 'ms')
            if (entry.duration > 100) {
              this.reportLongTask(entry as PerformanceEntry)
            }
          })
        })
        longTaskObserver.observe({ type: 'longtask', buffered: true })
        this.observers.push(longTaskObserver)
      } catch (e) {
        console.warn('Long task observer not supported')
      }

      // Monitor layout shifts
      try {
        const layoutShiftObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: any) => {
            if (entry.hadRecentInput) return // Ignore user-initiated shifts
            
            console.log('Layout shift:', entry.value)
            if (entry.value > 0.1) {
              this.reportLayoutShift(entry)
            }
          })
        })
        layoutShiftObserver.observe({ type: 'layout-shift', buffered: true })
        this.observers.push(layoutShiftObserver)
      } catch (e) {
        console.warn('Layout shift observer not supported')
      }

      // Monitor resource loading
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.duration > 1000) { // Resources taking > 1s
              console.warn('Slow resource:', entry.name, entry.duration, 'ms')
              this.reportSlowResource(entry)
            }
          })
        })
        resourceObserver.observe({ type: 'resource', buffered: true })
        this.observers.push(resourceObserver)
      } catch (e) {
        console.warn('Resource observer not supported')
      }
    }
  }

  private reportLongTask(entry: PerformanceEntry) {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'long_task', {
        value: Math.round(entry.duration),
        event_category: 'Performance',
        event_label: 'Long Task',
        custom_map: { metric1: 'duration' }
      })
    }
  }

  private reportLayoutShift(entry: any) {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'layout_shift', {
        value: Math.round(entry.value * 1000),
        event_category: 'Performance',
        event_label: 'Layout Shift'
      })
    }
  }

  private reportSlowResource(entry: PerformanceEntry) {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'slow_resource', {
        value: Math.round(entry.duration),
        event_category: 'Performance',
        event_label: entry.name
      })
    }
  }

  destroy() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
  }
}

import { useEffect } from 'react'

// React hook for performance monitoring
export function usePerformanceMonitor() {
  useEffect(() => {
    const monitor = new PerformanceMonitor()
    trackWebVitals()

    return () => {
      monitor.destroy()
    }
  }, [])
}

// Utility functions for performance optimization
export function preloadResource(href: string, as: string = 'script') {
  if (typeof window === 'undefined') return

  const link = document.createElement('link')
  link.rel = 'preload'
  link.href = href
  link.as = as
  document.head.appendChild(link)
}

export function prefetchResource(href: string) {
  if (typeof window === 'undefined') return

  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.href = href
  document.head.appendChild(link)
}

// Critical resource hints
export function addResourceHints() {
  if (typeof window === 'undefined') return

  // Preconnect to external domains
  const preconnectDomains = [
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com'
  ]

  preconnectDomains.forEach(domain => {
    const link = document.createElement('link')
    link.rel = 'preconnect'
    link.href = domain
    document.head.appendChild(link)
  })

  // DNS prefetch for third-party domains
  const dnsPrefetchDomains = [
    'https://www.google-analytics.com',
    'https://cdn.jsdelivr.net'
  ]

  dnsPrefetchDomains.forEach(domain => {
    const link = document.createElement('link')
    link.rel = 'dns-prefetch'
    link.href = domain
    document.head.appendChild(link)
  })
}

import React, { useEffect, useRef } from 'react'

// Component for measuring render time
export function withRenderTimer<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return function TimedComponent(props: P) {
    const startTime = useRef(performance.now())
    
    useEffect(() => {
      const endTime = performance.now()
      const renderTime = endTime - startTime.current
      
      console.log(`${componentName} render time: ${renderTime.toFixed(2)}ms`)
      
      if (renderTime > 16) { // > 1 frame at 60fps
        console.warn(`${componentName} took longer than 16ms to render`)
        
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'slow_component', {
            value: Math.round(renderTime),
            event_category: 'Performance',
            event_label: componentName
          })
        }
      }
    })
    
    return React.createElement(Component, props)
  }
}