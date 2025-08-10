"use client"

import React, { useState } from 'react'
import { Upload, FileText, File } from 'lucide-react'
import { knowledgeApi } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { toast } from 'sonner'

interface DocumentUploadDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  collectionId?: string
}

export function DocumentUploadDialog({
  open,
  onClose,
  onSuccess,
  collectionId
}: DocumentUploadDialogProps) {
  const [loading, setLoading] = useState(false)
  const [uploadType, setUploadType] = useState<'text' | 'file'>('text')
  
  // Text upload state
  const [textTitle, setTextTitle] = useState('')
  const [textContent, setTextContent] = useState('')
  const [textDescription, setTextDescription] = useState('')
  
  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileDescription, setFileDescription] = useState('')

  const handleTextUpload = async () => {
    if (!textTitle.trim() || !textContent.trim()) {
      toast.error('Title and content are required')
      return
    }

    try {
      setLoading(true)
      await knowledgeApi.uploadDocument({
        knowledge_base_id: collectionId,
        title: textTitle,
        content: textContent,
        description: textDescription,
        source_type: 'text'
      })
      toast.success('Document uploaded successfully')
      onSuccess()
    } catch (err: any) {
      console.error('Failed to upload document:', err)
      toast.error(err.message || 'Failed to upload document')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file')
      return
    }

    try {
      setLoading(true)
      const formData = new FormData()
      formData.append('file', selectedFile)
      if (collectionId) {
        formData.append('knowledge_base_id', collectionId)
      }
      if (fileDescription) {
        formData.append('description', fileDescription)
      }

      await knowledgeApi.uploadDocumentFile(formData)
      toast.success('File uploaded successfully')
      onSuccess()
    } catch (err: any) {
      console.error('Failed to upload file:', err)
      toast.error(err.message || 'Failed to upload file')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (uploadType === 'text') {
      await handleTextUpload()
    } else {
      await handleFileUpload()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        toast.error('File size must be less than 10MB')
        return
      }
      setSelectedFile(file)
    }
  }

  const resetForm = () => {
    setTextTitle('')
    setTextContent('')
    setTextDescription('')
    setSelectedFile(null)
    setFileDescription('')
  }

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) {
        resetForm()
        onClose()
      }
    }}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Add Document to Collection
            </DialogTitle>
            <DialogDescription>
              Upload a document to your knowledge base collection
            </DialogDescription>
          </DialogHeader>

          <Tabs value={uploadType} onValueChange={(v) => setUploadType(v as 'text' | 'file')}>
            <TabsList className="grid w-full grid-cols-2 mt-4">
              <TabsTrigger value="text">
                <FileText className="mr-2 h-4 w-4" />
                Text Content
              </TabsTrigger>
              <TabsTrigger value="file">
                <File className="mr-2 h-4 w-4" />
                Upload File
              </TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="Enter document title"
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Brief description (optional)"
                  value={textDescription}
                  onChange={(e) => setTextDescription(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="content">
                  Content <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="content"
                  placeholder="Paste or type your document content here..."
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  disabled={loading}
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
            </TabsContent>

            <TabsContent value="file" className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="file">
                  Select File <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="file"
                  type="file"
                  accept=".txt,.md,.pdf,.docx,.doc"
                  onChange={handleFileChange}
                  disabled={loading}
                />
                <p className="text-sm text-muted-foreground">
                  Supported formats: TXT, MD, PDF, DOCX (max 10MB)
                </p>
              </div>

              {selectedFile && (
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="file-description">Description</Label>
                <Textarea
                  id="file-description"
                  placeholder="Brief description of the document (optional)"
                  value={fileDescription}
                  onChange={(e) => setFileDescription(e.target.value)}
                  disabled={loading}
                  rows={3}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || (uploadType === 'text' ? !textTitle || !textContent : !selectedFile)}
            >
              {loading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}