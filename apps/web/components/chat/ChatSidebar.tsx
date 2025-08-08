"use client"

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { useChatStore } from '@/lib/stores/chat-store'
import { useAssistantStore } from '@/lib/stores/assistant-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, MessageCircle, Search, Bot, Users, Hash, Sparkles, Brain, ChevronRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ChatSidebarProps {
  className?: string
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ className }) => {
  const { 
    chats, 
    currentChatId, 
    isLoading, 
    setCurrentChat, 
    loadChats, 
    createChat 
  } = useChatStore()
  
  const { 
    assistants, 
    selectedAssistant,
    loadAssistants,
    selectAssistant,
    clearSelection,
    isLoading: assistantsLoading
  } = useAssistantStore()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  React.useEffect(() => {
    loadChats()
    loadAssistants()
  }, [loadChats, loadAssistants])

  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (chat.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleCreateChat = async () => {
    if (!selectedAssistant) return
    
    const chatData: any = {
      title: `Chat with ${selectedAssistant.name}`,
      assistant_id: selectedAssistant.id
    }
    
    console.log('Creating chat with assistant:', chatData)
    
    try {
      const chatId = await createChat(chatData)
      if (chatId) {
        setCurrentChat(chatId)
        setIsCreateDialogOpen(false)
        clearSelection()
      }
    } catch (error) {
      console.error('Failed to create chat:', error)
    }
  }

  const getChatIcon = (chatType: string) => {
    switch (chatType) {
      case 'GROUP':
        return <Users className="h-4 w-4" />
      case 'CHANNEL':
        return <Hash className="h-4 w-4" />
      case 'DIRECT':
      default:
        return <Bot className="h-4 w-4" />
    }
  }

  return (
    <div className={cn('flex flex-col h-full bg-transparent', className)}>
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Chats</h2>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 px-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-md">
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <DialogHeader>
                <DialogTitle className="text-slate-900 dark:text-slate-100">
                  Select an Assistant
                </DialogTitle>
                <DialogDescription className="text-slate-600 dark:text-slate-400">
                  Choose an AI assistant to start your conversation with specialized knowledge and capabilities.
                </DialogDescription>
              </DialogHeader>
              
              
                <div className="space-y-4">
                  {assistantsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Loading assistants...</p>
                    </div>
                  ) : assistants.length === 0 ? (
                    <div className="text-center py-8">
                      <Brain className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">No assistants available</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {assistants.map((assistant) => (
                        <div
                          key={assistant.id}
                          className={cn(
                            "p-3 border rounded-lg cursor-pointer transition-all",
                            selectedAssistant?.id === assistant.id
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/50"
                              : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                          )}
                          onClick={() => selectAssistant(assistant.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shrink-0">
                              <Bot className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm text-slate-900 dark:text-slate-100">
                                {assistant.name}
                              </h4>
                              {assistant.description && (
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                                  {assistant.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="secondary" className="text-xs">
                                  {assistant.ai_model_display || assistant.ai_model}
                                </Badge>
                                {assistant.knowledge_count > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    {assistant.knowledge_count} knowledge bases
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {selectedAssistant && (
                    <div className="flex gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setIsCreateDialogOpen(false)
                          clearSelection()
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleCreateChat}
                        disabled={isLoading}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                      >
                        Start Chat with {selectedAssistant.name}
                      </Button>
                    </div>
                  )}
                </div>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && chats.length === 0 ? (
          <div className="p-4 text-center text-slate-500 dark:text-slate-400">
            <div className="animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mx-auto"></div>
            </div>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="p-4 text-center text-slate-500 dark:text-slate-400">
            <div className="text-4xl mb-2">💬</div>
            <div className="font-medium">{searchQuery ? 'No chats found' : 'No chats yet'}</div>
            <div className="text-sm mt-1 text-slate-400 dark:text-slate-500">
              {!searchQuery && 'Create your first chat to get started!'}
            </div>
          </div>
        ) : (
          <div className="p-2">
            {filteredChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setCurrentChat(chat.id)}
                className={cn(
                  'w-full text-left p-3 rounded-xl mb-2 transition-all duration-200 group',
                  currentChatId === chat.id
                    ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 border border-blue-200 dark:border-blue-800 shadow-sm'
                    : 'hover:bg-white/80 dark:hover:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-200',
                    currentChatId === chat.id
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 group-hover:bg-slate-300 dark:group-hover:bg-slate-600'
                  )}>
                    {getChatIcon(chat.chat_type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                        {chat.title}
                      </h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0 ml-2">
                        {formatDistanceToNow(chat.lastActivity, { addSuffix: false })}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-1">
                      {chat.ai_model && (
                        <Badge variant="outline" className="text-xs">
                          {chat.ai_model}
                        </Badge>
                      )}
                      {chat.message_count > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {chat.message_count} messages
                        </Badge>
                      )}
                    </div>
                    
                    {chat.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {chat.description}
                      </p>
                    )}
                    
                    {chat.ai_persona && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 truncate mt-1 font-medium">
                        {chat.ai_persona}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="shrink-0 p-4 border-t border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
          {chats.length} chat{chats.length !== 1 ? 's' : ''} total
        </div>
      </div>
    </div>
  )
}