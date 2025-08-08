"use client"

import React, { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useChatStore, useCurrentChat } from '@/lib/stores/chat-store'
import { useAssistantStore, useAssistantById } from '@/lib/stores/assistant-store'
import { chatApi } from '@/lib/api-client'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { TypingIndicator } from './TypingIndicator'
import { ConnectionStatus } from './ConnectionStatus'
import { Button } from '@/components/ui/button'
import { Settings, Trash2, Archive, Bot, TestTube } from 'lucide-react'
import { AIChatSettings } from './AIChatSettings'

interface ChatWindowProps {
  className?: string
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ className }) => {
  const { 
    currentChat, 
    currentMessages, 
    currentTypingUsers, 
    isConnected, 
    isConnecting, 
    hasConnectionError,
    isSending,
    connectionStatus 
  } = useCurrentChat()
  const { sendMessage, deleteChat, isLoading, error, clearError } = useChatStore()
  const assistant = useAssistantById(currentChat?.assistant_id)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [lastMessageCount, setLastMessageCount] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  
  // Load assistants if needed for display
  const { loadAssistants, assistants } = useAssistantStore()
  useEffect(() => {
    if (currentChat?.assistant_id && assistants.length === 0) {
      loadAssistants()
    }
  }, [currentChat?.assistant_id, assistants.length, loadAssistants])

  // Track message count changes for auto-scroll
  useEffect(() => {
    if (currentMessages.length > lastMessageCount && isAtBottom) {
      // New messages arrived and user is at bottom, so scroll
      setLastMessageCount(currentMessages.length)
    } else {
      setLastMessageCount(currentMessages.length)
    }
  }, [currentMessages.length, lastMessageCount, isAtBottom])

  // Clear errors after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => clearError(), 5000)
      return () => clearTimeout(timer)
    }
  }, [error, clearError])

  const handleSendMessage = async (content: string) => {
    if (!currentChat || !content.trim() || isSending) return
    await sendMessage(currentChat.id, content.trim())
  }
  
  const handleMessageAction = (messageId: string, action: 'copy' | 'like' | 'dislike' | 'more') => {
    // TODO: Implement message actions (analytics, feedback, etc.)
    console.log(`Message action: ${action} for message ${messageId}`)
  }
  
  // Get connection status display
  const getConnectionDisplay = () => {
    switch (connectionStatus) {
      case 'connecting':
        return { text: 'Connecting...', color: 'text-yellow-600 dark:text-yellow-400' }
      case 'connected':
        return { text: 'Connected', color: 'text-green-600 dark:text-green-400' }
      case 'error':
        return { text: 'Connection Error', color: 'text-red-600 dark:text-red-400' }
      default:
        return { text: 'Disconnected', color: 'text-red-600 dark:text-red-400' }
    }
  }
  
  const connectionDisplay = getConnectionDisplay()

  const handleDeleteChat = async () => {
    if (!currentChat) return
    if (window.confirm(`Are you sure you want to delete "${currentChat.title}"?`)) {
      await deleteChat(currentChat.id)
    }
  }

  const handleTestConnection = async () => {
    setIsTestingConnection(true)
    clearError()
    
    try {
      console.log('Testing chat connection...')
      const response = await chatApi.testConnection()
      console.log('Connection test result:', response)
      
      if (response.success) {
        alert('✅ Connection test successful!\n\n' + JSON.stringify(response.data, null, 2))
      } else {
        alert('❌ Connection test failed:\n' + (response.message || 'Unknown error'))
      }
    } catch (error) {
      console.error('Connection test error:', error)
      alert('❌ Connection test failed:\n' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsTestingConnection(false)
    }
  }

  if (!currentChat) {
    return (
      <div className={cn(
        'flex flex-col h-full bg-gradient-to-br from-slate-50/50 to-white dark:from-slate-900/50 dark:to-slate-800/50',
        'min-h-0', // Important for flex child to shrink
        className
      )}>
        <div className="flex-1 flex items-center justify-center text-center p-4 md:p-8">
          <div className="max-w-lg">
            <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Bot className="h-8 w-8 md:h-10 md:w-10 text-white" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
              Welcome to AI Chat
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed text-sm md:text-base">
              Select an existing conversation from the sidebar or create a new chat to get started with your AI assistant.
            </p>
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
              <div className="text-sm text-slate-700 dark:text-slate-300 font-medium mb-2 px-2">
                🎆 Powered by Advanced AI
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 px-2">
                Get help with writing, coding, analysis, creative tasks, and much more using state-of-the-art language models.
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      'flex flex-col h-full bg-gradient-to-br from-slate-50/50 to-white dark:from-slate-900/50 dark:to-slate-800/50',
      'min-h-0', // Important for flex child to shrink
      className
    )}>
      {/* Chat Header */}
      <div className="shrink-0 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm px-3 md:px-4 py-3 md:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 md:space-x-4 min-w-0 flex-1">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md shrink-0">
              <Bot className="h-4 w-4 md:h-5 md:w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
                {currentChat.title}
              </h2>
              <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400 flex-wrap gap-1">
                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md font-mono text-xs shrink-0">
                  {assistant?.name || currentChat.assistant_name || currentChat.ai_model || 'gpt-3.5-turbo'}
                </span>
                {!assistant && currentChat.ai_persona && (
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-md text-xs font-medium shrink-0">
                    {currentChat.ai_persona}
                  </span>
                )}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    isConnected ? "bg-green-500 animate-pulse" : hasConnectionError ? "bg-red-500" : "bg-yellow-500"
                  )} />
                  <span className={cn("text-xs font-medium", connectionDisplay.color)}>
                    {connectionDisplay.text}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-1 shrink-0">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 h-7 w-7 md:h-8 md:w-8 p-0"
              onClick={handleTestConnection}
              disabled={isTestingConnection}
              title="Test Chat Connection"
            >
              <TestTube className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 h-7 w-7 md:h-8 md:w-8 p-0"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 h-7 w-7 md:h-8 md:w-8 p-0"
              onClick={handleDeleteChat}
            >
              <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="shrink-0 bg-red-50 dark:bg-red-950/50 border-b border-red-200 dark:border-red-800 px-3 md:px-4 py-2 md:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shrink-0"></div>
              <p className="text-sm text-red-700 dark:text-red-300 font-medium truncate">{error}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {(error.includes('OpenAI') || error.includes('API key') || error.includes('Server error')) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSettings(true)}
                  className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/50 h-7 text-xs"
                >
                  AI Settings
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearError}
                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 h-6 w-6 p-0 rounded-full shrink-0"
              >
                ×
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {currentMessages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center p-4 md:p-8">
            <div className="max-w-md">
              <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
                <Bot className="h-6 w-6 md:h-8 md:w-8 text-white" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">
                Ready to chat!
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Send a message below to begin your conversation with {currentChat.ai_persona || 'your AI assistant'}.
              </p>
              <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                💬 Start with a question, request, or just say hello!
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0">
            <MessageList 
              messages={currentMessages}
              isLoading={isLoading}
              autoScroll={isAtBottom}
              onMessageAction={handleMessageAction}
              className="h-full"
            />
            <TypingIndicator 
              typingUsers={currentTypingUsers}
              className="px-3 md:px-4"
            />
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="shrink-0 border-t border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <MessageInput
          onSendMessage={handleSendMessage}
          disabled={!isConnected || isSending}
          placeholder={
            isSending
              ? "Sending..."
              : isConnecting 
                ? "Connecting..." 
                : !isConnected
                  ? "Disconnected - Check connection"
                  : `Message ${currentChat.ai_persona || 'AI Assistant'}...`
          }
        />
      </div>

      {/* AI Chat Settings Dialog */}
      <AIChatSettings 
        open={showSettings}
        onOpenChange={setShowSettings}
        chatId={currentChat?.id}
      />
    </div>
  )
}