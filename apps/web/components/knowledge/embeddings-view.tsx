"use client"

import React, { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Search, Hash, FileText, Copy, Check } from 'lucide-react'
import { knowledgeApi, DocumentEmbeddingsResponse } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

interface EmbeddingsViewProps {
  documentId: string
}

interface ChunkData {
  chunk_id: string
  chunk_index: number
  text: string
  embedding: number[]
  token_count: number
  metadata?: Record<string, any>
}

export function EmbeddingsView({ documentId }: EmbeddingsViewProps) {
  const [embeddings, setEmbeddings] = useState<DocumentEmbeddingsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedChunks, setExpandedChunks] = useState<Set<string>>(new Set())
  const [copiedChunkId, setCopiedChunkId] = useState<string | null>(null)

  useEffect(() => {
    fetchEmbeddings()
  }, [documentId])

  const fetchEmbeddings = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await knowledgeApi.getDocumentEmbeddings(documentId)
      setEmbeddings(response.data)
    } catch (err) {
      console.error('Failed to fetch embeddings:', err)
      setError('Failed to load embeddings. Please try again.')
      toast.error('Failed to load embeddings')
    } finally {
      setLoading(false)
    }
  }

  const toggleChunkExpansion = (chunkId: string) => {
    setExpandedChunks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(chunkId)) {
        newSet.delete(chunkId)
      } else {
        newSet.add(chunkId)
      }
      return newSet
    })
  }

  const copyText = async (text: string, chunkId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedChunkId(chunkId)
      toast.success('Text copied to clipboard')
      setTimeout(() => setCopiedChunkId(null), 2000)
    } catch (err) {
      toast.error('Failed to copy text')
    }
  }

  const filteredChunks = embeddings?.chunks?.filter(chunk => 
    searchQuery === '' || 
    chunk.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chunk.chunk_id.includes(searchQuery)
  ) || []

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">{error}</p>
          <Button onClick={fetchEmbeddings} className="mt-4" variant="outline">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!embeddings || !embeddings.chunks || embeddings.chunks.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">No embeddings found for this document.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Embeddings Overview</span>
            <Badge variant="secondary">
              {embeddings.total_chunks} chunks
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Chunks</p>
              <p className="text-2xl font-bold">{embeddings.total_chunks}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Tokens</p>
              <p className="text-2xl font-bold">{embeddings.total_tokens}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Model</p>
              <p className="text-sm font-mono">{embeddings.embedding_model}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Dimensions</p>
              <p className="text-2xl font-bold">{embeddings.embedding_dimensions}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          type="text"
          placeholder="Search within chunks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Chunks List */}
      <div className="space-y-3">
        {filteredChunks.map((chunk) => {
          const isExpanded = expandedChunks.has(chunk.chunk_id)
          const isCopied = copiedChunkId === chunk.chunk_id
          
          return (
            <Card key={chunk.chunk_id} className="overflow-hidden">
              <CardHeader 
                className="cursor-pointer"
                onClick={() => toggleChunkExpansion(chunk.chunk_id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-sm">
                      Chunk {chunk.chunk_index + 1}
                    </span>
                    <Badge variant="outline" className="ml-2">
                      {chunk.token_count} tokens
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        copyText(chunk.text, chunk.chunk_id)
                      }}
                    >
                      {isCopied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {isExpanded && (
                <CardContent className="space-y-4 border-t">
                  {/* Chunk Text */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Text Content</span>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-md">
                      <p className="text-sm whitespace-pre-wrap">{chunk.text}</p>
                    </div>
                  </div>

                  {/* Embedding Preview */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Embedding Preview (first 10 values)</span>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-md">
                      <code className="text-xs">
                        [{chunk.embedding.slice(0, 10).map(v => v.toFixed(4)).join(', ')}...]
                      </code>
                    </div>
                  </div>

                  {/* Metadata */}
                  {chunk.metadata && Object.keys(chunk.metadata).length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium">Metadata</span>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-md">
                        <pre className="text-xs">
                          {JSON.stringify(chunk.metadata, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Chunk ID */}
                  <div className="text-xs text-muted-foreground">
                    ID: {chunk.chunk_id}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {filteredChunks.length === 0 && searchQuery && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No chunks found matching "{searchQuery}"
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}