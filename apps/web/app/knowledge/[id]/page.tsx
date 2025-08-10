"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, FileText, Database, Hash, Download, Trash2, RefreshCw } from 'lucide-react'
import { knowledgeApi, DocumentResponse } from '@/lib/api-client'
import { EmbeddingsView } from '@/components/knowledge/embeddings-view'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function DocumentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const documentId = params.id as string
  
  const [document, setDocument] = useState<DocumentResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (documentId) {
      fetchDocument()
    }
  }, [documentId])

  const fetchDocument = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await knowledgeApi.getDocument(documentId)
      setDocument(response.data)
    } catch (err) {
      console.error('Failed to fetch document:', err)
      setError('Failed to load document details. Please try again.')
      toast.error('Failed to load document')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      await knowledgeApi.deleteDocument(documentId)
      toast.success('Document deleted successfully')
      router.push('/knowledge')
    } catch (err) {
      console.error('Failed to delete document:', err)
      toast.error('Failed to delete document')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDownload = () => {
    if (document?.file_url) {
      window.open(document.file_url, '_blank')
    } else {
      toast.error('Download URL not available')
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A'
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (error || !document) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive mb-4">{error || 'Document not found'}</p>
            <div className="flex gap-3">
              <Button onClick={() => router.push('/knowledge')} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Knowledge
              </Button>
              <Button onClick={fetchDocument} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          onClick={() => router.push('/knowledge')}
          variant="ghost"
          size="sm"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Knowledge
        </Button>
        
        <div className="flex gap-2">
          <Button
            onClick={handleDownload}
            variant="outline"
            size="sm"
            disabled={!document.file_url}
          >
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={isDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the document
                  "{document.title}" and all its embeddings from the knowledge base.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                  Delete Document
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Document Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl flex items-center gap-2">
                <FileText className="h-6 w-6" />
                {document.title}
              </CardTitle>
              {document.description && (
                <CardDescription>{document.description}</CardDescription>
              )}
            </div>
            <Badge variant={document.status === 'processed' ? 'default' : 'secondary'}>
              {document.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Document ID</p>
              <p className="font-mono text-xs">{document.id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">File Type</p>
              <p className="font-medium">{document.file_type || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">File Size</p>
              <p className="font-medium">{formatFileSize(document.file_size)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Collection</p>
              <p className="font-medium">{document.collection_id || 'Default'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="text-sm">{formatDate(document.created_at)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Updated</p>
              <p className="text-sm">{formatDate(document.updated_at)}</p>
            </div>
            {document.chunk_count !== undefined && (
              <div>
                <p className="text-sm text-muted-foreground">Chunks</p>
                <p className="font-medium">{document.chunk_count}</p>
              </div>
            )}
            {document.token_count !== undefined && (
              <div>
                <p className="text-sm text-muted-foreground">Tokens</p>
                <p className="font-medium">{document.token_count}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Document Content and Embeddings */}
      <Tabs defaultValue="content" className="space-y-4">
        <TabsList>
          <TabsTrigger value="content">
            <FileText className="mr-2 h-4 w-4" />
            Content
          </TabsTrigger>
          <TabsTrigger value="embeddings">
            <Hash className="mr-2 h-4 w-4" />
            Embeddings
          </TabsTrigger>
          <TabsTrigger value="metadata">
            <Database className="mr-2 h-4 w-4" />
            Metadata
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Content</CardTitle>
              <CardDescription>
                The extracted text content from your document
              </CardDescription>
            </CardHeader>
            <CardContent>
              {document.content ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <pre className="whitespace-pre-wrap bg-muted p-4 rounded-lg text-sm">
                    {document.content}
                  </pre>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Content preview not available. The document has been processed and embeddings have been generated.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="embeddings" className="space-y-4">
          <EmbeddingsView documentId={documentId} />
        </TabsContent>

        <TabsContent value="metadata" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Metadata</CardTitle>
              <CardDescription>
                Additional information and properties stored with this document
              </CardDescription>
            </CardHeader>
            <CardContent>
              {document.metadata && Object.keys(document.metadata).length > 0 ? (
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  {JSON.stringify(document.metadata, null, 2)}
                </pre>
              ) : (
                <p className="text-muted-foreground">No metadata available for this document.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}