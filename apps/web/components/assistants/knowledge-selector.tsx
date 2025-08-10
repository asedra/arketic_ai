"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Folder, 
  FileText,
  Database,
  Globe,
  Lock,
  Check,
  X,
  GripVertical,
  Eye,
  Trash2,
  FolderOpen,
  Hash,
  Calendar,
  Filter,
  MoreVertical,
  Copy,
  Download,
  ExternalLink,
  Link,
  FileImage,
  FileCode,
  FileSpreadsheet,
  Layers
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DocumentBrowser } from './document-browser'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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

interface SelectedItem {
  id: string
  type: 'collection' | 'document'
  name: string
  details?: any
  order?: number
}

interface KnowledgeSelectorProps {
  collections: Collection[]
  selectedCollectionIds: string[]
  selectedDocumentIds: string[]
  onCollectionToggle: (collectionId: string) => void
  onDocumentToggle: (documentId: string) => void
  onSelectAll?: () => void
  onClearAll?: () => void
  className?: string
  showPreviewCards?: boolean
  enableDragDrop?: boolean
  onOrderChange?: (items: SelectedItem[]) => void
}

// Sortable Item Component for Drag & Drop
function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="flex items-center gap-2">
        <div {...listeners} className="cursor-move">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        {children}
      </div>
    </div>
  )
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

export function KnowledgeSelector({
  collections,
  selectedCollectionIds,
  selectedDocumentIds,
  onCollectionToggle,
  onDocumentToggle,
  onSelectAll,
  onClearAll,
  className,
  showPreviewCards = true,
  enableDragDrop = true,
  onOrderChange
}: KnowledgeSelectorProps) {
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'tree' | 'selected'>('tree')
  const [showBrowser, setShowBrowser] = useState(false)
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])

  // DnD Kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Update selected items when selections change
  useEffect(() => {
    const items: SelectedItem[] = []
    
    // Add selected collections
    collections.forEach(collection => {
      if (selectedCollectionIds.includes(collection.id)) {
        items.push({
          id: collection.id,
          type: 'collection',
          name: collection.name,
          details: collection,
          order: items.length
        })
      }
      
      // Add selected documents
      collection.documents.forEach(doc => {
        if (selectedDocumentIds.includes(doc.id)) {
          items.push({
            id: doc.id,
            type: 'document',
            name: doc.title,
            details: { ...doc, collectionName: collection.name },
            order: items.length
          })
        }
      })
    })
    
    setSelectedItems(items)
  }, [collections, selectedCollectionIds, selectedDocumentIds])

  // Calculate selection counts
  const selectedCounts = useMemo(() => {
    const totalCollections = selectedCollectionIds.length
    const totalDocuments = selectedDocumentIds.length
    const totalSize = collections.flatMap(c => c.documents)
      .filter(doc => selectedDocumentIds.includes(doc.id))
      .reduce((sum, doc) => sum + (doc.file_size || 0), 0)
    const totalTokens = collections.flatMap(c => c.documents)
      .filter(doc => selectedDocumentIds.includes(doc.id))
      .reduce((sum, doc) => sum + (doc.token_count || 0), 0)
    
    return { totalCollections, totalDocuments, totalSize, totalTokens }
  }, [selectedCollectionIds, selectedDocumentIds, collections])

  // Filter collections and documents based on search
  const filteredCollections = useMemo(() => {
    if (!searchQuery) return collections

    const query = searchQuery.toLowerCase()
    return collections.map(collection => {
      const matchingDocs = collection.documents.filter(doc =>
        doc.title.toLowerCase().includes(query) ||
        doc.file_name?.toLowerCase().includes(query)
      )
      
      const collectionMatches = 
        collection.name.toLowerCase().includes(query) ||
        collection.description?.toLowerCase().includes(query)
      
      if (collectionMatches) {
        return collection
      } else if (matchingDocs.length > 0) {
        return { ...collection, documents: matchingDocs }
      }
      return null
    }).filter(Boolean) as Collection[]
  }, [collections, searchQuery])

  // Toggle collection expansion
  const toggleExpand = (collectionId: string) => {
    setExpandedCollections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(collectionId)) {
        newSet.delete(collectionId)
      } else {
        newSet.add(collectionId)
      }
      return newSet
    })
  }

  // Check if collection is partially selected
  const isCollectionPartiallySelected = (collection: Collection) => {
    const selectedDocsInCollection = collection.documents.filter(
      doc => selectedDocumentIds.includes(doc.id)
    ).length
    
    return selectedDocsInCollection > 0 && selectedDocsInCollection < collection.documents.length
  }

  // Check if all documents in collection are selected
  const areAllDocumentsSelected = (collection: Collection) => {
    return collection.documents.length > 0 && 
      collection.documents.every(doc => selectedDocumentIds.includes(doc.id))
  }

  // Handle collection checkbox change
  const handleCollectionChange = (collection: Collection) => {
    // Toggle collection
    onCollectionToggle(collection.id)
    
    // If collection is being selected, also select all its documents
    if (!selectedCollectionIds.includes(collection.id)) {
      collection.documents.forEach(doc => {
        if (!selectedDocumentIds.includes(doc.id)) {
          onDocumentToggle(doc.id)
        }
      })
    } else {
      // If collection is being deselected, deselect all its documents
      collection.documents.forEach(doc => {
        if (selectedDocumentIds.includes(doc.id)) {
          onDocumentToggle(doc.id)
        }
      })
    }
  }

  // Handle drag end for reordering
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = selectedItems.findIndex(item => item.id === active.id)
      const newIndex = selectedItems.findIndex(item => item.id === over?.id)
      
      const newItems = arrayMove(selectedItems, oldIndex, newIndex)
      setSelectedItems(newItems)
      
      if (onOrderChange) {
        onOrderChange(newItems)
      }
    }
  }

  // Remove item from selection
  const handleRemoveItem = (item: SelectedItem) => {
    if (item.type === 'collection') {
      onCollectionToggle(item.id)
    } else {
      onDocumentToggle(item.id)
    }
  }

  // Quick actions for selected items
  const handleQuickAction = (action: string, item: SelectedItem) => {
    switch (action) {
      case 'view':
        // Open preview dialog
        console.log('View item:', item)
        break
      case 'copy':
        // Copy item details to clipboard
        navigator.clipboard.writeText(JSON.stringify(item.details, null, 2))
        break
      case 'download':
        // Download item (if applicable)
        console.log('Download item:', item)
        break
      default:
        break
    }
  }

  return (
    <TooltipProvider>
      <div className={cn("flex flex-col h-full", className)}>
        {/* Header with search and actions */}
        <div className="space-y-3 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search collections and documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                <Database className="h-3 w-3 mr-1" />
                {selectedCounts.totalCollections} Collections
              </Badge>
              <Badge variant="secondary">
                <FileText className="h-3 w-3 mr-1" />
                {selectedCounts.totalDocuments} Documents
              </Badge>
              {selectedCounts.totalSize > 0 && (
                <Badge variant="outline">
                  {formatFileSize(selectedCounts.totalSize)}
                </Badge>
              )}
              {selectedCounts.totalTokens > 0 && (
                <Badge variant="outline">
                  <Hash className="h-3 w-3 mr-1" />
                  {selectedCounts.totalTokens.toLocaleString()} tokens
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowBrowser(true)}
              >
                <FolderOpen className="h-4 w-4 mr-1" />
                Browse
              </Button>
              {onSelectAll && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={onSelectAll}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Select All
                </Button>
              )}
              {onClearAll && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={onClearAll}
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs for Tree View and Selected Items */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'tree' | 'selected')} className="flex-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tree">
              <Layers className="h-4 w-4 mr-2" />
              Browse ({filteredCollections.length})
            </TabsTrigger>
            <TabsTrigger value="selected">
              <Check className="h-4 w-4 mr-2" />
              Selected ({selectedItems.length})
            </TabsTrigger>
          </TabsList>

          {/* Tree View Tab */}
          <TabsContent value="tree" className="flex-1 mt-4">
            <ScrollArea className="h-full border rounded-lg">
              <div className="p-4 space-y-2">
                {filteredCollections.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'No matching collections or documents found' : 'No collections available'}
                  </div>
                ) : (
                  filteredCollections.map(collection => {
                    const isExpanded = expandedCollections.has(collection.id)
                    const isPartiallySelected = isCollectionPartiallySelected(collection)
                    const isFullySelected = selectedCollectionIds.includes(collection.id) || 
                                           areAllDocumentsSelected(collection)
                    
                    return (
                      <div key={collection.id} className="space-y-1">
                        {/* Collection header */}
                        <div className="flex items-center gap-2 p-2 hover:bg-accent rounded-lg transition-colors">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => toggleExpand(collection.id)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                          
                          <Checkbox
                            checked={isFullySelected}
                            indeterminate={isPartiallySelected}
                            onCheckedChange={() => handleCollectionChange(collection)}
                            className="data-[state=indeterminate]:bg-primary/50"
                          />
                          
                          <Folder className="h-4 w-4 text-blue-500" />
                          
                          <div className="flex-1 flex items-center gap-2">
                            <span className="font-medium">{collection.name}</span>
                            {collection.is_public ? (
                              <Globe className="h-3 w-3 text-blue-500" />
                            ) : (
                              <Lock className="h-3 w-3 text-gray-500" />
                            )}
                            <Badge variant="outline" className="text-xs">
                              {collection.type}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {collection.document_count} docs
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Documents */}
                        {isExpanded && (
                          <div className="ml-8 space-y-1">
                            {collection.documents.length === 0 ? (
                              <div className="text-sm text-muted-foreground pl-8 py-2">
                                No documents in this collection
                              </div>
                            ) : (
                              collection.documents.map(document => {
                                const Icon = getFileIcon(document.file_type, document.source_type)
                                return (
                                  <div
                                    key={document.id}
                                    className="flex items-center gap-2 p-2 hover:bg-accent/50 rounded-lg transition-colors"
                                  >
                                    <Checkbox
                                      checked={selectedDocumentIds.includes(document.id)}
                                      onCheckedChange={() => onDocumentToggle(document.id)}
                                      className="ml-8"
                                    />
                                    
                                    <Icon className="h-4 w-4 text-gray-500" />
                                    
                                    <div className="flex-1 flex items-center gap-2">
                                      <span className="text-sm">{document.title}</span>
                                      {document.file_name && (
                                        <span className="text-xs text-muted-foreground">
                                          ({document.file_name})
                                        </span>
                                      )}
                                      {document.chunk_count && (
                                        <Badge variant="outline" className="text-xs">
                                          {document.chunk_count} chunks
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                )
                              })
                            )}
                          </div>
                        )}
                        
                        {/* Collection description */}
                        {isExpanded && collection.description && (
                          <div className="ml-16 text-sm text-muted-foreground px-2 pb-2">
                            {collection.description}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Selected Items Tab */}
          <TabsContent value="selected" className="flex-1 mt-4">
            {selectedItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                No items selected. Browse and select collections or documents to add.
              </div>
            ) : (
              <ScrollArea className="h-full border rounded-lg">
                <div className="p-4">
                  {enableDragDrop ? (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={selectedItems.map(item => item.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {selectedItems.map(item => (
                            <SortableItem key={item.id} id={item.id}>
                              <Card className="flex-1">
                                <CardContent className="p-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      {item.type === 'collection' ? (
                                        <Folder className="h-4 w-4 text-blue-500" />
                                      ) : (
                                        <FileText className="h-4 w-4 text-gray-500" />
                                      )}
                                      <div>
                                        <div className="font-medium text-sm">{item.name}</div>
                                        {item.type === 'document' && item.details?.collectionName && (
                                          <div className="text-xs text-muted-foreground">
                                            in {item.details.collectionName}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-1">
                                      {item.type === 'collection' && (
                                        <Badge variant="secondary" className="text-xs">
                                          {item.details?.document_count} docs
                                        </Badge>
                                      )}
                                      {item.type === 'document' && item.details?.chunk_count && (
                                        <Badge variant="outline" className="text-xs">
                                          {item.details.chunk_count} chunks
                                        </Badge>
                                      )}
                                      
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-6 w-6">
                                            <MoreVertical className="h-3 w-3" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => handleQuickAction('view', item)}>
                                            <Eye className="h-4 w-4 mr-2" />
                                            View Details
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleQuickAction('copy', item)}>
                                            <Copy className="h-4 w-4 mr-2" />
                                            Copy Info
                                          </DropdownMenuItem>
                                          {item.type === 'document' && item.details?.url && (
                                            <DropdownMenuItem asChild>
                                              <a href={item.details.url} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="h-4 w-4 mr-2" />
                                                Open Source
                                              </a>
                                            </DropdownMenuItem>
                                          )}
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem 
                                            onClick={() => handleRemoveItem(item)}
                                            className="text-red-600"
                                          >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Remove
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </SortableItem>
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <div className="space-y-2">
                      {selectedItems.map(item => (
                        <Card key={item.id}>
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {item.type === 'collection' ? (
                                  <Folder className="h-4 w-4 text-blue-500" />
                                ) : (
                                  <FileText className="h-4 w-4 text-gray-500" />
                                )}
                                <div>
                                  <div className="font-medium text-sm">{item.name}</div>
                                  {item.type === 'document' && item.details?.collectionName && (
                                    <div className="text-xs text-muted-foreground">
                                      in {item.details.collectionName}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleRemoveItem(item)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>

        {/* Document Browser Modal */}
        <DocumentBrowser
          open={showBrowser}
          onOpenChange={setShowBrowser}
          collections={collections}
          selectedCollectionIds={selectedCollectionIds}
          selectedDocumentIds={selectedDocumentIds}
          onCollectionToggle={onCollectionToggle}
          onDocumentToggle={onDocumentToggle}
          onConfirm={() => setShowBrowser(false)}
        />
      </div>
    </TooltipProvider>
  )
}