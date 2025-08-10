"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft, Folder, Globe, Lock, Edit, Trash2, Plus, FileText, 
  Search, Filter, Settings, Upload, Download, RefreshCw, Copy
} from 'lucide-react'
import { knowledgeApi, CollectionResponse, DocumentResponse } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { CollectionDialog } from '@/components/knowledge/collection-dialog'
import { DocumentUploadDialog } from '@/components/knowledge/document-upload-dialog'

export default function CollectionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const collectionId = params.id as string
  
  const [collection, setCollection] = useState<CollectionResponse | null>(null)
  const [documents, setDocuments] = useState<DocumentResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set())
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState('documents')

  useEffect(() => {
    if (collectionId) {
      fetchCollectionData()
    }
  }, [collectionId])

  const fetchCollectionData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch collection details
      const collectionResponse = await knowledgeApi.getCollection(collectionId)
      setCollection(collectionResponse.data)
      
      // Fetch documents in collection
      const documentsResponse = await knowledgeApi.listDocuments({
        collection_id: collectionId,
        page: 1,
        limit: 100
      })
      setDocuments(documentsResponse.data.documents || [])
    } catch (err) {
      console.error('Failed to fetch collection data:', err)
      setError('Failed to load collection details. Please try again.')
      toast.error('Failed to load collection')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCollection = async () => {
    try {
      setIsDeleting(true)
      await knowledgeApi.deleteCollection(collectionId)
      toast.success('Collection deleted successfully')
      router.push('/knowledge/collections')
    } catch (err) {
      console.error('Failed to delete collection:', err)
      toast.error('Failed to delete collection')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await knowledgeApi.deleteDocument(documentId)
      toast.success('Document removed from collection')
      fetchCollectionData()
    } catch (err) {
      console.error('Failed to delete document:', err)
      toast.error('Failed to delete document')
    }
  }

  const handleBatchDelete = async () => {
    try {
      const promises = Array.from(selectedDocuments).map(id => 
        knowledgeApi.deleteDocument(id)
      )
      await Promise.all(promises)
      toast.success(`${selectedDocuments.size} documents deleted`)
      setSelectedDocuments(new Set())
      fetchCollectionData()
    } catch (err) {
      console.error('Failed to delete documents:', err)
      toast.error('Failed to delete some documents')
    }
  }

  const toggleDocumentSelection = (documentId: string) => {
    const newSelection = new Set(selectedDocuments)
    if (newSelection.has(documentId)) {
      newSelection.delete(documentId)
    } else {
      newSelection.add(documentId)
    }
    setSelectedDocuments(newSelection)
  }

  const toggleAllDocuments = () => {
    if (selectedDocuments.size === filteredDocuments.length) {
      setSelectedDocuments(new Set())
    } else {
      setSelectedDocuments(new Set(filteredDocuments.map(d => d.id)))
    }
  }

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A'
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
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

  if (error || !collection) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive mb-4">{error || 'Collection not found'}</p>
            <div className="flex gap-3">
              <Button onClick={() => router.push('/knowledge/collections')} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Collections
              </Button>
              <Button onClick={fetchCollectionData} variant="outline">
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
          onClick={() => router.push('/knowledge/collections')}
          variant="ghost"
          size="sm"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Collections
        </Button>
        
        <div className="flex gap-2">
          <Button
            onClick={() => setShowEditDialog(true)}
            variant="outline"
            size="sm"
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={isDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Collection
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the collection
                  "{collection.name}" and all its documents.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteCollection} 
                  className="bg-destructive text-destructive-foreground"
                >
                  Delete Collection
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Collection Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Folder className="h-6 w-6" />
                {collection.name}
              </CardTitle>
              {collection.description && (
                <CardDescription>{collection.description}</CardDescription>
              )}
            </div>
            <div className="flex gap-2">
              <Badge variant={collection.is_public ? 'default' : 'secondary'}>
                {collection.is_public ? (
                  <>
                    <Globe className="mr-1 h-3 w-3" />
                    Public
                  </>
                ) : (
                  <>
                    <Lock className="mr-1 h-3 w-3" />
                    Private
                  </>
                )}
              </Badge>
              {collection.type && (
                <Badge variant="outline">{collection.type}</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Collection ID</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-xs">{collection.id.slice(0, 8)}...</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(collection.id)
                    toast.success('Collection ID copied')
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Documents</p>
              <p className="font-medium">{collection.document_count || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Embedding Model</p>
              <p className="font-medium text-sm">{collection.embedding_model}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="text-sm">{formatDate(collection.created_at)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="documents">
            <FileText className="mr-2 h-4 w-4" />
            Documents ({documents.length})
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          {/* Documents Toolbar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              {selectedDocuments.size > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete ({selectedDocuments.size})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete selected documents?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete {selectedDocuments.size} selected document(s).
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleBatchDelete}
                        className="bg-destructive text-destructive-foreground"
                      >
                        Delete Documents
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button onClick={() => setShowUploadDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Document
              </Button>
            </div>
          </div>

          {/* Documents Table */}
          {filteredDocuments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No documents found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchQuery
                    ? 'Try adjusting your search criteria'
                    : 'This collection is empty. Add your first document to get started.'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setShowUploadDialog(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Document
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedDocuments.size === filteredDocuments.length && filteredDocuments.length > 0}
                        onCheckedChange={toggleAllDocuments}
                      />
                    </TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((document) => (
                    <TableRow key={document.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedDocuments.has(document.id)}
                          onCheckedChange={() => toggleDocumentSelection(document.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => router.push(`/knowledge/${document.id}`)}
                          className="font-medium hover:underline text-left"
                        >
                          {document.title}
                        </button>
                        {document.description && (
                          <p className="text-sm text-muted-foreground">{document.description}</p>
                        )}
                      </TableCell>
                      <TableCell>{document.file_type || 'Text'}</TableCell>
                      <TableCell>{formatFileSize(document.file_size)}</TableCell>
                      <TableCell>
                        <Badge variant={document.status === 'processed' ? 'default' : 'secondary'}>
                          {document.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(document.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              ⋮
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => router.push(`/knowledge/${document.id}`)}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            {document.file_url && (
                              <DropdownMenuItem
                                onClick={() => window.open(document.file_url, '_blank')}
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteDocument(document.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Collection Settings</CardTitle>
              <CardDescription>
                Manage collection configuration and metadata
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Metadata</h4>
                {collection.metadata && Object.keys(collection.metadata).length > 0 ? (
                  <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                    {JSON.stringify(collection.metadata, null, 2)}
                  </pre>
                ) : (
                  <p className="text-muted-foreground">No metadata configured for this collection.</p>
                )}
              </div>
              
              <div className="pt-4">
                <Button onClick={() => setShowEditDialog(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  Edit Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      {showEditDialog && (
        <CollectionDialog
          open={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          onSuccess={() => {
            setShowEditDialog(false)
            fetchCollectionData()
          }}
          collection={collection}
        />
      )}

      {/* Upload Dialog */}
      {showUploadDialog && (
        <DocumentUploadDialog
          open={showUploadDialog}
          onClose={() => setShowUploadDialog(false)}
          onSuccess={() => {
            setShowUploadDialog(false)
            fetchCollectionData()
          }}
          collectionId={collectionId}
        />
      )}
    </div>
  )
}