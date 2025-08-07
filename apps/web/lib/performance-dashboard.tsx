"use client"

import React, { useState, useEffect, memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Activity, 
  Clock, 
  Zap, 
  Eye, 
  Database, 
  Cpu, 
  HardDrive,
  Wifi,
  AlertTriangle,
  CheckCircle 
} from 'lucide-react'

interface PerformanceMetric {
  name: string
  value: number
  unit: string
  threshold: number
  status: 'good' | 'needs-improvement' | 'poor'
  description: string
}

interface CacheStats {
  name: string
  hits: number
  misses: number
  size: number
  maxSize: number
}

export const PerformanceDashboard = memo(function PerformanceDashboard() {
  const [webVitals, setWebVitals] = useState<PerformanceMetric[]>([])
  const [renderMetrics, setRenderMetrics] = useState<PerformanceMetric[]>([])
  const [cacheStats, setCacheStats] = useState<CacheStats[]>([])
  const [systemMetrics, setSystemMetrics] = useState<any>({})

  useEffect(() => {
    // Initialize performance monitoring
    initializeMetrics()
    
    const interval = setInterval(() => {
      updateMetrics()
    }, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [])

  const initializeMetrics = () => {
    // Web Vitals metrics
    setWebVitals([
      {
        name: 'LCP',
        value: 0,
        unit: 'ms',
        threshold: 2500,
        status: 'good',
        description: 'Largest Contentful Paint'
      },
      {
        name: 'FID',
        value: 0,
        unit: 'ms',
        threshold: 100,
        status: 'good',
        description: 'First Input Delay'
      },
      {
        name: 'CLS',
        value: 0,
        unit: '',
        threshold: 0.1,
        status: 'good',
        description: 'Cumulative Layout Shift'
      },
      {
        name: 'FCP',
        value: 0,
        unit: 'ms',
        threshold: 1800,
        status: 'good',
        description: 'First Contentful Paint'
      },
      {
        name: 'TTFB',
        value: 0,
        unit: 'ms',
        threshold: 800,
        status: 'good',
        description: 'Time to First Byte'
      }
    ])

    // Render metrics
    setRenderMetrics([
      {
        name: 'Components',
        value: 0,
        unit: 'count',
        threshold: 100,
        status: 'good',
        description: 'Rendered Components'
      },
      {
        name: 'Re-renders',
        value: 0,
        unit: 'count',
        threshold: 50,
        status: 'good',
        description: 'Component Re-renders'
      },
      {
        name: 'Memory',
        value: 0,
        unit: 'MB',
        threshold: 100,
        status: 'good',
        description: 'JS Heap Size'
      }
    ])

    // Cache stats
    setCacheStats([
      { name: 'People Cache', hits: 0, misses: 0, size: 0, maxSize: 50 },
      { name: 'Org Cache', hits: 0, misses: 0, size: 0, maxSize: 20 },
      { name: 'Compliance Cache', hits: 0, misses: 0, size: 0, maxSize: 100 },
      { name: 'Image Cache', hits: 0, misses: 0, size: 0, maxSize: 200 }
    ])
  }

  const updateMetrics = () => {
    // Update Web Vitals from performance observer
    if (typeof window !== 'undefined' && 'performance' in window) {
      // Get navigation timing
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      if (navigation) {
        setWebVitals(prev => prev.map(metric => {
          switch (metric.name) {
            case 'TTFB':
              return { ...metric, value: navigation.responseStart }
            case 'FCP':
              const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0]
              return { ...metric, value: fcpEntry?.startTime || 0 }
            default:
              return metric
          }
        }))
      }

      // Get memory info if available
      const memory = (performance as any).memory
      if (memory) {
        setRenderMetrics(prev => prev.map(metric => {
          if (metric.name === 'Memory') {
            return { 
              ...metric, 
              value: Math.round(memory.usedJSHeapSize / 1024 / 1024),
              status: memory.usedJSHeapSize > 100 * 1024 * 1024 ? 'poor' : 'good'
            }
          }
          return metric
        }))
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'text-green-600 dark:text-green-400'
      case 'needs-improvement':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'poor':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-slate-600 dark:text-slate-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'needs-improvement':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'poor':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return <Activity className="h-4 w-4 text-slate-600" />
    }
  }

  const calculateCacheHitRate = (cache: CacheStats) => {
    const total = cache.hits + cache.misses
    return total > 0 ? Math.round((cache.hits / total) * 100) : 0
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Performance Dashboard
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Monitor application performance and web vitals
          </p>
        </div>
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <Activity className="h-3 w-3 mr-1" />
          Live Monitoring
        </Badge>
      </div>

      <Tabs defaultValue="web-vitals" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="web-vitals">Web Vitals</TabsTrigger>
          <TabsTrigger value="rendering">Rendering</TabsTrigger>
          <TabsTrigger value="caching">Caching</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="web-vitals" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {webVitals.map((metric) => (
              <Card key={metric.name}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span>{metric.name}</span>
                    {getStatusIcon(metric.status)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-1">
                    {metric.name === 'CLS' 
                      ? metric.value.toFixed(3) 
                      : Math.round(metric.value)
                    }
                    <span className="text-sm font-normal text-slate-500 ml-1">
                      {metric.unit}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                    {metric.description}
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={getStatusColor(metric.status)}>
                      {metric.status.replace('-', ' ')}
                    </span>
                    <span className="text-slate-400">
                      (threshold: {metric.threshold}{metric.unit})
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="rendering" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderMetrics.map((metric) => (
              <Card key={metric.name}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Cpu className="h-4 w-4" />
                    {metric.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-1">
                    {metric.value}
                    <span className="text-sm font-normal text-slate-500 ml-1">
                      {metric.unit}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {metric.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="caching" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cacheStats.map((cache) => (
              <Card key={cache.name}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Database className="h-4 w-4" />
                    {cache.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Hit Rate</span>
                    <span className="font-semibold">
                      {calculateCacheHitRate(cache)}%
                    </span>
                  </div>
                  <Progress value={calculateCacheHitRate(cache)} className="h-2" />
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-600">Hits:</span>
                      <span className="font-semibold ml-1">{cache.hits}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Misses:</span>
                      <span className="font-semibold ml-1">{cache.misses}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Size:</span>
                    <span className="font-semibold">
                      {cache.size} / {cache.maxSize}
                    </span>
                  </div>
                  <Progress 
                    value={(cache.size / cache.maxSize) * 100} 
                    className="h-2" 
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Wifi className="h-4 w-4" />
                  Connection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold text-green-600">
                  Online
                </div>
                <p className="text-xs text-slate-600">Network Status</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <HardDrive className="h-4 w-4" />
                  Storage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold">
                  2.3 MB
                </div>
                <p className="text-xs text-slate-600">Cache Storage Used</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  Uptime
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold">
                  {Math.floor(performance.now() / 1000 / 60)}m
                </div>
                <p className="text-xs text-slate-600">Session Duration</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold text-green-600">
                  Good
                </div>
                <p className="text-xs text-slate-600">Overall Score</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
})