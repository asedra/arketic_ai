"use client"

import { useEffect, useState, memo } from "react"
import { Activity, Clock, Zap, Database } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { useCacheStats } from "@/lib/cache"

interface PerformanceMetrics {
  fps: number
  memoryUsage: number
  loadTime: number
  bundleSize: number
  cacheHitRate: number
  renderCount: number
}

// Performance metrics collector
class PerformanceCollector {
  private metrics: PerformanceMetrics = {
    fps: 0,
    memoryUsage: 0,
    loadTime: 0,
    bundleSize: 0,
    cacheHitRate: 0,
    renderCount: 0
  }
  
  private fpsCounter = 0
  private lastTime = performance.now()
  private renderCounts = new Map<string, number>()

  startFPSMonitoring() {
    const loop = () => {
      this.fpsCounter++
      const currentTime = performance.now()
      
      if (currentTime - this.lastTime >= 1000) {
        this.metrics.fps = this.fpsCounter
        this.fpsCounter = 0
        this.lastTime = currentTime
      }
      
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  }

  getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return Math.round(memory.usedJSHeapSize / 1024 / 1024)
    }
    return 0
  }

  recordRender(componentName: string) {
    const current = this.renderCounts.get(componentName) || 0
    this.renderCounts.set(componentName, current + 1)
    this.metrics.renderCount = Array.from(this.renderCounts.values()).reduce((a, b) => a + b, 0)
  }

  getMetrics(): PerformanceMetrics {
    this.metrics.memoryUsage = this.getMemoryUsage()
    this.metrics.loadTime = performance.now()
    return { ...this.metrics }
  }

  getRenderCounts(): Map<string, number> {
    return new Map(this.renderCounts)
  }
}

const performanceCollector = new PerformanceCollector()

// Performance metrics hook
export function usePerformanceMetrics() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    memoryUsage: 0,
    loadTime: 0,
    bundleSize: 0,
    cacheHitRate: 0,
    renderCount: 0
  })
  
  const cacheStats = useCacheStats()

  useEffect(() => {
    performanceCollector.startFPSMonitoring()
    
    const interval = setInterval(() => {
      const newMetrics = performanceCollector.getMetrics()
      setMetrics(prev => ({
        ...newMetrics,
        cacheHitRate: cacheStats.hitRate
      }))
    }, 1000)

    return () => clearInterval(interval)
  }, [cacheStats.hitRate])

  return metrics
}

// Performance monitor component (only shown in development)
export const PerformanceMonitor = memo(function PerformanceMonitor() {
  const metrics = usePerformanceMetrics()
  const [isVisible, setIsVisible] = useState(false)
  const [renderCounts, setRenderCounts] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    const interval = setInterval(() => {
      setRenderCounts(performanceCollector.getRenderCounts())
    }, 2000)
    
    return () => clearInterval(interval)
  }, [])

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  // Keyboard shortcut to toggle visibility
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setIsVisible(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg"
          title="Show Performance Monitor (Ctrl+Shift+P)"
        >
          <Activity className="h-4 w-4" />
        </button>
      </div>
    )
  }

  const getFPSColor = (fps: number) => {
    if (fps >= 55) return "text-green-600"
    if (fps >= 30) return "text-yellow-600"
    return "text-red-600"
  }

  const getMemoryColor = (memory: number) => {
    if (memory < 50) return "text-green-600"
    if (memory < 100) return "text-yellow-600"
    return "text-red-600"
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <Card className="shadow-xl border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Performance Monitor
            </CardTitle>
            <button
              onClick={() => setIsVisible(false)}
              className="text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Core Web Vitals */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className={`text-lg font-bold ${getFPSColor(metrics.fps)}`}>
                {metrics.fps}
              </div>
              <div className="text-xs text-slate-500">FPS</div>
            </div>
            
            <div className="text-center">
              <div className={`text-lg font-bold ${getMemoryColor(metrics.memoryUsage)}`}>
                {metrics.memoryUsage}MB
              </div>
              <div className="text-xs text-slate-500">Memory</div>
            </div>
          </div>

          {/* Additional metrics */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">Load Time:</span>
              <span className="font-mono">{Math.round(metrics.loadTime)}ms</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-slate-600">Cache Size:</span>
              <span className="font-mono">{metrics.cacheHitRate}%</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-slate-600">Total Renders:</span>
              <span className="font-mono">{metrics.renderCount}</span>
            </div>
          </div>

          {/* Component render counts */}
          {renderCounts.size > 0 && (
            <div className="border-t pt-3">
              <div className="text-xs font-semibold text-slate-600 mb-2">
                Component Renders
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {Array.from(renderCounts.entries())
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5)
                  .map(([component, count]) => (
                    <div key={component} className="flex justify-between text-xs">
                      <span className="text-slate-600 truncate" title={component}>
                        {component}
                      </span>
                      <Badge variant="outline" className="text-xs h-4">
                        {count}
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Performance tips */}
          <div className="border-t pt-3">
            <div className="text-xs text-slate-500">
              Press Ctrl+Shift+P to toggle
            </div>
            {metrics.fps < 30 && (
              <div className="text-xs text-red-600 mt-1">
                ⚠️ Low FPS detected - check for heavy renders
              </div>
            )}
            {metrics.memoryUsage > 100 && (
              <div className="text-xs text-red-600 mt-1">
                ⚠️ High memory usage - check for memory leaks
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

// Hook to report component performance
export function useComponentPerformance(componentName: string) {
  useEffect(() => {
    performanceCollector.recordRender(componentName)
  })

  return {
    mark: (label: string) => {
      if (process.env.NODE_ENV === 'development') {
        performance.mark(`${componentName}-${label}`)
      }
    },
    measure: (name: string, startMark: string, endMark: string) => {
      if (process.env.NODE_ENV === 'development') {
        performance.measure(name, `${componentName}-${startMark}`, `${componentName}-${endMark}`)
      }
    }
  }
}

// Export the global performance collector for manual usage
export { performanceCollector }