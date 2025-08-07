"use client"

import React, { memo, useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DelightfulLoading, SkeletonLoader } from '@/components/ui/delightful-loading'
import { DelightfulEmptyState } from '@/components/ui/delightful-empty-state'
import { SuccessCelebration } from '@/components/ui/success-celebration'
import { DelightfulButton } from '@/components/ui/delightful-button'
import { DelightfulErrorState } from '@/components/ui/delightful-error-state'
import { 
  Search, 
  Plus, 
  Upload, 
  RefreshCw, 
  FolderPlus, 
  Grid3X3, 
  List,
  FileText,
  Folder,
  Sparkles,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useArketicStore } from '@/lib/state-manager'
import { knowledgeApi } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'

interface KnowledgeContentProps {
  className?: string
}

const KnowledgeContent = memo(function KnowledgeContent({ className }: KnowledgeContentProps) {
  const viewMode = useArketicStore(state => state.viewMode)
  const searchQuery = useArketicStore(state => state.searchQuery)
  const { toast } = useToast()
  
  // State management
  const [knowledgeItems, setKnowledgeItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [uploading, setUploading] = useState(false)
  
  // Mock knowledge items (fallback)
  const mockItems = [
    {
      id: 1,
      name: 'Company Handbook',
      type: 'document' as const,
      size: '2.4 MB',
      lastModified: '2 hours ago',
      status: 'active' as const
    },
    {
      id: 2,
      name: 'API Documentation',
      type: 'folder' as const,
      size: '12 files',
      lastModified: '1 day ago',
      status: 'active' as const
    },
    {
      id: 3,
      name: 'Training Materials',
      type: 'folder' as const,
      size: '8 files',
      lastModified: '3 days ago',
      status: 'processing' as const
    }
  ]
  
  // Fetch knowledge items
  const fetchKnowledgeItems = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await knowledgeApi.getItems(searchQuery)
      
      if (response.data) {
        const items = response.data.items || response.data
        setKnowledgeItems(items.length > 0 ? items : mockItems)
        
        if (items.length > 0) {
          setShowSuccess(true)
          toast({
            title: "Knowledge loaded successfully!",
            description: `Found ${items.length} items in your knowledge base.`
          })
        }
      } else {
        setKnowledgeItems(mockItems)
      }
    } catch (err) {
      console.error('Error fetching knowledge items:', err)
      setError('Failed to load knowledge base')
      setKnowledgeItems(mockItems) // Fallback to mock data
    } finally {
      setLoading(false)
    }
  }
  
  // Sync integrations
  const handleSync = async () => {
    try {
      setSyncing(true)
      await knowledgeApi.syncIntegrations()
      
      toast({
        title: "Sync complete!",
        description: "Your integrations have been synchronized."
      })
      
      // Refresh data after sync
      await fetchKnowledgeItems()
    } catch (err) {
      toast({
        title: "Sync failed",
        description: "Unable to sync integrations. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSyncing(false)
    }
  }
  
  // Handle file upload
  const handleUpload = () => {
    setUploading(true)
    // Simulate upload process
    setTimeout(() => {
      setUploading(false)
      toast({
        title: "Upload successful!",
        description: "Your files have been added to the knowledge base."
      })
      fetchKnowledgeItems()
    }, 2000)
  }
  
  // Load data on mount
  useEffect(() => {
    fetchKnowledgeItems()
  }, [searchQuery])
  
  // Filter items based on search
  const filteredItems = knowledgeItems.filter(item => 
    !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  // Show success celebration
  if (showSuccess) {
    return (
      <SuccessCelebration
        type="sync"
        message="Knowledge Base Ready!"
        description="Your knowledge is organized and ready to use"
        onComplete={() => setShowSuccess(false)}
      />
    )
  }
  
  // Show error state
  if (error && !loading) {
    return (
      <DelightfulErrorState
        type="general"
        title="Couldn't load knowledge base"
        description={error}
        onAction={() => {
          setError(null)
          fetchKnowledgeItems()
        }}
        onSecondaryAction={() => setError(null)}
      />
    )
  }
  
  return (
    <div className={cn('p-6 space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Knowledge Base
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage your organization's information and connect it to AI assistants
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="animate-fade-in-scale">
            {filteredItems.length} items
          </Badge>
          {syncing && (
            <div className="flex items-center space-x-2 text-blue-600">
              <Zap className="h-4 w-4 animate-spin" />
              <span className="text-sm">Syncing...</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DelightfulButton
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
                glow
                bounce
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </DelightfulButton>
              
              <DelightfulButton
                variant="outline"
                size="sm"
                loading={uploading}
                loadingText="Uploading..."
                onClick={handleUpload}
                ripple
              >
                <Upload className="h-4 w-4 mr-1" />
                Upload
              </DelightfulButton>
              
              <DelightfulButton
                variant="outline"
                size="sm"
                loading={syncing}
                loadingText="Syncing..."
                onClick={handleSync}
                ripple
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Sync
              </DelightfulButton>
              
              <DelightfulButton variant="outline" size="sm" bounce>
                <FolderPlus className="h-4 w-4 mr-1" />
                New Folder
              </DelightfulButton>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search knowledge base..."
                  value={searchQuery}
                  className="pl-10 w-64"
                />
              </div>
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-r-none"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Items</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <DelightfulLoading 
                type="knowledge" 
                message="Loading your knowledge base..."
              />
              <SkeletonLoader type={viewMode === 'grid' ? 'card' : 'list'} />
            </div>
          ) : filteredItems.length === 0 ? (
            <DelightfulEmptyState
              type={searchQuery ? 'search' : 'knowledge'}
              title={searchQuery ? 'No matching documents' : 'Your knowledge base is empty'}
              description={searchQuery ? 'Try adjusting your search terms or clear filters.' : 'Add documents, connect integrations, or create your first knowledge article.'}
              actionLabel={searchQuery ? 'Clear search' : 'Add knowledge'}
              onAction={() => {
                // Handle action based on state
                console.log('Empty state action')
              }}
            />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredItems.map((item, index) => (
                <div 
                  key={item.id} 
                  className={cn(
                    "group border rounded-lg p-4 cursor-pointer transition-all duration-200",
                    "hover:bg-slate-50 dark:hover:bg-slate-800 hover:shadow-md hover-lift",
                    "animate-fade-in-scale",
                    `stagger-${Math.min(index + 1, 5)}`
                  )}
                >
                  <div className="flex items-center gap-3 mb-2">
                    {item.type === 'folder' ? (
                      <Folder className="h-5 w-5 text-blue-500 group-hover:animate-wiggle" />
                    ) : (
                      <FileText className="h-5 w-5 text-slate-500 group-hover:animate-wiggle" />
                    )}
                    <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                      {item.name}
                    </span>
                    {item.status === 'processing' && (
                      <Sparkles className="h-4 w-4 text-yellow-500 animate-pulse" />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                    <span>{item.size}</span>
                    <span>{item.lastModified}</span>
                  </div>
                  <div className="mt-2">
                    <Badge 
                      variant={item.status === 'active' ? 'default' : 'secondary'}
                      className={cn(
                        "text-xs transition-colors",
                        item.status === 'processing' && "animate-pulse"
                      )}
                    >
                      {item.status === 'processing' ? 'Processing...' : item.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item, index) => (
                <div 
                  key={item.id} 
                  className={cn(
                    "group flex items-center justify-between p-3 border rounded-lg cursor-pointer",
                    "hover:bg-slate-50 dark:hover:bg-slate-800 hover:shadow-sm hover-lift",
                    "transition-all duration-200 animate-slide-in-up",
                    `stagger-${Math.min(index + 1, 5)}`
                  )}
                >
                  <div className="flex items-center gap-3">
                    {item.type === 'folder' ? (
                      <Folder className="h-5 w-5 text-blue-500 group-hover:animate-wiggle" />
                    ) : (
                      <FileText className="h-5 w-5 text-slate-500 group-hover:animate-wiggle" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {item.name}
                        </p>
                        {item.status === 'processing' && (
                          <Sparkles className="h-4 w-4 text-yellow-500 animate-pulse" />
                        )}
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {item.size} • {item.lastModified}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant={item.status === 'active' ? 'default' : 'secondary'}
                    className={cn(
                      "text-xs transition-colors",
                      item.status === 'processing' && "animate-pulse"
                    )}
                  >
                    {item.status === 'processing' ? 'Processing...' : item.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
})

export default KnowledgeContent
