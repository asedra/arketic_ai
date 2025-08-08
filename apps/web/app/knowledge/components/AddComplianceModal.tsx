"use client"

import { useState } from "react"
import { X, Upload, Link, FileText, Type, FolderPlus, Search, Sparkles, Bot, FileUp, Database, Shield } from "lucide-react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
  uploadMethod: 'file' | 'url' | 'text' | 'collection'
  textContent?: string
  collectionName?: string
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
    uploadMethod: 'file',
    textContent: '',
    collectionName: ''
  })

  const [newTag, setNewTag] = useState('')
  const [activeTab, setActiveTab] = useState('add')

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
      uploadMethod: 'file',
      textContent: '',
      collectionName: ''
    })
    setNewTag('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            Knowledge Base Management
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="add" className="flex items-center gap-2">
              <FolderPlus className="h-4 w-4" />
              Add Content
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Ask AI
            </TabsTrigger>
          </TabsList>

          <TabsContent value="add" className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
            {/* Modern Button Options */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <button
                type="button"
                onClick={() => handleInputChange('uploadMethod', 'text')}
                className={`relative group p-6 rounded-xl border-2 transition-all duration-300 ${
                  formData.uploadMethod === 'text' 
                    ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg scale-105' 
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gradient-to-br hover:from-gray-50 hover:to-blue-50'
                }`}
              >
                <div className="flex flex-col items-center space-y-3">
                  <div className={`p-3 rounded-lg ${
                    formData.uploadMethod === 'text'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-600'
                  } transition-colors`}>
                    <Type className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Add Text</p>
                    <p className="text-xs text-gray-500 mt-1">Manual entry</p>
                  </div>
                </div>
                {formData.uploadMethod === 'text' && (
                  <div className="absolute top-2 right-2">
                    <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                  </div>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleInputChange('uploadMethod', 'file')}
                className={`relative group p-6 rounded-xl border-2 transition-all duration-300 ${
                  formData.uploadMethod === 'file' 
                    ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg scale-105' 
                    : 'border-gray-200 hover:border-green-300 hover:bg-gradient-to-br hover:from-gray-50 hover:to-green-50'
                }`}
              >
                <div className="flex flex-col items-center space-y-3">
                  <div className={`p-3 rounded-lg ${
                    formData.uploadMethod === 'file'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-600 group-hover:bg-green-100 group-hover:text-green-600'
                  } transition-colors`}>
                    <FileUp className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Upload File</p>
                    <p className="text-xs text-gray-500 mt-1">PDF, DOCX</p>
                  </div>
                </div>
                {formData.uploadMethod === 'file' && (
                  <div className="absolute top-2 right-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                  </div>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleInputChange('uploadMethod', 'collection')}
                className={`relative group p-6 rounded-xl border-2 transition-all duration-300 ${
                  formData.uploadMethod === 'collection' 
                    ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg scale-105' 
                    : 'border-gray-200 hover:border-purple-300 hover:bg-gradient-to-br hover:from-gray-50 hover:to-purple-50'
                }`}
              >
                <div className="flex flex-col items-center space-y-3">
                  <div className={`p-3 rounded-lg ${
                    formData.uploadMethod === 'collection'
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 text-gray-600 group-hover:bg-purple-100 group-hover:text-purple-600'
                  } transition-colors`}>
                    <FolderPlus className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">New Collection</p>
                    <p className="text-xs text-gray-500 mt-1">Group content</p>
                  </div>
                </div>
                {formData.uploadMethod === 'collection' && (
                  <div className="absolute top-2 right-2">
                    <div className="h-2 w-2 bg-purple-500 rounded-full animate-pulse" />
                  </div>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleInputChange('uploadMethod', 'url')}
                className={`relative group p-6 rounded-xl border-2 transition-all duration-300 ${
                  formData.uploadMethod === 'url' 
                    ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-amber-50 shadow-lg scale-105' 
                    : 'border-gray-200 hover:border-orange-300 hover:bg-gradient-to-br hover:from-gray-50 hover:to-orange-50'
                }`}
              >
                <div className="flex flex-col items-center space-y-3">
                  <div className={`p-3 rounded-lg ${
                    formData.uploadMethod === 'url'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-600 group-hover:bg-orange-100 group-hover:text-orange-600'
                  } transition-colors`}>
                    <Link className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">From URL</p>
                    <p className="text-xs text-gray-500 mt-1">Web import</p>
                  </div>
                </div>
                {formData.uploadMethod === 'url' && (
                  <div className="absolute top-2 right-2">
                    <div className="h-2 w-2 bg-orange-500 rounded-full animate-pulse" />
                  </div>
                )}
              </button>
            </div>

            {/* Dynamic Content Based on Selection */}
            <div className="bg-gray-50 rounded-xl p-6">
              {formData.uploadMethod === 'text' && (
                <div className="space-y-4">
                  <Label htmlFor="textContent" className="text-base font-semibold flex items-center gap-2">
                    <Type className="h-4 w-4 text-blue-500" />
                    Enter Your Text Content
                  </Label>
                  <Textarea
                    id="textContent"
                    placeholder="Paste or type your compliance text here..."
                    value={formData.textContent}
                    onChange={(e) => handleInputChange('textContent', e.target.value)}
                    rows={8}
                    className="w-full border-2 focus:border-blue-500 transition-colors"
                  />
                </div>
              )}

              {formData.uploadMethod === 'file' && (
                <div className="border-3 border-dashed border-green-300 rounded-xl p-8 text-center bg-gradient-to-br from-green-50 to-emerald-50">
                  <FileUp className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-gray-800 mb-2">
                    Drop your file here or click to browse
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    Supports PDF, DOCX, TXT (max 10MB)
                  </p>
                  <Button 
                    type="button" 
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>
                </div>
              )}

              {formData.uploadMethod === 'collection' && (
                <div className="space-y-4">
                  <Label htmlFor="collectionName" className="text-base font-semibold flex items-center gap-2">
                    <FolderPlus className="h-4 w-4 text-purple-500" />
                    Collection Name
                  </Label>
                  <Input
                    id="collectionName"
                    placeholder="Enter collection name (e.g., GDPR Documents, ISO Standards)"
                    value={formData.collectionName}
                    onChange={(e) => handleInputChange('collectionName', e.target.value)}
                    className="border-2 focus:border-purple-500 transition-colors"
                  />
                  <div className="bg-purple-100 rounded-lg p-4">
                    <p className="text-sm text-purple-800">
                      Collections help you organize related documents together for better management and searchability.
                    </p>
                  </div>
                </div>
              )}

              {formData.uploadMethod === 'url' && (
                <div className="space-y-4">
                  <Label htmlFor="fileUrl" className="text-base font-semibold flex items-center gap-2">
                    <Link className="h-4 w-4 text-orange-500" />
                    Document URL
                  </Label>
                  <Input
                    id="fileUrl"
                    placeholder="https://example.com/document.pdf"
                    value={formData.fileUrl}
                    onChange={(e) => handleInputChange('fileUrl', e.target.value)}
                    className="border-2 focus:border-orange-500 transition-colors"
                  />
                  <div className="bg-orange-100 rounded-lg p-4">
                    <p className="text-sm text-orange-800">
                      We'll fetch and process the document from the provided URL automatically.
                    </p>
                  </div>
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
            <Button type="submit" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg">
              Save Document
            </Button>
          </div>
            </form>
          </TabsContent>

          <TabsContent value="search" className="space-y-6">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-8">
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full shadow-xl">
                  <Search className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Advanced Search</h3>
                  <p className="text-gray-600 max-w-md">
                    Search through your entire knowledge base with powerful filters and semantic search capabilities
                  </p>
                </div>
                <div className="w-full max-w-xl space-y-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      placeholder="Search for documents, standards, regulations..."
                      className="pl-12 pr-4 py-6 text-lg border-2 border-blue-200 focus:border-blue-500 rounded-xl"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap justify-center">
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer px-3 py-1">
                      ISO Standards
                    </Badge>
                    <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 cursor-pointer px-3 py-1">
                      GDPR
                    </Badge>
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer px-3 py-1">
                      Compliance
                    </Badge>
                    <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200 cursor-pointer px-3 py-1">
                      Regulations
                    </Badge>
                  </div>
                  <Button className="w-full py-6 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg">
                    <Search className="h-5 w-5 mr-2" />
                    Search Knowledge Base
                  </Button>
                </div>
              </div>
            </div>

            {/* Recent Searches */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-yellow-500" />
                Recent Searches
              </h4>
              <div className="space-y-2">
                {['ISO 27001 controls', 'GDPR article 32', 'Data retention policy'].map((search, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
                    <span className="text-gray-700">{search}</span>
                    <span className="text-xs text-gray-500">2 hours ago</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ai" className="space-y-6">
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-8">
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full shadow-xl animate-pulse">
                  <Bot className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Ask AI Assistant</h3>
                  <p className="text-gray-600 max-w-md">
                    Get intelligent answers about your compliance documents, regulations, and best practices
                  </p>
                </div>
                <div className="w-full max-w-xl space-y-4">
                  <Textarea
                    placeholder="Ask me anything about your compliance documents..."
                    rows={4}
                    className="w-full border-2 border-purple-200 focus:border-purple-500 rounded-xl p-4"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button className="p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-sm text-gray-700 transition-colors">
                      What are the key GDPR requirements?
                    </button>
                    <button className="p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-sm text-gray-700 transition-colors">
                      Compare ISO 27001 vs SOC 2
                    </button>
                    <button className="p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-sm text-gray-700 transition-colors">
                      Data retention best practices
                    </button>
                    <button className="p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-sm text-gray-700 transition-colors">
                      Compliance checklist for startups
                    </button>
                  </div>
                  <Button className="w-full py-6 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg">
                    <Sparkles className="h-5 w-5 mr-2" />
                    Ask AI Assistant
                  </Button>
                </div>
              </div>
            </div>

            {/* AI Capabilities */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <FileText className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-semibold text-gray-800">Document Analysis</span>
                </div>
                <p className="text-sm text-gray-600">
                  Analyze and extract key information from your compliance documents
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <Shield className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-semibold text-gray-800">Compliance Check</span>
                </div>
                <p className="text-sm text-gray-600">
                  Verify compliance status and identify gaps in your documentation
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-semibold text-gray-800">Smart Suggestions</span>
                </div>
                <p className="text-sm text-gray-600">
                  Get intelligent recommendations based on your industry and needs
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}