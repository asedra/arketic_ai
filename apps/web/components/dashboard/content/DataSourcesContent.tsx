"use client"

import React, { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Database } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DataSourcesContentProps {
  className?: string
}

const DataSourcesContent = memo(function DataSourcesContent({ className }: DataSourcesContentProps) {
  return (
    <div className={cn('p-6 space-y-6', className)}>
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          Data Sources
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Connect and manage your data sources
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Connected Sources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-slate-500 dark:text-slate-400 py-8">
            Data sources management interface will be implemented here
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

export default DataSourcesContent
