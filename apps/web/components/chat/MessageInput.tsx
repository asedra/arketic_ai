"use client"

import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Paperclip, Mic, Square } from 'lucide-react'
import { useChatStore } from '@/lib/stores/chat-store'
import { chatApi, settingsApi } from '@/lib/api-client'

interface MessageInputProps {
  onSendMessage: (content: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = "Type your message...",
  className
}) => {
  const [message, setMessage] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [hasOpenAISettings, setHasOpenAISettings] = useState(false)
  const [isCheckingSettings, setIsCheckingSettings] = useState(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  const { currentChatId } = useChatStore()

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`
    }
  }, [message])

  // Handle typing indicator
  useEffect(() => {
    if (message.trim() && !isTyping && currentChatId) {
      setIsTyping(true)
      // Send typing indicator via WebSocket
      try {
        chatApi.sendTypingIndicator(currentChatId, true)
      } catch (error) {
        console.error('Failed to send typing indicator:', error)
      }
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping && currentChatId) {
        setIsTyping(false)
        // Send stop typing indicator via WebSocket
        try {
          chatApi.sendTypingIndicator(currentChatId, false)
        } catch (error) {
          console.error('Failed to send stop typing indicator:', error)
        }
      }
    }, 1000)

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [message, isTyping, currentChatId])

  // Check OpenAI settings on mount
  useEffect(() => {
    const checkOpenAISettings = async () => {
      setIsCheckingSettings(true)
      try {
        const response = await settingsApi.getOpenAISettings()
        setHasOpenAISettings(response.success && !!response.data)
      } catch (error) {
        setHasOpenAISettings(false)
      } finally {
        setIsCheckingSettings(false)
      }
    }
    
    checkOpenAISettings()
  }, [])

  const handleSend = () => {
    if (!message.trim() || disabled) return
    
    onSendMessage(message.trim())
    setMessage('')
    
    // Stop typing indicator
    if (isTyping && currentChatId) {
      setIsTyping(false)
      // Send stop typing indicator via WebSocket
      try {
        chatApi.sendTypingIndicator(currentChatId, false)
      } catch (error) {
        console.error('Failed to send stop typing indicator:', error)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleVoiceRecord = () => {
    // TODO: Implement voice recording
    if (!isRecording) {
      setIsRecording(true)
      console.log('Start recording...')
    } else {
      setIsRecording(false)
      console.log('Stop recording...')
    }
  }

  const handleFileAttach = () => {
    // TODO: Implement file attachment
    console.log('File attachment...')
  }

  const canSend = message.trim().length > 0 && !disabled && hasOpenAISettings && !isCheckingSettings
  
  const getPlaceholder = () => {
    if (isCheckingSettings) {
      return "Checking AI settings..."
    }
    if (!hasOpenAISettings) {
      return "Configure OpenAI API key in Settings to enable AI chat"
    }
    return placeholder
  }
  
  const isInputDisabled = disabled || !hasOpenAISettings || isCheckingSettings

  return (
    <div className={cn('p-3 md:p-4', className)}>
      <div className="relative">
        {/* Input Container */}
        <div className="flex items-end gap-1 md:gap-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 focus-within:border-blue-500 dark:focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-500/20 dark:focus-within:ring-blue-400/20 transition-all duration-200 shadow-sm">
          {/* Attachment Button */}
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 m-1.5 md:m-2 h-7 w-7 md:h-8 md:w-8 p-0 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            onClick={handleFileAttach}
            disabled={isInputDisabled}
          >
            <Paperclip className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </Button>

          {/* Text Input */}
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder()}
            disabled={isInputDisabled}
            className="flex-1 min-h-[40px] max-h-[120px] md:max-h-[150px] border-0 bg-transparent resize-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm px-0 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400"
            rows={1}
          />

          {/* Voice Recording Button */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "shrink-0 m-1.5 md:m-2 h-7 w-7 md:h-8 md:w-8 p-0 transition-all duration-200 rounded-full",
              isRecording 
                ? "text-red-600 hover:text-red-700 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900/50" 
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
            )}
            onClick={handleVoiceRecord}
            disabled={isInputDisabled}
          >
            {isRecording ? (
              <Square className="h-3.5 w-3.5 md:h-4 md:w-4" />
            ) : (
              <Mic className="h-3.5 w-3.5 md:h-4 md:w-4" />
            )}
          </Button>

          {/* Send Button */}
          <Button
            size="sm"
            className={cn(
              "shrink-0 m-1.5 md:m-2 h-7 w-7 md:h-8 md:w-8 p-0 rounded-full transition-all duration-200",
              canSend
                ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transform hover:scale-105"
                : "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
            )}
            onClick={handleSend}
            disabled={!canSend}
          >
            <Send className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </Button>
        </div>

        {/* Recording Indicator */}
        {isRecording && (
          <div className="absolute -top-14 left-4 right-4 bg-gradient-to-r from-red-600 to-red-700 text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="font-medium">Recording... Tap to stop</span>
          </div>
        )}

        {/* Character Count */}
        {message.length > 0 && (
          <div className={cn(
            "absolute -top-6 right-2 text-xs transition-colors",
            message.length > 3800 ? "text-red-500 dark:text-red-400" : 
            message.length > 3500 ? "text-amber-500 dark:text-amber-400" : 
            "text-slate-400 dark:text-slate-500"
          )}>
            {message.length}/4000
          </div>
        )}
      </div>

      {/* OpenAI Settings Warning */}
      {!isCheckingSettings && !hasOpenAISettings && (
        <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
            <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
              <span className="text-white text-xs">!</span>
            </div>
            <span className="font-medium">OpenAI API Key Required</span>
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 ml-6">
            To enable AI chat, please configure your OpenAI API key in the Settings.
          </p>
        </div>
      )}

      {/* Hint Text */}
      {hasOpenAISettings && !isCheckingSettings && (
        <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 text-center">
          Press <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-medium">Enter</kbd> to send, <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-medium">Shift+Enter</kbd> for line break
        </div>
      )}
    </div>
  )
}