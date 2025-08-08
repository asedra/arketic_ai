"use client"

import React, { memo, useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
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
  Bot, 
  Settings, 
  Play, 
  Pause,
  Edit,
  Trash2,
  Copy,
  Brain,
  Zap,
  MessageSquare,
  Users,
  Lock,
  Globe,
  MoreVertical,
  Filter,
  Grid3X3,
  List,
  RefreshCw,
  Download,
  Upload,
  Sparkles,
  Database,
  ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useArketicStore } from '@/lib/state-manager'
import { 
  assistantApi,
  knowledgeApi, 
  AssistantResponse, 
  AssistantDetailResponse,
  AssistantCreateRequest,
  AssistantUpdateRequest,
  AIModel,
  CollectionResponse
} from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { KnowledgeSelector } from '@/components/assistant/KnowledgeSelector'

interface AssistantsContentProps {
  className?: string
}

// Assistant Card Component
const AssistantCard = memo(function AssistantCard({ 
  assistant, 
  onEdit, 
  onDelete, 
  onDuplicate 
}: { 
  assistant: AssistantResponse
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'inactive': return 'bg-gray-500'
      case 'draft': return 'bg-yellow-500'
      case 'archived': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getModelBadgeColor = (model: string) => {
    if (model.includes('gpt-4')) return 'bg-purple-100 text-purple-800'
    if (model.includes('claude')) return 'bg-blue-100 text-blue-800'
    if (model.includes('gpt-3.5')) return 'bg-green-100 text-green-800'
    return 'bg-gray-100 text-gray-800'
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-slate-200 dark:border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {assistant.name}
                {assistant.is_public ? (
                  <Tooltip>
                    <TooltipTrigger>
                      <Globe className="h-4 w-4 text-blue-500" />
                    </TooltipTrigger>
                    <TooltipContent>Public Assistant</TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger>
                      <Lock className="h-4 w-4 text-gray-500" />
                    </TooltipTrigger>
                    <TooltipContent>Private Assistant</TooltipContent>
                  </Tooltip>
                )}
              </CardTitle>
              <CardDescription className="mt-1 line-clamp-2">
                {assistant.description || 'No description provided'}
              </CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="pb-3">
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge className={cn("text-xs", getModelBadgeColor(assistant.ai_model))}>
            {assistant.ai_model_display}
          </Badge>
          <Badge variant="outline" className="text-xs">
            <div className={cn("w-2 h-2 rounded-full mr-1", getStatusColor(assistant.status))} />
            {assistant.status}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <MessageSquare className="h-4 w-4" />
            <span>{assistant.total_messages} messages</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Zap className="h-4 w-4" />
            <span>{assistant.total_tokens_used.toLocaleString()} tokens</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Users className="h-4 w-4" />
            <span>{assistant.total_conversations} chats</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Database className="h-4 w-4" />
            <span>{assistant.knowledge_count} KB</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-3 border-t">
        <div className="flex items-center justify-between w-full text-xs text-slate-500">
          <span>Created {new Date(assistant.created_at).toLocaleDateString()}</span>
          {assistant.last_used_at && (
            <span>Last used {new Date(assistant.last_used_at).toLocaleDateString()}</span>
          )}
        </div>
      </CardFooter>
    </Card>
  )
})

const AssistantsContent = memo(function AssistantsContent({ className }: AssistantsContentProps) {
  const viewMode = useArketicStore(state => state.viewMode)
  const { toast } = useToast()
  
  // State management
  const [assistants, setAssistants] = useState<AssistantResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [selectedModel, setSelectedModel] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedAssistant, setSelectedAssistant] = useState<AssistantDetailResponse | null>(null)
  
  // Form states
  const [availableModels, setAvailableModels] = useState<AIModel[]>([])
  const [formData, setFormData] = useState<AssistantCreateRequest>({
    name: '',
    description: '',
    system_prompt: '',
    ai_model: 'gpt-4o',
    temperature: 0.7,
    max_tokens: 2048,
    is_public: false,
    knowledge_base_ids: [],
    document_ids: []
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  
  // Knowledge management states
  const [availableCollections, setAvailableCollections] = useState<any[]>([])
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([])
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([])
  const [loadingKnowledge, setLoadingKnowledge] = useState(false)
  
  // Fetch assistants
  const fetchAssistants = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params: any = {
        page: 1,
        limit: 50,
        sort_by: sortBy,
        sort_order: sortOrder
      }
      
      if (searchQuery) params.query = searchQuery
      if (selectedModel !== 'all') params.ai_model = selectedModel
      if (selectedFilter === 'public') params.is_public = true
      if (selectedFilter === 'private') params.is_public = false
      if (selectedFilter === 'active') params.status = 'active'
      if (selectedFilter === 'inactive') params.status = 'inactive'
      
      const response = await assistantApi.listAssistants(params)
      
      if (response.data) {
        setAssistants(response.data.assistants || [])
      }
    } catch (err) {
      console.error('Error fetching assistants:', err)
      setError('Failed to load assistants')
      toast({
        title: "Error",
        description: "Failed to load assistants. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }
  
  // Fetch available models
  const fetchAvailableModels = async () => {
    try {
      const response = await assistantApi.getAvailableModels()
      if (response.data) {
        setAvailableModels(response.data.models || [])
        if (response.data.default_model) {
          setFormData(prev => ({ ...prev, ai_model: response.data.default_model }))
        }
      }
    } catch (err) {
      console.error('Error fetching models:', err)
    }
  }
  
  // Fetch available knowledge for assistant
  const fetchAvailableKnowledge = async (assistantId?: string) => {
    try {
      setLoadingKnowledge(true)
      
      // Use the same endpoint for both new and existing assistants
      const effectiveId = assistantId || 'new'
      const response = await assistantApi.getAvailableKnowledge(effectiveId)
      
      console.log('Available Knowledge Response:', response)
      
      if (response.data) {
        setAvailableCollections(response.data.collections || [])
        
        // Only set selected IDs for existing assistants
        if (assistantId && assistantId !== 'new') {
          setSelectedCollectionIds(response.data.selected_collection_ids || [])
          setSelectedDocumentIds(response.data.selected_document_ids || [])
        } else {
          // Clear selections for new assistant
          setSelectedCollectionIds([])
          setSelectedDocumentIds([])
        }
      } else {
        setAvailableCollections([])
      }
    } catch (err) {
      console.error('Error fetching knowledge:', err)
      setAvailableCollections([])
    } finally {
      setLoadingKnowledge(false)
    }
  }
  
  // Handle knowledge selection
  const handleCollectionToggle = (collectionId: string) => {
    setSelectedCollectionIds(prev => {
      if (prev.includes(collectionId)) {
        return prev.filter(id => id !== collectionId)
      } else {
        return [...prev, collectionId]
      }
    })
  }
  
  const handleDocumentToggle = (documentId: string) => {
    setSelectedDocumentIds(prev => {
      if (prev.includes(documentId)) {
        return prev.filter(id => id !== documentId)
      } else {
        return [...prev, documentId]
      }
    })
  }
  
  const handleSelectAllKnowledge = () => {
    const allCollectionIds = availableCollections.map(c => c.id)
    const allDocumentIds = availableCollections.flatMap(c => c.documents?.map((d: any) => d.id) || [])
    setSelectedCollectionIds(allCollectionIds)
    setSelectedDocumentIds(allDocumentIds)
  }
  
  const handleClearAllKnowledge = () => {
    setSelectedCollectionIds([])
    setSelectedDocumentIds([])
  }
  
  // Create assistant
  const handleCreateAssistant = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Assistant name is required",
        variant: "destructive"
      })
      return
    }
    
    try {
      setIsSubmitting(true)
      const createData = {
        ...formData,
        knowledge_base_ids: selectedCollectionIds,
        document_ids: selectedDocumentIds
      }
      const response = await assistantApi.createAssistant(createData)
      
      if (response.data) {
        setShowSuccess(true)
        toast({
          title: "Success!",
          description: `Assistant "${formData.name}" created successfully`,
        })
        setShowCreateDialog(false)
        fetchAssistants()
        
        // Reset form
        setFormData({
          name: '',
          description: '',
          system_prompt: '',
          ai_model: availableModels[0]?.value || 'gpt-4o',
          temperature: 0.7,
          max_tokens: 2048,
          is_public: false,
          knowledge_base_ids: [],
          document_ids: []
        })
        
        setTimeout(() => setShowSuccess(false), 3000)
      }
    } catch (err: any) {
      console.error('Error creating assistant:', err)
      toast({
        title: "Error",
        description: err.message || "Failed to create assistant",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Update assistant
  const handleUpdateAssistant = async () => {
    if (!selectedAssistant) return
    
    try {
      setIsSubmitting(true)
      const updateData: AssistantUpdateRequest = {
        name: formData.name,
        description: formData.description,
        system_prompt: formData.system_prompt,
        ai_model: formData.ai_model,
        temperature: formData.temperature,
        max_tokens: formData.max_tokens,
        is_public: formData.is_public
      }
      
      const response = await assistantApi.updateAssistant(selectedAssistant.id, updateData)
      
      if (response.data) {
        // Update knowledge associations
        await assistantApi.updateAssistantKnowledge(selectedAssistant.id, {
          action: 'replace',  // Use 'replace' to completely replace existing associations
          knowledge_base_ids: selectedCollectionIds,
          document_ids: selectedDocumentIds
        })
        
        toast({
          title: "Success!",
          description: "Assistant updated successfully",
        })
        setShowEditDialog(false)
        fetchAssistants()
      }
    } catch (err: any) {
      console.error('Error updating assistant:', err)
      toast({
        title: "Error",
        description: err.message || "Failed to update assistant",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Delete assistant
  const handleDeleteAssistant = async () => {
    if (!selectedAssistant) return
    
    try {
      setIsSubmitting(true)
      const response = await assistantApi.deleteAssistant(selectedAssistant.id)
      
      if (response.data) {
        toast({
          title: "Success!",
          description: response.data.message,
        })
        setShowDeleteDialog(false)
        setSelectedAssistant(null)
        fetchAssistants()
      }
    } catch (err: any) {
      console.error('Error deleting assistant:', err)
      toast({
        title: "Error",
        description: err.message || "Failed to delete assistant",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  
  // Edit assistant
  const handleEditAssistant = async (assistant: AssistantResponse) => {
    try {
      const response = await assistantApi.getAssistant(assistant.id)
      if (response.data) {
        setSelectedAssistant(response.data)
        setFormData({
          name: response.data.name,
          description: response.data.description || '',
          system_prompt: response.data.system_prompt || '',
          ai_model: response.data.ai_model,
          temperature: response.data.temperature,
          max_tokens: response.data.max_tokens,
          is_public: response.data.is_public,
          knowledge_base_ids: response.data.knowledge_bases?.map((kb: any) => kb.id || kb.knowledge_base_id) || [],
          document_ids: response.data.documents?.map((doc: any) => doc.id || doc.document_id) || []
        })
        
        // Load available knowledge and current selections
        await fetchAvailableKnowledge(assistant.id)
        
        setShowEditDialog(true)
      }
    } catch (err) {
      console.error('Error fetching assistant for edit:', err)
      toast({
        title: "Error",
        description: "Failed to load assistant for editing",
        variant: "destructive"
      })
    }
  }
  
  // Duplicate assistant
  const handleDuplicateAssistant = async (assistant: AssistantResponse) => {
    try {
      const response = await assistantApi.getAssistant(assistant.id)
      if (response.data) {
        setFormData({
          name: `${response.data.name} (Copy)`,
          description: response.data.description || '',
          system_prompt: response.data.system_prompt || '',
          ai_model: response.data.ai_model,
          temperature: response.data.temperature,
          max_tokens: response.data.max_tokens,
          is_public: false,
          knowledge_base_ids: response.data.knowledge_bases?.map(kb => kb.knowledge_base_id) || [],
          document_ids: response.data.documents?.map(doc => doc.document_id) || []
        })
        setShowCreateDialog(true)
        fetchAvailableKnowledge()
      }
    } catch (err) {
      console.error('Error duplicating assistant:', err)
      toast({
        title: "Error",
        description: "Failed to duplicate assistant",
        variant: "destructive"
      })
    }
  }
  
  // Effects
  useEffect(() => {
    fetchAssistants()
    fetchAvailableModels()
  }, [searchQuery, selectedFilter, selectedModel, sortBy, sortOrder])
  
  // Filter assistants
  const filteredAssistants = assistants.filter(assistant => {
    if (searchQuery && !assistant.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !assistant.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    return true
  })
  
  return (
    <TooltipProvider>
      <div className={cn('p-6 space-y-6', className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              AI Assistants
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Create and manage your AI assistants with custom models and knowledge bases
            </p>
          </div>
          <Button 
            onClick={() => {
              setShowCreateDialog(true)
              fetchAvailableKnowledge()
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Assistant
          </Button>
        </div>
        
        {/* Filters and Search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    placeholder="Search assistants..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assistants</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Models</SelectItem>
                  {availableModels.map(model => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Created Date</SelectItem>
                  <SelectItem value="updated_at">Updated Date</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="last_used_at">Last Used</SelectItem>
                  <SelectItem value="total_messages">Total Messages</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                onClick={fetchAssistants}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Assistants Grid/List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <SkeletonLoader key={i} className="h-64" />
            ))}
          </div>
        ) : error ? (
          <DelightfulErrorState 
            title="Failed to load assistants"
            message={error}
            onRetry={fetchAssistants}
          />
        ) : filteredAssistants.length === 0 ? (
          <DelightfulEmptyState
            icon={Bot}
            title="No assistants found"
            message={searchQuery ? "Try adjusting your search or filters" : "Create your first AI assistant to get started"}
            actionLabel="Create Assistant"
            onAction={() => {
              setShowCreateDialog(true)
              fetchAvailableKnowledge()
            }}
          />
        ) : (
          <div className={cn(
            viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              : "space-y-4"
          )}>
            {filteredAssistants.map((assistant) => (
              <AssistantCard
                key={assistant.id}
                assistant={assistant}
                onEdit={() => handleEditAssistant(assistant)}
                onDelete={() => {
                  setSelectedAssistant(assistant as AssistantDetailResponse)
                  setShowDeleteDialog(true)
                }}
                onDuplicate={() => handleDuplicateAssistant(assistant)}
              />
            ))}
          </div>
        )}
        
        {/* Create Assistant Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Assistant</DialogTitle>
              <DialogDescription>
                Configure your AI assistant with a custom model and settings
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="general">General Settings</TabsTrigger>
                <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
              </TabsList>
              
              <TabsContent value="general" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Python Coding Assistant"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what this assistant does..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="system_prompt">System Prompt</Label>
                <Textarea
                  id="system_prompt"
                  placeholder="You are a helpful AI assistant..."
                  value={formData.system_prompt}
                  onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                  rows={5}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ai_model">AI Model</Label>
                  <Select 
                    value={formData.ai_model} 
                    onValueChange={(value) => setFormData({ ...formData, ai_model: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map(model => (
                        <SelectItem key={model.value} value={model.value}>
                          <div>
                            <div>{model.label}</div>
                            <div className="text-xs text-slate-500">{model.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="max_tokens">Max Tokens: {formData.max_tokens}</Label>
                  <Slider
                    id="max_tokens"
                    min={100}
                    max={8000}
                    step={100}
                    value={[formData.max_tokens || 2048]}
                    onValueChange={(value) => setFormData({ ...formData, max_tokens: value[0] })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="temperature">Temperature: {formData.temperature}</Label>
                <Slider
                  id="temperature"
                  min={0}
                  max={2}
                  step={0.1}
                  value={[formData.temperature || 0.7]}
                  onValueChange={(value) => setFormData({ ...formData, temperature: value[0] })}
                />
                <p className="text-xs text-slate-500">
                  Lower values make output more focused, higher values more creative
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="is_public">Make this assistant public</Label>
                <Switch
                  id="is_public"
                  checked={formData.is_public}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
                />
              </div>
              </TabsContent>
              
              <TabsContent value="knowledge" className="mt-4">
                {loadingKnowledge ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Loading available knowledge...</span>
                  </div>
                ) : (
                  <KnowledgeSelector
                    collections={availableCollections}
                    selectedCollectionIds={selectedCollectionIds}
                    selectedDocumentIds={selectedDocumentIds}
                    onCollectionToggle={handleCollectionToggle}
                    onDocumentToggle={handleDocumentToggle}
                    onSelectAll={handleSelectAllKnowledge}
                    onClearAll={handleClearAllKnowledge}
                    className="h-[400px]"
                  />
                )}
              </TabsContent>
            </Tabs>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateAssistant} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Assistant'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Edit Assistant Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Assistant</DialogTitle>
              <DialogDescription>
                Update your assistant's configuration and settings
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="general">General Settings</TabsTrigger>
                <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
              </TabsList>
              
              <TabsContent value="general" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-system_prompt">System Prompt</Label>
                <Textarea
                  id="edit-system_prompt"
                  value={formData.system_prompt}
                  onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                  rows={5}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-ai_model">AI Model</Label>
                  <Select 
                    value={formData.ai_model} 
                    onValueChange={(value) => setFormData({ ...formData, ai_model: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map(model => (
                        <SelectItem key={model.value} value={model.value}>
                          <div>
                            <div>{model.label}</div>
                            <div className="text-xs text-slate-500">{model.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-max_tokens">Max Tokens: {formData.max_tokens}</Label>
                  <Slider
                    id="edit-max_tokens"
                    min={100}
                    max={8000}
                    step={100}
                    value={[formData.max_tokens || 2048]}
                    onValueChange={(value) => setFormData({ ...formData, max_tokens: value[0] })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-temperature">Temperature: {formData.temperature}</Label>
                <Slider
                  id="edit-temperature"
                  min={0}
                  max={2}
                  step={0.1}
                  value={[formData.temperature || 0.7]}
                  onValueChange={(value) => setFormData({ ...formData, temperature: value[0] })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-is_public">Make this assistant public</Label>
                <Switch
                  id="edit-is_public"
                  checked={formData.is_public}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
                />
              </div>
              </TabsContent>
              
              <TabsContent value="knowledge" className="mt-4">
                {loadingKnowledge ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Loading available knowledge...</span>
                  </div>
                ) : (
                  <KnowledgeSelector
                    collections={availableCollections}
                    selectedCollectionIds={selectedCollectionIds}
                    selectedDocumentIds={selectedDocumentIds}
                    onCollectionToggle={handleCollectionToggle}
                    onDocumentToggle={handleDocumentToggle}
                    onSelectAll={handleSelectAllKnowledge}
                    onClearAll={handleClearAllKnowledge}
                    className="h-[400px]"
                  />
                )}
              </TabsContent>
            </Tabs>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateAssistant} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Assistant'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Assistant</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedAssistant?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteAssistant}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* Success Celebration */}
        {showSuccess && <SuccessCelebration />}
      </div>
    </TooltipProvider>
  )
})

export default AssistantsContent