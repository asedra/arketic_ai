"use client"

import React, { useState, useMemo, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Search, 
  Filter, 
  FileText, 
  Folder, 
  Database, 
  Globe, 
  Lock, 
  Check, 
  X, 
  Calendar,
  Hash,
  ChevronRight,
  FileImage,
  FileCode,
  FileSpreadsheet,
  Link,
  ExternalLink,
  Eye,
  Download,
  Copy,
  Layers,
  Grid,
  List,
  SortAsc,
  SortDesc
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface Document {
  id: string
  title: string
  source_type: string
  file_name?: string
  file_type?: string
  file_size?: number
  chunk_count?: number
  token_count?: number
  created_at?: string
  updated_at?: string
  preview_content?: string
  url?: string
  tags?: string[]
}

interface Collection {
  id: string
  name: string
  description?: string
  type: string
  document_count: number
  is_public: boolean
  documents: Document[]
  created_at?: string
  updated_at?: string
  tags?: string[]
}

interface DocumentBrowserProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  collections: Collection[]
  selectedCollectionIds: string[]
  selectedDocumentIds: string[]
  onCollectionToggle: (collectionId: string) => void
  onDocumentToggle: (documentId: string) => void
  onConfirm: () => void
  title?: string
  description?: string
}

const getFileIcon = (fileType?: string, sourceType?: string) => {
  if (sourceType === 'url' || sourceType === 'website') return Link
  if (fileType?.includes('image')) return FileImage
  if (fileType?.includes('code') || fileType?.includes('javascript') || fileType?.includes('python')) return FileCode
  if (fileType?.includes('spreadsheet') || fileType?.includes('excel') || fileType?.includes('csv')) return FileSpreadsheet
  return FileText
}

const formatFileSize = (bytes?: number) => {
  if (!bytes) return ''
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

const formatDate = (dateString?: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function DocumentBrowser({
  open,
  onOpenChange,
  collections,
  selectedCollectionIds,
  selectedDocumentIds,
  onCollectionToggle,
  onDocumentToggle,
  onConfirm,
  title = 'Browse Knowledge Base',
  description = 'Select collections and documents to add to your assistant'
}: DocumentBrowserProps) {
  const [activeTab, setActiveTab] = useState<'collections' | 'documents'>('collections')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedDocumentForPreview, setSelectedDocumentForPreview] = useState<Document | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  // Get all unique tags from collections and documents
  const allTags = useMemo(() => {
    const tags = new Set<string>()
    collections.forEach(collection => {
      collection.tags?.forEach(tag => tags.add(tag))
      collection.documents.forEach(doc => {
        doc.tags?.forEach(tag => tags.add(tag))
      })
    })
    return Array.from(tags)
  }, [collections])

  // Get all documents from all collections
  const allDocuments = useMemo(() => {
    return collections.flatMap(collection => 
      collection.documents.map(doc => ({
        ...doc,
        collectionName: collection.name,
        collectionId: collection.id,
        isPublic: collection.is_public
      }))
    )
  }, [collections])

  // Filter and sort collections
  const filteredCollections = useMemo(() => {
    let filtered = collections

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(collection =>
        collection.name.toLowerCase().includes(query) ||
        collection.description?.toLowerCase().includes(query) ||
        collection.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // Type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(collection => collection.type === selectedType)
    }

    // Tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(collection =>
        selectedTags.every(tag => collection.tags?.includes(tag))
      )
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let aValue: any = a[sortBy as keyof Collection]
      let bValue: any = b[sortBy as keyof Collection]
      
      if (sortBy === 'document_count') {
        aValue = a.document_count
        bValue = b.document_count
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filtered
  }, [collections, searchQuery, selectedType, selectedTags, sortBy, sortOrder])

  // Filter and sort documents
  const filteredDocuments = useMemo(() => {
    let filtered = allDocuments

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(doc =>
        doc.title.toLowerCase().includes(query) ||
        doc.file_name?.toLowerCase().includes(query) ||
        doc.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // Source type filter
    if (selectedSource !== 'all') {
      filtered = filtered.filter(doc => doc.source_type === selectedSource)
    }

    // Tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(doc =>
        selectedTags.every(tag => doc.tags?.includes(tag))
      )
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let aValue: any = a[sortBy as keyof typeof a]
      let bValue: any = b[sortBy as keyof typeof b]
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filtered
  }, [allDocuments, searchQuery, selectedSource, selectedTags, sortBy, sortOrder])

  // Calculate selection stats
  const selectionStats = useMemo(() => {
    const totalCollections = selectedCollectionIds.length
    const totalDocuments = selectedDocumentIds.length
    const totalSize = allDocuments
      .filter(doc => selectedDocumentIds.includes(doc.id))
      .reduce((sum, doc) => sum + (doc.file_size || 0), 0)
    const totalTokens = allDocuments
      .filter(doc => selectedDocumentIds.includes(doc.id))
      .reduce((sum, doc) => sum + (doc.token_count || 0), 0)
    
    return { totalCollections, totalDocuments, totalSize, totalTokens }
  }, [selectedCollectionIds, selectedDocumentIds, allDocuments])

  const handleSelectAllCollections = useCallback(() => {
    filteredCollections.forEach(collection => {
      if (!selectedCollectionIds.includes(collection.id)) {
        onCollectionToggle(collection.id)
      }
    })
  }, [filteredCollections, selectedCollectionIds, onCollectionToggle])

  const handleSelectAllDocuments = useCallback(() => {
    filteredDocuments.forEach(doc => {
      if (!selectedDocumentIds.includes(doc.id)) {
        onDocumentToggle(doc.id)
      }
    })
  }, [filteredDocuments, selectedDocumentIds, onDocumentToggle])

  const handleClearAll = useCallback(() => {
    selectedCollectionIds.forEach(id => onCollectionToggle(id))
    selectedDocumentIds.forEach(id => onDocumentToggle(id))
  }, [selectedCollectionIds, selectedDocumentIds, onCollectionToggle, onDocumentToggle])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 border-b">
          {/* Selection Stats */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Badge variant="secondary">
                <Database className="h-3 w-3 mr-1" />
                {selectionStats.totalCollections} Collections
              </Badge>
              <Badge variant="secondary">
                <FileText className="h-3 w-3 mr-1" />
                {selectionStats.totalDocuments} Documents
              </Badge>
              {selectionStats.totalSize > 0 && (
                <Badge variant="outline">
                  {formatFileSize(selectionStats.totalSize)}
                </Badge>
              )}
              {selectionStats.totalTokens > 0 && (
                <Badge variant="outline">
                  <Hash className="h-3 w-3 mr-1" />
                  {selectionStats.totalTokens.toLocaleString()} tokens
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleClearAll}>
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, description, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="created_at">Created Date</SelectItem>
                <SelectItem value="updated_at">Updated Date</SelectItem>
                <SelectItem value="document_count">Document Count</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
            </Button>
            
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'collections' | 'documents')} className="flex-1">
          <TabsList className="mx-6">
            <TabsTrigger value="collections">
              <Folder className="h-4 w-4 mr-2" />
              Collections ({filteredCollections.length})
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="h-4 w-4 mr-2" />
              All Documents ({filteredDocuments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="collections" className="px-6 pb-2 mt-4">
            <ScrollArea className="h-[400px]">
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 gap-4 pr-4">
                  {filteredCollections.map(collection => (
                    <Card 
                      key={collection.id} 
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        selectedCollectionIds.includes(collection.id) && "ring-2 ring-primary"
                      )}
                      onClick={() => onCollectionToggle(collection.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedCollectionIds.includes(collection.id)}
                              onCheckedChange={() => onCollectionToggle(collection.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Folder className="h-5 w-5 text-blue-500" />
                          </div>
                          <div className="flex items-center gap-1">
                            {collection.is_public ? (
                              <Globe className="h-4 w-4 text-blue-500" />
                            ) : (
                              <Lock className="h-4 w-4 text-gray-500" />
                            )}
                          </div>
                        </div>
                        <CardTitle className="text-base">{collection.name}</CardTitle>
                        {collection.description && (
                          <CardDescription className="line-clamp-2 text-xs">
                            {collection.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{collection.document_count} documents</span>
                          <Badge variant="outline" className="text-xs">
                            {collection.type}
                          </Badge>
                        </div>
                        {collection.tags && collection.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {collection.tags.slice(0, 3).map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {collection.tags.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{collection.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-2 pr-4">
                  {filteredCollections.map(collection => (
                    <div 
                      key={collection.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors",
                        selectedCollectionIds.includes(collection.id) && "bg-accent"
                      )}
                      onClick={() => onCollectionToggle(collection.id)}
                    >
                      <Checkbox
                        checked={selectedCollectionIds.includes(collection.id)}
                        onCheckedChange={() => onCollectionToggle(collection.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Folder className="h-4 w-4 text-blue-500" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{collection.name}</span>
                          {collection.is_public ? (
                            <Globe className="h-3 w-3 text-blue-500" />
                          ) : (
                            <Lock className="h-3 w-3 text-gray-500" />
                          )}
                          <Badge variant="outline" className="text-xs">
                            {collection.type}
                          </Badge>
                        </div>
                        {collection.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {collection.description}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {collection.document_count} docs
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
              
              {filteredCollections.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No collections found matching your criteria
                </div>
              )}
            </ScrollArea>
            
            {filteredCollections.length > 0 && (
              <div className="flex justify-end mt-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleSelectAllCollections}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Select All Visible
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="documents" className="px-6 pb-2 mt-4">
            <div className="mb-3">
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="file">Files</SelectItem>
                  <SelectItem value="url">URLs</SelectItem>
                  <SelectItem value="website">Websites</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <ScrollArea className="h-[350px]">
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 gap-4 pr-4">
                  {filteredDocuments.map(doc => {
                    const Icon = getFileIcon(doc.file_type, doc.source_type)
                    return (
                      <Card 
                        key={doc.id}
                        className={cn(
                          "cursor-pointer transition-all hover:shadow-md",
                          selectedDocumentIds.includes(doc.id) && "ring-2 ring-primary"
                        )}
                        onClick={() => onDocumentToggle(doc.id)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={selectedDocumentIds.includes(doc.id)}
                                onCheckedChange={() => onDocumentToggle(doc.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <Icon className="h-5 w-5 text-gray-500" />
                            </div>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setSelectedDocumentForPreview(doc)
                                    }}
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Preview document</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <CardTitle className="text-sm line-clamp-2">{doc.title}</CardTitle>
                          {doc.file_name && (
                            <CardDescription className="text-xs line-clamp-1">
                              {doc.file_name}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{doc.collectionName}</span>
                            {doc.file_size && (
                              <span>{formatFileSize(doc.file_size)}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            {doc.chunk_count && (
                              <Badge variant="outline" className="text-xs">
                                {doc.chunk_count} chunks
                              </Badge>
                            )}
                            {doc.token_count && (
                              <Badge variant="outline" className="text-xs">
                                {doc.token_count.toLocaleString()} tokens
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <div className="space-y-2 pr-4">
                  {filteredDocuments.map(doc => {
                    const Icon = getFileIcon(doc.file_type, doc.source_type)
                    return (
                      <div 
                        key={doc.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors",
                          selectedDocumentIds.includes(doc.id) && "bg-accent"
                        )}
                        onClick={() => onDocumentToggle(doc.id)}
                      >
                        <Checkbox
                          checked={selectedDocumentIds.includes(doc.id)}
                          onCheckedChange={() => onDocumentToggle(doc.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Icon className="h-4 w-4 text-gray-500" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{doc.title}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{doc.collectionName}</span>
                            {doc.file_size && (
                              <>
                                <span>•</span>
                                <span>{formatFileSize(doc.file_size)}</span>
                              </>
                            )}
                            {doc.created_at && (
                              <>
                                <span>•</span>
                                <span>{formatDate(doc.created_at)}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.chunk_count && (
                            <Badge variant="outline" className="text-xs">
                              {doc.chunk_count} chunks
                            </Badge>
                          )}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedDocumentForPreview(doc)
                                  }}
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Preview document</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              
              {filteredDocuments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No documents found matching your criteria
                </div>
              )}
            </ScrollArea>
            
            {filteredDocuments.length > 0 && (
              <div className="flex justify-end mt-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleSelectAllDocuments}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Select All Visible
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="px-6 pb-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            Confirm Selection
          </Button>
        </DialogFooter>

        {/* Document Preview Dialog */}
        {selectedDocumentForPreview && (
          <Dialog open={!!selectedDocumentForPreview} onOpenChange={() => setSelectedDocumentForPreview(null)}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {selectedDocumentForPreview.title}
                </DialogTitle>
                {selectedDocumentForPreview.file_name && (
                  <DialogDescription>{selectedDocumentForPreview.file_name}</DialogDescription>
                )}
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Source Type:</span>
                    <Badge variant="outline" className="ml-2">
                      {selectedDocumentForPreview.source_type}
                    </Badge>
                  </div>
                  {selectedDocumentForPreview.file_size && (
                    <div>
                      <span className="text-muted-foreground">File Size:</span>
                      <span className="ml-2">{formatFileSize(selectedDocumentForPreview.file_size)}</span>
                    </div>
                  )}
                  {selectedDocumentForPreview.chunk_count && (
                    <div>
                      <span className="text-muted-foreground">Chunks:</span>
                      <span className="ml-2">{selectedDocumentForPreview.chunk_count}</span>
                    </div>
                  )}
                  {selectedDocumentForPreview.token_count && (
                    <div>
                      <span className="text-muted-foreground">Tokens:</span>
                      <span className="ml-2">{selectedDocumentForPreview.token_count.toLocaleString()}</span>
                    </div>
                  )}
                </div>
                
                {selectedDocumentForPreview.url && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">URL:</span>
                    <a 
                      href={selectedDocumentForPreview.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline flex items-center gap-1"
                    >
                      {selectedDocumentForPreview.url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                
                {selectedDocumentForPreview.tags && selectedDocumentForPreview.tags.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Tags:</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedDocumentForPreview.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedDocumentForPreview.preview_content && (
                  <div>
                    <span className="text-muted-foreground">Preview:</span>
                    <ScrollArea className="h-[200px] mt-2 p-3 border rounded-lg">
                      <pre className="text-sm whitespace-pre-wrap">
                        {selectedDocumentForPreview.preview_content}
                      </pre>
                    </ScrollArea>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  )
}