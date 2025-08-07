"use client"

import React from 'react'
import { ClipboardList, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FormsContentProps {
  className?: string
}

export default function FormsContent({ className }: FormsContentProps) {
  return (
    <div className={className}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <ClipboardList className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Forms
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Create and manage adaptive forms
              </p>
            </div>
          </div>
          
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Form
          </Button>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8">
          <div className="text-center">
            <ClipboardList className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              No forms yet
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Create your first adaptive form to get started
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Form
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}