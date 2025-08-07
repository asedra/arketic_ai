"use client"

// Type declaration for gtag
declare global {
  interface Window {
    gtag?: (...args: any[]) => void
  }
}

import React, { Suspense, useEffect } from 'react'
import { Toaster } from 'sonner'
import { ErrorBoundary } from './ErrorBoundary'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { LoadingSpinner } from './LoadingSpinner'
import { useNavigation } from '@/lib/hooks'
import { useArketicStore } from '@/lib/state-manager'
import { cn } from '@/lib/utils'

// Lazy load content components
const AnalyticsContent = React.lazy(() => import('./content/AnalyticsContent'))
const ChatContent = React.lazy(() => import('./content/ChatContent'))
const FormsContent = React.lazy(() => import('./content/FormsContent'))
const KnowledgeContent = React.lazy(() => import('./content/KnowledgeContent'))
const AssistantsContent = React.lazy(() => import('./content/AssistantsContent'))
const MyOrganizationContent = React.lazy(() => import('./content/MyOrganizationContent'))
const WorkflowContent = React.lazy(() => import('./content/WorkflowContent'))
const DataSourcesContent = React.lazy(() => import('./content/DataSourcesContent'))
const SettingsContent = React.lazy(() => import('./content/SettingsContent'))

export default function DashboardContainer() {
  const { activeSection } = useNavigation()
  const loading = useArketicStore(state => state.loading)
  
  // Initialize state tracking for analytics
  useEffect(() => {
    // Track initial page view
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'page_view', {
        page_title: 'Dashboard',
        page_location: window.location.href
      })
    }
  }, [])
  
  const renderContent = () => {
    const contentProps = {
      className: "flex-1 overflow-auto"
    }
    
    switch (activeSection) {
      case 'analytics':
        return <AnalyticsContent {...contentProps} />
      case 'chat':
        return <ChatContent {...contentProps} />
      case 'forms':
        return <FormsContent {...contentProps} />
      case 'knowledge':
        return <KnowledgeContent {...contentProps} />
      case 'assistants':
        return <AssistantsContent {...contentProps} />
      case 'my-organization':
        return <MyOrganizationContent {...contentProps} />
      case 'workflow':
        return <WorkflowContent {...contentProps} />
      case 'data-sources':
        return <DataSourcesContent {...contentProps} />
      case 'settings':
        return <SettingsContent {...contentProps} />
      default:
        return <AnalyticsContent {...contentProps} />
    }
  }
  
  return (
    <ErrorBoundary>
      <div className="h-screen flex bg-slate-50 dark:bg-slate-900">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <TopBar />
          
          {/* Content Area */}
          <main className="flex-1 overflow-hidden">
            <ErrorBoundary
              fallback={
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      Failed to load content
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400">
                      Please try refreshing the page
                    </p>
                  </div>
                </div>
              }
            >
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-full">
                    <LoadingSpinner size="lg" text="Loading..." />
                  </div>
                }
              >
                {renderContent()}
              </Suspense>
            </ErrorBoundary>
          </main>
        </div>
        
        {/* Global loading overlay */}
        {Object.values(loading).some(Boolean) && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-xl">
              <LoadingSpinner size="md" text="Processing..." />
            </div>
          </div>
        )}
        
        {/* Toast notifications */}
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            className: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
          }}
        />
      </div>
    </ErrorBoundary>
  )
}
