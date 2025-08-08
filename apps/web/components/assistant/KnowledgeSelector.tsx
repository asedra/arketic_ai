"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Document {
  id: string
  title: string
  source_type: string
  file_name?: string
  chunk_count?: number
  token_count?: number
}

interface Collection {
  id: string
  name: string
  description?: string
  type: string
  document_count: number
  is_public: boolean
  documents: Document[]
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
}

export function KnowledgeSelector({
  collections,
  selectedCollectionIds,
  selectedDocumentIds,
  onCollectionToggle,
  onDocumentToggle,
  onSelectAll,
  onClearAll,
  className
}: KnowledgeSelectorProps) {
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')

  // Calculate selection counts
  const selectedCounts = useMemo(() => {
    const totalCollections = selectedCollectionIds.length
    const totalDocuments = selectedDocumentIds.length
    return { totalCollections, totalDocuments }
  }, [selectedCollectionIds, selectedDocumentIds])

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

  return (
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
          </div>
          
          <div className="flex items-center gap-2">
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

      {/* Tree view */}
      <ScrollArea className="flex-1 border rounded-lg">
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
                        collection.documents.map(document => (
                          <div
                            key={document.id}
                            className="flex items-center gap-2 p-2 hover:bg-accent/50 rounded-lg transition-colors"
                          >
                            <Checkbox
                              checked={selectedDocumentIds.includes(document.id)}
                              onCheckedChange={() => onDocumentToggle(document.id)}
                              className="ml-8"
                            />
                            
                            <FileText className="h-4 w-4 text-gray-500" />
                            
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
                        ))
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
    </div>
  )
}