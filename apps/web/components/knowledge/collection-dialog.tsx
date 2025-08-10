"use client"

import React, { useState, useEffect } from 'react'
import { Folder, Globe, Lock } from 'lucide-react'
import { knowledgeApi, CollectionRequest, CollectionResponse } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

interface CollectionDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  collection?: CollectionResponse | null
}

export function CollectionDialog({
  open,
  onClose,
  onSuccess,
  collection
}: CollectionDialogProps) {
  const isEditing = !!collection
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<CollectionRequest>({
    name: '',
    description: '',
    type: 'general',
    is_public: false,
    embedding_model: 'text-embedding-ada-002',
    metadata: {}
  })

  useEffect(() => {
    if (collection) {
      setFormData({
        name: collection.name,
        description: collection.description || '',
        type: collection.type || 'general',
        is_public: collection.is_public || false,
        embedding_model: collection.embedding_model || 'text-embedding-ada-002',
        metadata: collection.metadata || {}
      })
    } else {
      setFormData({
        name: '',
        description: '',
        type: 'general',
        is_public: false,
        embedding_model: 'text-embedding-ada-002',
        metadata: {}
      })
    }
  }, [collection])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Collection name is required')
      return
    }

    try {
      setLoading(true)
      
      if (isEditing && collection) {
        await knowledgeApi.updateCollection(collection.id, formData)
        toast.success('Collection updated successfully')
      } else {
        await knowledgeApi.createCollection(formData)
        toast.success('Collection created successfully')
      }
      
      onSuccess()
    } catch (err: any) {
      console.error('Failed to save collection:', err)
      toast.error(err.message || `Failed to ${isEditing ? 'update' : 'create'} collection`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5" />
              {isEditing ? 'Edit Collection' : 'Create New Collection'}
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? 'Update collection settings and metadata'
                : 'Create a new collection to organize your knowledge base'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Name Field */}
            <div className="grid gap-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Enter collection name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={loading}
              />
            </div>

            {/* Description Field */}
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the purpose of this collection"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={loading}
                rows={3}
              />
            </div>

            {/* Type Field */}
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
                disabled={loading}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select collection type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="documentation">Documentation</SelectItem>
                  <SelectItem value="faq">FAQ</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Embedding Model Field */}
            <div className="grid gap-2">
              <Label htmlFor="embedding_model">Embedding Model</Label>
              <Select
                value={formData.embedding_model}
                onValueChange={(value) => setFormData({ ...formData, embedding_model: value })}
                disabled={loading}
              >
                <SelectTrigger id="embedding_model">
                  <SelectValue placeholder="Select embedding model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text-embedding-ada-002">
                    text-embedding-ada-002 (OpenAI)
                  </SelectItem>
                  <SelectItem value="text-embedding-3-small">
                    text-embedding-3-small (OpenAI)
                  </SelectItem>
                  <SelectItem value="text-embedding-3-large">
                    text-embedding-3-large (OpenAI)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Public/Private Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_public" className="text-base">
                  Public Collection
                </Label>
                <p className="text-sm text-muted-foreground">
                  {formData.is_public 
                    ? 'Anyone in your organization can access this collection'
                    : 'Only you can access this collection'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {formData.is_public ? (
                  <Globe className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
                <Switch
                  id="is_public"
                  checked={formData.is_public}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}