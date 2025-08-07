"use client"

import React, { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Users,
  MessageSquare,
  Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MetricCard } from '@/lib/types'

interface AnalyticsContentProps {
  className?: string
}

const metrics: MetricCard[] = [
  {
    title: 'Total Revenue',
    value: '$45,231.89',
    change: 20.1,
    changeType: 'increase',
    icon: DollarSign,
    color: 'text-green-600'
  },
  {
    title: 'Active Users',
    value: '2,350',
    change: 180.1,
    changeType: 'increase',
    icon: Users,
    color: 'text-blue-600'
  },
  {
    title: 'Chat Sessions',
    value: '12,234',
    change: 19,
    changeType: 'increase',
    icon: MessageSquare,
    color: 'text-purple-600'
  },
  {
    title: 'Automation Rate',
    value: '89.3%',
    change: 2.5,
    changeType: 'decrease',
    icon: Activity,
    color: 'text-orange-600'
  }
]

function MetricCard({ metric }: { metric: MetricCard }) {
  const Icon = metric.icon
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
          {metric.title}
        </CardTitle>
        <Icon className={cn('h-4 w-4', metric.color)} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {metric.value}
        </div>
        <div className="flex items-center text-xs text-slate-600 dark:text-slate-400 mt-1">
          {metric.changeType === 'increase' ? (
            <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
          )}
          <span className={metric.changeType === 'increase' ? 'text-green-600' : 'text-red-600'}>
            {metric.change > 0 ? '+' : ''}{metric.change}%
          </span>
          <span className="ml-1">from last month</span>
        </div>
      </CardContent>
    </Card>
  )
}

const AnalyticsContent = memo(function AnalyticsContent({ className }: AnalyticsContentProps) {
  return (
    <div className={cn('p-6 space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Analytics Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Monitor your AI platform performance and insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Activity className="h-3 w-3 mr-1" />
            Live
          </Badge>
          <Badge variant="outline">
            <Calendar className="h-3 w-3 mr-1" />
            Last 30 days
          </Badge>
        </div>
      </div>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <MetricCard key={index} metric={metric} />
        ))}
      </div>
      
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Usage Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-slate-500 dark:text-slate-400">
              Chart component will be added here
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-slate-500 dark:text-slate-400">
              Performance chart component will be added here
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      New chat session started
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      User john.doe@company.com
                    </p>
                  </div>
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {i + 1} min ago
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

export default AnalyticsContent
