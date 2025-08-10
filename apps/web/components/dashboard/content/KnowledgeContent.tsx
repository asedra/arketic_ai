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
  Zap,
  MessageSquare,
  Download,
  Trash2,
  Eye,
  Tag,
  Calendar,
  Users,
  Database,
  Copy,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useArketicStore } from '@/lib/state-manager'
import { knowledgeApi, DocumentResponse, DocumentEmbeddingsResponse, CollectionResponse, UploadTextDocumentRequest, SearchRequest, RAGQueryRequest, CollectionRequest } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface KnowledgeContentProps {
  className?: string
}

const KnowledgeContent = memo(function KnowledgeContent({ className }: KnowledgeContentProps) {
  const viewMode = useArketicStore(state => state.viewMode)
  const searchQuery = useArketicStore(state => state.searchQuery)
  const { toast } = useToast()
  
  // State management
  const [documents, setDocuments] = useState<DocumentResponse[]>([])
  const [collections, setCollections] = useState<CollectionResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [fileUploadStatuses, setFileUploadStatuses] = useState<{ name: string; progress: number; status: 'pending' | 'uploading' | 'done' | 'error' }[]>([])
  const [activeTab, setActiveTab] = useState('documents')
  
  // Dialog states
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showTextDialog, setShowTextDialog] = useState(false)
  const [showCollectionDialog, setShowCollectionDialog] = useState(false)
  const [showSearchDialog, setShowSearchDialog] = useState(false)
  const [showRAGDialog, setShowRAGDialog] = useState(false)
  const [showDocumentDetailDialog, setShowDocumentDetailDialog] = useState(false)
  
  // Form states
  const [textDocument, setTextDocument] = useState<UploadTextDocumentRequest>({
    title: '',
    content: '',
    description: '',
    tags: [],
    collection_id: 'none'
  })
  const [newCollection, setNewCollection] = useState<CollectionRequest>({
    name: '',
    description: ''
  })
  const [localSearchQuery, setLocalSearchQuery] = useState('')
  const [ragQuery, setRagQuery] = useState('')
  const [selectedCollection, setSelectedCollection] = useState<string>('')
  const [searchResults, setSearchResults] = useState<DocumentResponse[]>([])
  const [ragResponse, setRagResponse] = useState<{ answer: string; sources: DocumentResponse[] } | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<DocumentResponse | null>(null)
  const [documentEmbeddings, setDocumentEmbeddings] = useState<DocumentEmbeddingsResponse | null>(null)
  const [documentLoading, setDocumentLoading] = useState(false)
  const [embeddingsLoading, setEmbeddingsLoading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [documentDetailTab, setDocumentDetailTab] = useState('content')
  
  
  // Fetch documents
  const fetchDocuments = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await knowledgeApi.listDocuments()
      console.log('Documents API response:', response)
      
      if (response.data) {
        // Handle different response structures
        let documentsData = []
        if (response.data.documents) {
          // Response has documents array nested
          documentsData = Array.isArray(response.data.documents) ? response.data.documents : []
        } else if (Array.isArray(response.data)) {
          // Response data is directly an array
          documentsData = response.data
        } else {
          // Response data is a single document
          documentsData = [response.data]
        }
        
        console.log('Setting documents:', documentsData)
        setDocuments(documentsData)
        
        if (documentsData.length > 0) {
          toast({
            title: "Documents loaded successfully!",
            description: `Found ${documentsData.length} documents in your knowledge base.`
          })
        }
      }
    } catch (err) {
      console.error('Error fetching documents:', err)
      setError('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }
  
  // Fetch collections
  const fetchCollections = async () => {
    try {
      const response = await knowledgeApi.listCollections()
      console.log('Collections API response:', response)
      
      if (response.data) {
        // Handle different response structures
        let collectionsData = []
        if (response.data.collections) {
          // Response has collections array nested
          collectionsData = Array.isArray(response.data.collections) ? response.data.collections : []
        } else if (Array.isArray(response.data)) {
          // Response data is directly an array
          collectionsData = response.data
        } else {
          // Response data is a single collection
          collectionsData = [response.data]
        }
        
        console.log('Setting collections:', collectionsData)
        setCollections(collectionsData)
      }
    } catch (err) {
      console.error('Error fetching collections:', err)
    }
  }
  
  // Handle file upload (supports multiple files)
  const handleFileUpload = async (files: FileList) => {
    if (!files || files.length === 0) return
    
    setUploading(true)
    setUploadProgress(0)
    setUploadSuccess(false)
    
    // Initialize file upload statuses
    const initialStatuses = Array.from(files).map(file => ({
      name: file.name,
      progress: 0,
      status: 'pending' as const
    }))
    setFileUploadStatuses(initialStatuses)
    
    // Show upload started notification
    const fileCount = files.length
    const totalSize = Array.from(files).reduce((sum, file) => sum + file.size, 0)
    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2)
    
    toast({
      title: "Upload started",
      description: `Processing ${fileCount} file${fileCount > 1 ? 's' : ''} (${totalSizeMB} MB total)...`,
    })
    
    try {
      const uploadPromises = []
      const fileResults: { name: string; success: boolean; error?: string }[] = []
      
      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fileSizeInMB = (file.size / (1024 * 1024)).toFixed(2)
        
        // Validate file size (10MB limit per file)
        if (file.size > 10 * 1024 * 1024) {
          fileResults.push({
            name: file.name,
            success: false,
            error: `File size (${fileSizeInMB} MB) exceeds 10MB limit`
          })
          continue
        }
        
        // Validate file type
        const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.md']
        const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()
        if (!allowedTypes.includes(fileExt)) {
          fileResults.push({
            name: file.name,
            success: false,
            error: `File type ${fileExt} is not supported`
          })
          continue
        }
        
        // Create upload promise for this file
        const uploadPromise = (async () => {
          try {
            // Update status to uploading
            setFileUploadStatuses(prev => prev.map((status, idx) => 
              idx === i ? { ...status, status: 'uploading' } : status
            ))
            
            const uploadOptions: any = {
              description: `Uploaded file: ${file.name}`,
              onProgress: (progress: number) => {
                // Update individual file progress
                setFileUploadStatuses(prev => prev.map((status, idx) => 
                  idx === i ? { ...status, progress } : status
                ))
                
                // Update overall progress based on file count
                const fileProgress = (i * 100 + progress) / files.length
                setUploadProgress(fileProgress)
              }
            }
            
            if (selectedCollection && selectedCollection !== 'none' && selectedCollection !== '') {
              uploadOptions.collection_id = selectedCollection
            }
            
            const response = await knowledgeApi.uploadFile(file, uploadOptions)
            
            if (response.data) {
              // Update status to done
              setFileUploadStatuses(prev => prev.map((status, idx) => 
                idx === i ? { ...status, status: 'done', progress: 100 } : status
              ))
              
              fileResults.push({
                name: file.name,
                success: true
              })
              return response.data
            }
          } catch (err: any) {
            console.error(`Upload error for ${file.name}:`, err)
            
            // Update status to error
            setFileUploadStatuses(prev => prev.map((status, idx) => 
              idx === i ? { ...status, status: 'error' } : status
            ))
            
            fileResults.push({
              name: file.name,
              success: false,
              error: err.message || 'Unknown error'
            })
            return null
          }
        })()
        
        uploadPromises.push(uploadPromise)
      }
      
      // Wait for all uploads to complete
      const results = await Promise.all(uploadPromises)
      const successfulUploads = results.filter(r => r !== null)
      
      if (successfulUploads.length > 0) {
        setUploadSuccess(true)
        
        // Show summary notification
        const successCount = fileResults.filter(r => r.success).length
        const failCount = fileResults.filter(r => !r.success).length
        
        let description = `Successfully uploaded ${successCount} file${successCount > 1 ? 's' : ''}.`
        if (failCount > 0) {
          description += `\n${failCount} file${failCount > 1 ? 's' : ''} failed.`
          
          // Show details of failed files
          const failedFiles = fileResults.filter(r => !r.success)
          failedFiles.forEach(f => {
            toast({
              title: `Failed: ${f.name}`,
              description: f.error,
              variant: "destructive"
            })
          })
        }
        
        toast({
          title: "Upload complete!",
          description,
        })
        
        // Close dialog after short delay to show success state
        setTimeout(() => {
          setShowUploadDialog(false)
          setUploadSuccess(false)
          setFileUploadStatuses([])
        }, 2000)
        
        await fetchDocuments()
        
        // Show celebration for successful upload
        if (successCount > 0) {
          setShowSuccess(true)
          setTimeout(() => setShowSuccess(false), 3000)
        }
      } else {
        // All uploads failed
        toast({
          title: "Upload failed",
          description: "No files were uploaded successfully. Please check the errors and try again.",
          variant: "destructive"
        })
      }
    } catch (err: any) {
      console.error('Upload error:', err)
      toast({
        title: "Upload failed",
        description: err.message || "An unexpected error occurred",
        variant: "destructive"
      })
      setUploadProgress(0)
    } finally {
      setUploading(false)
    }
  }

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleFileUpload(files)
    }
  }
  
  // Handle text document creation
  const handleTextDocumentCreate = async () => {
    if (!textDocument.title || !textDocument.content) {
      toast({
        title: "Validation error",
        description: "Title and content are required.",
        variant: "destructive"
      })
      return
    }
    
    setUploading(true)
    
    try {
      const documentToUpload = {
        ...textDocument,
        collection_id: textDocument.collection_id === 'none' ? undefined : textDocument.collection_id
      }
      const response = await knowledgeApi.uploadTextDocument(documentToUpload)
      
      if (response.data) {
        toast({
          title: "Document created successfully!",
          description: `${textDocument.title} has been added to your knowledge base.`
        })
        setShowTextDialog(false)
        setTextDocument({ title: '', content: '', description: '', tags: [], collection_id: 'none' })
        await fetchDocuments()
      }
    } catch (err: any) {
      toast({
        title: "Creation failed",
        description: err.message || "Unable to create document. Please try again.",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
    }
  }
  
  // Handle collection creation
  const handleCollectionCreate = async () => {
    if (!newCollection.name) {
      toast({
        title: "Validation error",
        description: "Collection name is required.",
        variant: "destructive"
      })
      return
    }
    
    try {
      const response = await knowledgeApi.createCollection(newCollection)
      
      if (response.data) {
        toast({
          title: "Collection created successfully!",
          description: `${newCollection.name} collection has been created.`
        })
        setShowCollectionDialog(false)
        setNewCollection({ name: '', description: '' })
        await fetchCollections()
      }
    } catch (err: any) {
      toast({
        title: "Creation failed",
        description: err.message || "Unable to create collection. Please try again.",
        variant: "destructive"
      })
    }
  }
  
  // Handle document search
  const handleSearch = async () => {
    if (!localSearchQuery.trim()) return
    
    setLoading(true)
    try {
      const response = await knowledgeApi.searchDocuments({
        query: localSearchQuery,
        collection_id: selectedCollection && selectedCollection !== 'none' ? selectedCollection : undefined,
        limit: 20
      })
      
      if (response.data) {
        setSearchResults(Array.isArray(response.data) ? response.data : [])
        toast({
          title: "Search completed!",
          description: `Found ${response.data.length} matching documents.`
        })
      }
    } catch (err: any) {
      toast({
        title: "Search failed",
        description: err.message || "Unable to search documents. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }
  
  // Handle RAG query
  const handleRAGQuery = async () => {
    if (!ragQuery.trim()) return
    
    setLoading(true)
    try {
      const response = await knowledgeApi.ragQuery({
        question: ragQuery,
        collection_id: selectedCollection && selectedCollection !== 'none' ? selectedCollection : undefined,
        limit: 10
      })
      
      if (response.data) {
        setRagResponse(response.data)
        toast({
          title: "Query completed!",
          description: "AI has generated an answer based on your knowledge base."
        })
      }
    } catch (err: any) {
      toast({
        title: "Query failed",
        description: err.message || "Unable to process query. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }
  
  // Handle document viewing
  const handleViewDocument = async (documentId: string) => {
    setDocumentLoading(true)
    setDocumentDetailTab('content') // Reset to content tab
    setDocumentEmbeddings(null) // Clear previous embeddings
    
    try {
      const response = await knowledgeApi.getDocument(documentId)
      if (response.data) {
        setSelectedDocument(response.data)
        setShowDocumentDetailDialog(true)
        
        // Fetch embeddings in the background
        fetchDocumentEmbeddings(documentId)
      }
    } catch (err: any) {
      toast({
        title: "Failed to load document",
        description: err.message || "Unable to load document details. Please try again.",
        variant: "destructive"
      })
    } finally {
      setDocumentLoading(false)
    }
  }
  
  // Fetch document embeddings
  const fetchDocumentEmbeddings = async (documentId: string) => {
    setEmbeddingsLoading(true)
    try {
      const response = await knowledgeApi.getDocumentEmbeddings(documentId)
      if (response.data) {
        setDocumentEmbeddings(response.data)
      }
    } catch (err: any) {
      console.error('Failed to load embeddings:', err)
      // Don't show error toast, embeddings are optional
    } finally {
      setEmbeddingsLoading(false)
    }
  }

  // Handle document deletion
  const handleDocumentDelete = async (documentId: string) => {
    try {
      await knowledgeApi.deleteDocument(documentId)
      toast({
        title: "Document deleted!",
        description: "Document has been removed from your knowledge base."
      })
      await fetchDocuments()
    } catch (err: any) {
      toast({
        title: "Deletion failed",
        description: err.message || "Unable to delete document. Please try again.",
        variant: "destructive"
      })
    }
  }
  
  // Load data on mount
  useEffect(() => {
    fetchDocuments()
    fetchCollections()
  }, [])
  
  // Filter documents based on search
  const filteredDocuments = documents.filter(doc => 
    !searchQuery || doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size'
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return '1 day ago'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }
  
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
          fetchDocuments()
          fetchCollections()
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
            {filteredDocuments.length} documents
          </Badge>
          <Badge variant="secondary" className="animate-fade-in-scale">
            {collections.length} collections
          </Badge>
          {uploading && (
            <div className="flex items-center space-x-2 text-blue-600">
              <Upload className="h-4 w-4 animate-spin" />
              <span className="text-sm">Processing...</span>
            </div>
          )}
          {documentLoading && (
            <div className="flex items-center space-x-2 text-green-600">
              <Eye className="h-4 w-4 animate-pulse" />
              <span className="text-sm">Loading document...</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dialog open={showTextDialog} onOpenChange={setShowTextDialog}>
                <DialogTrigger asChild>
                  <DelightfulButton
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    glow
                    bounce
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Text
                  </DelightfulButton>
                </DialogTrigger>
              </Dialog>
              
              <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                <DialogTrigger asChild>
                  <DelightfulButton
                    variant="outline"
                    size="sm"
                    ripple
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Upload File
                  </DelightfulButton>
                </DialogTrigger>
              </Dialog>
              
              <Dialog open={showCollectionDialog} onOpenChange={setShowCollectionDialog}>
                <DialogTrigger asChild>
                  <DelightfulButton variant="outline" size="sm" bounce>
                    <FolderPlus className="h-4 w-4 mr-1" />
                    New Collection
                  </DelightfulButton>
                </DialogTrigger>
              </Dialog>
              
              <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
                <DialogTrigger asChild>
                  <DelightfulButton variant="outline" size="sm" ripple>
                    <Search className="h-4 w-4 mr-1" />
                    Search
                  </DelightfulButton>
                </DialogTrigger>
              </Dialog>
              
              <Dialog open={showRAGDialog} onOpenChange={setShowRAGDialog}>
                <DialogTrigger asChild>
                  <DelightfulButton variant="outline" size="sm" glow>
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Ask AI
                  </DelightfulButton>
                </DialogTrigger>
              </Dialog>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Filter documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
      
      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documents ({filteredDocuments.length})
          </TabsTrigger>
          <TabsTrigger value="collections" className="flex items-center gap-2">
            <Folder className="h-4 w-4" />
            Collections ({collections.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <DelightfulLoading 
                    type="knowledge" 
                    message="Loading documents..."
                  />
                  <SkeletonLoader type={viewMode === 'grid' ? 'card' : 'list'} />
                </div>
              ) : filteredDocuments.length === 0 ? (
                <DelightfulEmptyState
                  type={searchQuery ? 'search' : 'knowledge'}
                  title={searchQuery ? 'No matching documents' : 'No documents yet'}
                  description={searchQuery ? 'Try adjusting your search terms.' : 'Upload your first document or create a text document to get started.'}
                  actionLabel={searchQuery ? 'Clear search' : 'Add document'}
                  onAction={() => {
                    if (searchQuery) {
                      setSearchQuery('')
                    } else {
                      setShowTextDialog(true)
                    }
                  }}
                />
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredDocuments.map((doc, index) => (
                    <div 
                      key={doc.id} 
                      className={cn(
                        "group border rounded-lg p-4 cursor-pointer transition-all duration-200",
                        "hover:bg-slate-50 dark:hover:bg-slate-800 hover:shadow-md hover-lift",
                        "animate-fade-in-scale",
                        `stagger-${Math.min(index + 1, 5)}`
                      )}
                      onClick={() => handleViewDocument(doc.id)}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="h-5 w-5 text-slate-500 group-hover:animate-wiggle" />
                        <span className="font-medium text-slate-900 dark:text-slate-100 truncate flex-1">
                          {doc.title}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewDocument(doc.id)
                            }}
                            disabled={documentLoading}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDocumentDelete(doc.id)
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400 mb-2 line-clamp-2">
                        {doc.description || 'No description'}
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>{formatDate(doc.updated_at)}</span>
                      </div>
                      {doc.tags && doc.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {doc.tags.slice(0, 2).map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {doc.tags.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{doc.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredDocuments.map((doc, index) => (
                    <div 
                      key={doc.id} 
                      className={cn(
                        "group flex items-center justify-between p-3 border rounded-lg cursor-pointer",
                        "hover:bg-slate-50 dark:hover:bg-slate-800 hover:shadow-sm hover-lift",
                        "transition-all duration-200 animate-slide-in-up",
                        `stagger-${Math.min(index + 1, 5)}`
                      )}
                      onClick={() => handleViewDocument(doc.id)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <FileText className="h-5 w-5 text-slate-500 group-hover:animate-wiggle flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                              {doc.title}
                            </p>
                            {doc.tags && doc.tags.length > 0 && (
                              <div className="flex gap-1">
                                {doc.tags.slice(0, 3).map((tag, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                            {doc.description || 'No description'} • {formatFileSize(doc.file_size)} • {formatDate(doc.updated_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleViewDocument(doc.id)
                          }}
                          disabled={documentLoading}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-500 hover:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDocumentDelete(doc.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="collections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Collections</CardTitle>
            </CardHeader>
            <CardContent>
              {collections.length === 0 ? (
                <DelightfulEmptyState
                  type="knowledge"
                  title="No collections yet"
                  description="Create collections to organize your documents by topic, project, or any other criteria."
                  actionLabel="Create collection"
                  onAction={() => setShowCollectionDialog(true)}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {collections.map((collection, index) => (
                    <div 
                      key={collection.id}
                      className={cn(
                        "group border rounded-lg p-4 cursor-pointer transition-all duration-200",
                        "hover:bg-slate-50 dark:hover:bg-slate-800 hover:shadow-md hover-lift",
                        "animate-fade-in-scale",
                        `stagger-${Math.min(index + 1, 5)}`
                      )}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <Database className="h-5 w-5 text-blue-500 group-hover:animate-wiggle" />
                        <span className="font-medium text-slate-900 dark:text-slate-100 truncate flex-1">
                          {collection.name}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {collection.document_count}
                        </Badge>
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                        {collection.description || 'No description'}
                      </div>
                      <div className="text-xs text-slate-400">
                        Created {formatDate(collection.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Upload Text Document Dialog */}
      <Dialog open={showTextDialog} onOpenChange={setShowTextDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Text Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={textDocument.title}
                onChange={(e) => setTextDocument({ ...textDocument, title: e.target.value })}
                placeholder="Enter document title"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={textDocument.description}
                onChange={(e) => setTextDocument({ ...textDocument, description: e.target.value })}
                placeholder="Enter description (optional)"
              />
            </div>
            <div>
              <Label htmlFor="collection">Collection</Label>
              <Select 
                value={textDocument.collection_id} 
                onValueChange={(value) => setTextDocument({ ...textDocument, collection_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a collection (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No collection</SelectItem>
                  {collections.map((collection) => (
                    <SelectItem key={collection.id} value={collection.id}>
                      {collection.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={textDocument.content}
                onChange={(e) => setTextDocument({ ...textDocument, content: e.target.value })}
                placeholder="Enter document content"
                className="min-h-[200px]"
              />
            </div>
            <div>
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                value={textDocument.tags?.join(', ') || ''}
                onChange={(e) => setTextDocument({ 
                  ...textDocument, 
                  tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                })}
                placeholder="tag1, tag2, tag3"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowTextDialog(false)}>
                Cancel
              </Button>
              <DelightfulButton
                onClick={handleTextDocumentCreate}
                loading={uploading}
                loadingText="Creating..."
                disabled={!textDocument.title || !textDocument.content}
              >
                Create Document
              </DelightfulButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Upload File Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document File</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="collection-select">Collection</Label>
              <Select value={selectedCollection} onValueChange={setSelectedCollection}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a collection (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No collection</SelectItem>
                  {collections.map((collection) => (
                    <SelectItem key={collection.id} value={collection.id}>
                      {collection.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div 
              className={cn(
                "border-2 border-dashed rounded-lg p-6 transition-all duration-200",
                isDragOver 
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-105" 
                  : "border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500",
                uploading && "pointer-events-none opacity-50"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                accept=".pdf,.doc,.docx,.txt,.md"
                disabled={uploading}
                multiple
              />
              <label
                htmlFor="file-upload"
                className={cn(
                  "flex flex-col items-center justify-center cursor-pointer",
                  uploading && "cursor-not-allowed"
                )}
              >
                <Upload className={cn(
                  "h-12 w-12 mb-2 transition-all duration-200",
                  isDragOver 
                    ? "text-blue-500 animate-bounce" 
                    : "text-slate-400"
                )} />
                <span className={cn(
                  "text-sm font-medium transition-colors duration-200",
                  isDragOver 
                    ? "text-blue-700 dark:text-blue-300" 
                    : "text-slate-700 dark:text-slate-300"
                )}>
                  {isDragOver ? "Drop your files here!" : "Click to upload or drag and drop"}
                </span>
                <span className="text-xs text-slate-500 mt-1">
                  Multiple files supported • PDF, DOC, DOCX, TXT, MD • Max 10MB per file
                </span>
              </label>
            </div>
            {uploading && (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Upload className="h-4 w-4 animate-spin" />
                    {uploadSuccess ? "Processing completed!" : "Uploading..."}
                  </span>
                  <span className="font-medium">
                    {uploadSuccess ? "100%" : `${Math.round(uploadProgress)}%`}
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                  <div 
                    className={cn(
                      "h-3 rounded-full transition-all duration-300",
                      uploadSuccess 
                        ? "bg-green-600 animate-pulse" 
                        : "bg-blue-600"
                    )}
                    style={{ width: uploadSuccess ? "100%" : `${uploadProgress}%` }}
                  />
                </div>
                
                {/* Individual file progress */}
                {fileUploadStatuses.length > 1 && (
                  <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">Individual Files:</div>
                    {fileUploadStatuses.map((fileStatus, idx) => (
                      <div key={idx} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="truncate flex-1 mr-2">{fileStatus.name}</span>
                          <span className={cn(
                            "font-medium",
                            fileStatus.status === 'done' && "text-green-600",
                            fileStatus.status === 'error' && "text-red-600",
                            fileStatus.status === 'uploading' && "text-blue-600",
                            fileStatus.status === 'pending' && "text-slate-400"
                          )}>
                            {fileStatus.status === 'done' && "✓"}
                            {fileStatus.status === 'error' && "✗"}
                            {fileStatus.status === 'uploading' && `${Math.round(fileStatus.progress)}%`}
                            {fileStatus.status === 'pending' && "Waiting"}
                          </span>
                        </div>
                        {fileStatus.status === 'uploading' && (
                          <div className="mt-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1">
                            <div 
                              className="h-1 bg-blue-600 rounded-full transition-all duration-300"
                              style={{ width: `${fileStatus.progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {uploadSuccess && (
                  <div className="text-center text-sm text-green-600 font-medium animate-fade-in">
                    ✅ Upload successful! Closing in 2 seconds...
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Create Collection Dialog */}
      <Dialog open={showCollectionDialog} onOpenChange={setShowCollectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="collection-name">Name *</Label>
              <Input
                id="collection-name"
                value={newCollection.name}
                onChange={(e) => setNewCollection({ ...newCollection, name: e.target.value })}
                placeholder="Enter collection name"
              />
            </div>
            <div>
              <Label htmlFor="collection-description">Description</Label>
              <Textarea
                id="collection-description"
                value={newCollection.description}
                onChange={(e) => setNewCollection({ ...newCollection, description: e.target.value })}
                placeholder="Enter collection description (optional)"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCollectionDialog(false)}>
                Cancel
              </Button>
              <DelightfulButton
                onClick={handleCollectionCreate}
                disabled={!newCollection.name}
              >
                Create Collection
              </DelightfulButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Search Dialog */}
      <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Semantic Search</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  value={localSearchQuery}
                  onChange={(e) => setLocalSearchQuery(e.target.value)}
                  placeholder="Enter your search query..."
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Select value={selectedCollection} onValueChange={setSelectedCollection}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All collections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All collections</SelectItem>
                  {collections.map((collection) => (
                    <SelectItem key={collection.id} value={collection.id}>
                      {collection.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DelightfulButton onClick={handleSearch} loading={loading}>
                <Search className="h-4 w-4 mr-1" />
                Search
              </DelightfulButton>
            </div>
            
            {searchResults.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Search Results ({searchResults.length})</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {searchResults.map((doc) => (
                    <div key={doc.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-900 dark:text-slate-100">
                            {doc.title}
                          </h4>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {doc.description || 'No description'}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                            <Calendar className="h-3 w-3" />
                            {formatDate(doc.updated_at)}
                            {doc.file_size && (
                              <>
                                <span>•</span>
                                {formatFileSize(doc.file_size)}
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewDocument(doc.id)
                            }}
                            disabled={documentLoading}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* RAG Query Dialog */}
      <Dialog open={showRAGDialog} onOpenChange={setShowRAGDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Ask AI about your Knowledge Base</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Textarea
                  value={ragQuery}
                  onChange={(e) => setRagQuery(e.target.value)}
                  placeholder="Ask a question about your documents..."
                  className="min-h-[100px]"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedCollection} onValueChange={setSelectedCollection}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All collections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All collections</SelectItem>
                  {collections.map((collection) => (
                    <SelectItem key={collection.id} value={collection.id}>
                      {collection.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DelightfulButton 
                onClick={handleRAGQuery} 
                loading={loading}
                disabled={!ragQuery.trim()}
                glow
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                Ask AI
              </DelightfulButton>
            </div>
            
            {ragResponse && (
              <div className="mt-6 space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-2 text-blue-900 dark:text-blue-100">
                    AI Answer
                  </h3>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {ragResponse.answer}
                  </p>
                </div>
                
                {ragResponse.sources.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Sources ({ragResponse.sources.length})</h3>
                    <div className="space-y-2">
                      {ragResponse.sources.map((doc) => (
                        <div key={doc.id} className="border rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-slate-900 dark:text-slate-100">
                                {doc.title}
                              </h4>
                              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                {doc.description || 'No description'}
                              </p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewDocument(doc.id)
                              }}
                              disabled={documentLoading}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Document Detail Dialog */}
      <Dialog open={showDocumentDetailDialog} onOpenChange={setShowDocumentDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Document Details</span>
              <div className="flex items-center gap-2">
                {selectedDocument?.content && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedDocument?.content) {
                        navigator.clipboard.writeText(selectedDocument.content)
                        toast({
                          title: "Copied!",
                          description: "Document content copied to clipboard."
                        })
                      }
                    }}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDocumentDetailDialog(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {documentLoading ? (
            <div className="flex items-center justify-center py-8">
              <DelightfulLoading type="knowledge" message="Loading document..." />
            </div>
          ) : selectedDocument ? (
            <div className="flex-1 overflow-hidden flex flex-col space-y-4">
              {/* Document Header */}
              <div className="space-y-3 border-b pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {selectedDocument.title}
                  </h2>
                  {selectedDocument.description && (
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                      {selectedDocument.description}
                    </p>
                  )}
                </div>
                
                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Created {formatDate(selectedDocument.created_at)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Updated {formatDate(selectedDocument.updated_at)}
                  </div>
                  {selectedDocument.file_size && (
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {formatFileSize(selectedDocument.file_size)}
                    </div>
                  )}
                  {selectedDocument.file_type && (
                    <Badge variant="secondary">{selectedDocument.file_type}</Badge>
                  )}
                </div>
                
                {/* Tags */}
                {selectedDocument.tags && selectedDocument.tags.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-slate-400" />
                    <div className="flex flex-wrap gap-1">
                      {selectedDocument.tags.map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Document Content with Tabs */}
              <Tabs value={documentDetailTab} onValueChange={setDocumentDetailTab} className="flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="embeddings" className="flex items-center gap-2">
                    Embeddings
                    {documentEmbeddings && (
                      <Badge variant="secondary" className="text-xs">
                        {documentEmbeddings.total_chunks}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="content" className="flex-1 overflow-auto mt-4">
                  {selectedDocument.content ? (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Content
                      </h3>
                      <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border">
                        <pre className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300 font-mono">
                          {selectedDocument.content}
                        </pre>
                      </div>
                    </div>
                  ) : selectedDocument.file_path ? (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        File Information
                      </h3>
                      <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          This is a file-based document. The original file is stored at:
                        </p>
                        <p className="text-sm font-mono text-slate-700 dark:text-slate-300 mt-2 bg-slate-100 dark:bg-slate-800 p-2 rounded">
                          {selectedDocument.file_path}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      No content available for this document.
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="embeddings" className="flex-1 overflow-auto mt-4">
                  {embeddingsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <DelightfulLoading type="knowledge" message="Loading embeddings..." />
                    </div>
                  ) : documentEmbeddings ? (
                    <div className="space-y-4">
                      {/* Embeddings Summary */}
                      <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
                          Embedding Information
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500">Total Chunks:</span>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">
                              {documentEmbeddings.total_chunks}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-500">Total Tokens:</span>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">
                              {documentEmbeddings.total_tokens}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-500">Model:</span>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">
                              {documentEmbeddings.embedding_model}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-500">Dimensions:</span>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">
                              {documentEmbeddings.embedding_dimensions}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Embedding Chunks */}
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                          Embedding Chunks
                        </h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {documentEmbeddings.chunks.map((chunk, index) => (
                            <div 
                              key={chunk.chunk_id}
                              className="border rounded-lg p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    Chunk {chunk.chunk_index + 1}
                                  </Badge>
                                  <span className="text-xs text-slate-500">
                                    {chunk.token_count} tokens
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    navigator.clipboard.writeText(chunk.chunk_text)
                                    toast({
                                      title: "Copied!",
                                      description: `Chunk ${chunk.chunk_index + 1} copied to clipboard.`
                                    })
                                  }}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                                {chunk.chunk_text.length > 200 
                                  ? `${chunk.chunk_text.substring(0, 200)}...` 
                                  : chunk.chunk_text}
                              </div>
                              <div className="text-xs text-slate-400">
                                <details>
                                  <summary className="cursor-pointer hover:text-slate-600">
                                    View embedding preview
                                  </summary>
                                  <div className="mt-2 p-2 bg-slate-100 dark:bg-slate-800 rounded font-mono">
                                    [{chunk.embedding_preview.map(v => v.toFixed(4)).join(', ')}...]
                                  </div>
                                </details>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <Database className="h-12 w-12 mx-auto mb-3 text-slate-400" />
                      <p>No embeddings available for this document.</p>
                      <p className="text-sm mt-1">Embeddings may still be processing.</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
              
              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-xs text-slate-400">
                  Document ID: {selectedDocument.id}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowDocumentDetailDialog(false)}
                  >
                    Close
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      handleDocumentDelete(selectedDocument.id)
                      setShowDocumentDetailDialog(false)
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              No document selected.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
})

export default KnowledgeContent
