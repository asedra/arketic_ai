"use client"

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  FileText, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  Copy,
  Eye,
  BookOpen,
  Sparkles
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export interface RAGSource {
  title: string
  document_id?: string | null
  content?: string
  similarity_score?: number
  chunk_id?: string
  page_number?: number
  url?: string
  metadata?: Record<string, any>
}

interface MessageSourcesProps {
  sources: RAGSource[]
  className?: string
  isCompact?: boolean
  onSourceClick?: (source: RAGSource) => void
}

export const MessageSources: React.FC<MessageSourcesProps> = ({ 
  sources, 
  className,
  isCompact = false,
  onSourceClick
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedSource, setSelectedSource] = useState<RAGSource | null>(null)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)

  if (!sources || sources.length === 0) {
    return null
  }

  const displayedSources = isCompact && !isExpanded ? sources.slice(0, 2) : sources
  const hasMoreSources = isCompact && sources.length > 2

  const getSimilarityBadgeColor = (score?: number) => {
    if (!score) return 'secondary'
    if (score >= 0.9) return 'default' // Very high relevance
    if (score >= 0.7) return 'secondary' // Good relevance
    if (score >= 0.5) return 'outline' // Moderate relevance
    return 'destructive' // Low relevance
  }

  const getSimilarityLabel = (score?: number) => {
    if (!score) return 'Unknown'
    if (score >= 0.9) return 'Very High'
    if (score >= 0.7) return 'High'
    if (score >= 0.5) return 'Moderate'
    return 'Low'
  }

  const handleSourceClick = (source: RAGSource) => {
    setSelectedSource(source)
    setPreviewDialogOpen(true)
    onSourceClick?.(source)
  }

  const copySourceReference = async (source: RAGSource) => {
    const reference = `Source: ${source.title}${source.page_number ? ` (Page ${source.page_number})` : ''}${source.document_id ? ` [ID: ${source.document_id}]` : ''}`
    try {
      await navigator.clipboard.writeText(reference)
      // TODO: Add toast notification
      console.log('Source reference copied')
    } catch (error) {
      console.error('Failed to copy source reference:', error)
    }
  }

  return (
    <TooltipProvider>
      <div className={cn(
        'mt-3 pt-3 border-t border-slate-200 dark:border-slate-700',
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
            <Sparkles className="h-3 w-3" />
            <span>Sources Used ({sources.length})</span>
          </div>
          {isCompact && hasMoreSources && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show All
                </>
              )}
            </Button>
          )}
        </div>

        {/* Source Cards */}
        <div className="space-y-2">
          {displayedSources.map((source, index) => (
            <div
              key={`${source.document_id || index}-${source.chunk_id || index}`}
              className={cn(
                'group relative rounded-lg border border-slate-200 dark:border-slate-700',
                'bg-slate-50 dark:bg-slate-800/50',
                'hover:bg-slate-100 dark:hover:bg-slate-800',
                'transition-all duration-200',
                'p-3'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                {/* Source Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <div className="shrink-0 mt-0.5">
                      {source.url ? (
                        <ExternalLink className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      ) : (
                        <FileText className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {source.title}
                      </h4>
                      {source.content && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                          {source.content}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        {/* Similarity Score Badge */}
                        {source.similarity_score !== undefined && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge 
                                variant={getSimilarityBadgeColor(source.similarity_score)}
                                className="text-xs"
                              >
                                {(source.similarity_score * 100).toFixed(0)}% match
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Relevance: {getSimilarityLabel(source.similarity_score)}</p>
                              <p className="text-xs opacity-80">
                                Similarity score: {source.similarity_score.toFixed(3)}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        
                        {/* Page Number */}
                        {source.page_number && (
                          <Badge variant="outline" className="text-xs">
                            Page {source.page_number}
                          </Badge>
                        )}
                        
                        {/* Document ID */}
                        {source.document_id && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            ID: {source.document_id.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleSourceClick(source)}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Preview Source</TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => copySourceReference(source)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy Reference</TooltipContent>
                  </Tooltip>
                  
                  {source.url && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => window.open(source.url, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Open in New Tab</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Source Preview Dialog */}
        <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Source Document Preview
              </DialogTitle>
              <DialogDescription>
                {selectedSource?.title}
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto">
              {selectedSource && (
                <div className="space-y-4">
                  {/* Metadata */}
                  <div className="flex flex-wrap gap-2">
                    {selectedSource.similarity_score !== undefined && (
                      <Badge variant={getSimilarityBadgeColor(selectedSource.similarity_score)}>
                        {getSimilarityLabel(selectedSource.similarity_score)} Relevance ({(selectedSource.similarity_score * 100).toFixed(0)}%)
                      </Badge>
                    )}
                    {selectedSource.page_number && (
                      <Badge variant="outline">Page {selectedSource.page_number}</Badge>
                    )}
                    {selectedSource.document_id && (
                      <Badge variant="outline">Document ID: {selectedSource.document_id}</Badge>
                    )}
                    {selectedSource.chunk_id && (
                      <Badge variant="outline">Chunk ID: {selectedSource.chunk_id}</Badge>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                      <h3 className="text-sm font-medium mb-2">Content Extract:</h3>
                      <p className="text-sm whitespace-pre-wrap">
                        {selectedSource.content || 'No content preview available'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Additional Metadata */}
                  {selectedSource.metadata && Object.keys(selectedSource.metadata).length > 0 && (
                    <div className="border-t pt-4">
                      <h3 className="text-sm font-medium mb-2">Additional Information:</h3>
                      <dl className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(selectedSource.metadata).map(([key, value]) => (
                          <div key={key}>
                            <dt className="font-medium text-slate-600 dark:text-slate-400">
                              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                            </dt>
                            <dd className="text-slate-900 dark:text-slate-100">
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    {selectedSource.url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(selectedSource.url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Original
                      </Button>
                    )}
                    {selectedSource.document_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Navigate to knowledge document
                          window.location.href = `/knowledge/${selectedSource.document_id}`
                        }}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        View Document
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copySourceReference(selectedSource)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Reference
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}