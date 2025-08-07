"use client"

import { useState } from "react"
import { X, Upload, Link, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface AddComplianceModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => void
}

interface FormData {
  title: string
  version: string
  issuedDate: string
  effectiveDate: string
  authority: string
  country: string
  language: string
  description: string
  tags: string[]
  fileUrl: string
  uploadMethod: 'file' | 'url'
}

export function AddComplianceModal({ isOpen, onClose, onSave }: AddComplianceModalProps) {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    version: '',
    issuedDate: '',
    effectiveDate: '',
    authority: '',
    country: '',
    language: 'en',
    description: '',
    tags: [],
    fileUrl: '',
    uploadMethod: 'file'
  })

  const [newTag, setNewTag] = useState('')

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }))
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const resetForm = () => {
    setFormData({
      title: '',
      version: '',
      issuedDate: '',
      effectiveDate: '',
      authority: '',
      country: '',
      language: 'en',
      description: '',
      tags: [],
      fileUrl: '',
      uploadMethod: 'file'
    })
    setNewTag('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Add New Compliance Document
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Upload Method */}
          <div className="space-y-4">
            <Label>Upload Method</Label>
            <div className="flex gap-4">
              <Button
                type="button"
                variant={formData.uploadMethod === 'file' ? 'default' : 'outline'}
                onClick={() => handleInputChange('uploadMethod', 'file')}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                File Upload
              </Button>
              <Button
                type="button"
                variant={formData.uploadMethod === 'url' ? 'default' : 'outline'}
                onClick={() => handleInputChange('uploadMethod', 'url')}
                className="flex-1"
              >
                <Link className="h-4 w-4 mr-2" />
                URL Fetch
              </Button>
            </div>

            {formData.uploadMethod === 'file' ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                  Drop your file here, or click to browse
                </p>
                <p className="text-xs text-gray-500">
                  Supports PDF, DOCX (max 10MB)
                </p>
                <Button type="button" variant="outline" className="mt-2">
                  Choose File
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="fileUrl">Document URL</Label>
                <Input
                  id="fileUrl"
                  placeholder="https://example.com/document.pdf"
                  value={formData.fileUrl}
                  onChange={(e) => handleInputChange('fileUrl', e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., ISO 27001:2022"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="version">Version *</Label>
              <Input
                id="version"
                placeholder="e.g., 2022"
                value={formData.version}
                onChange={(e) => handleInputChange('version', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issuedDate">Issued Date *</Label>
              <Input
                id="issuedDate"
                type="date"
                value={formData.issuedDate}
                onChange={(e) => handleInputChange('issuedDate', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="effectiveDate">Effective Date</Label>
              <Input
                id="effectiveDate"
                type="date"
                value={formData.effectiveDate}
                onChange={(e) => handleInputChange('effectiveDate', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="authority">Authority / Standard Body *</Label>
              <Input
                id="authority"
                placeholder="e.g., ISO, KVKK Kurumu"
                value={formData.authority}
                onChange={(e) => handleInputChange('authority', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country / Region</Label>
              <Input
                id="country"
                placeholder="e.g., Turkey, Global"
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select value={formData.language} onValueChange={(value) => handleInputChange('language', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="tr">Turkish</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the compliance document..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              />
              <Button type="button" onClick={handleAddTag} variant="outline">
                Add
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              Save Document
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}