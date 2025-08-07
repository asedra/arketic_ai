"use client"

import React, { useState } from 'react'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingGrid } from '@/components/ui/loading'
import { FileText, Plus, Settings, Clock, Users, Eye, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useArketicStore } from '@/lib/state-manager'
import dynamic from 'next/dynamic'

const AdaptiveCardDesigner = dynamic(
  () => import('@/components/forms/AdaptiveCardDesigner'),
  { 
    ssr: false,
    loading: () => <LoadingGrid items={1} columns={1} />
  }
)

interface FormsContentProps {
  className?: string
}

export default function FormsContent({ className }: FormsContentProps) {
  const { user } = useAuth();
  const isLoading = useArketicStore(state => state.loading.forms || false);
  const [showDesigner, setShowDesigner] = useState(false);

  if (showDesigner) {
    return (
      <ErrorBoundary level="page" context={{ page: 'form-designer', user: user?.id }}>
        <div className={className}>
          <div className="p-4">
            <Button 
              variant="ghost" 
              onClick={() => setShowDesigner(false)}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Forms
            </Button>
            <AdaptiveCardDesigner />
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary level="page" context={{ page: 'forms', user: user?.id }}>
      <div className={className}>
        <div className="container mx-auto px-4 py-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                Forms
              </h1>
              <Badge variant="secondary" className="ml-2">
                Beta
              </Badge>
            </div>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl">
              Create, manage, and deploy intelligent forms powered by Adaptive Cards. 
              Build dynamic forms that integrate seamlessly with your workflows.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-dashed border-2 border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 group">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Plus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-lg">Create New Form</CardTitle>
                <CardDescription>
                  Start building a new form with our drag-and-drop designer
                </CardDescription>
                <div className="pt-4">
                  <Button onClick={() => setShowDesigner(true)}>
                    Get Started
                  </Button>
                </div>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="text-lg">Form Templates</CardTitle>
                <CardDescription>
                  Choose from pre-built templates to get started quickly
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mb-4">
                  <Settings className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle className="text-lg">Settings</CardTitle>
                <CardDescription>
                  Configure form defaults and integration settings
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Recent Forms Section */}
          <ErrorBoundary level="section" context={{ section: 'recent-forms' }}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Recent Forms
                    </CardTitle>
                    <CardDescription>
                      Your recently created and modified forms
                    </CardDescription>
                  </div>
                  {user && (
                    <Badge variant="outline" className="text-xs">
                      {user.name || user.email}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <LoadingGrid items={3} columns={1} />
                ) : (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No forms yet</p>
                    <p className="text-sm mb-4">
                      Create your first form to see it appear here
                    </p>
                    <Button variant="outline" onClick={() => setShowDesigner(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Form
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </ErrorBoundary>
        </div>
      </div>
    </ErrorBoundary>
  )
}