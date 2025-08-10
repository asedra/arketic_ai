"use client"

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { ChatMessage } from '@/lib/stores/chat-store'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Copy, ThumbsUp, ThumbsDown, MoreHorizontal, Bot, User, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { LoadingSpinner } from '@/components/ui/loading'
import { MessageSources, RAGSource } from './MessageSources'

interface MessageListProps {
  messages: ChatMessage[]
  isLoading?: boolean
  className?: string
  autoScroll?: boolean
  onMessageAction?: (messageId: string, action: 'copy' | 'like' | 'dislike' | 'more') => void
}

export const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  isLoading = false, 
  className,
  autoScroll = true,
  onMessageAction
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [userHasScrolled, setUserHasScrolled] = useState(false)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const copyToClipboard = useCallback(async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      onMessageAction?.(messageId, 'copy')
      // TODO: Add toast notification
      console.log('Copied to clipboard')
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }, [onMessageAction])

  const formatTime = useCallback((date: Date | string) => {
    const validDate = date instanceof Date ? date : new Date(date)
    
    // Check if the date is valid
    if (isNaN(validDate.getTime())) {
      return 'Just now'
    }
    
    return formatDistanceToNow(validDate, { addSuffix: true })
  }, [])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && !userHasScrolled && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [messages, autoScroll, userHasScrolled])

  // Handle scroll events to detect user scrolling
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let scrollTimeout: NodeJS.Timeout
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      
      setUserHasScrolled(scrollTop < scrollHeight - clientHeight - 50)
      setShowScrollToBottom(!isNearBottom)
      
      // Reset user scroll detection after a delay
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        if (isNearBottom) {
          setUserHasScrolled(false)
        }
      }, 1000)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      container.removeEventListener('scroll', handleScroll)
      clearTimeout(scrollTimeout)
    }
  }, [])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    setUserHasScrolled(false)
  }, [])

  const handleMessageAction = useCallback((messageId: string, action: 'like' | 'dislike' | 'more') => {
    onMessageAction?.(messageId, action)
  }, [onMessageAction])

  return (
    <div className={cn('relative', className)}>
      <div 
        ref={containerRef}
        className="space-y-4 md:space-y-6 overflow-y-auto scroll-smooth"
        style={{ height: 'inherit' }}
      >
      {/* Initial Loading State */}
      {isLoading && messages.length === 0 && (
        <div className="flex justify-center items-center py-8">
          <LoadingSpinner text="Loading chat history..." />
        </div>
      )}
      
      {messages.map((message, index) => {
        const isAI = message.isAI
        const showAvatar = index === 0 || messages[index - 1]?.message_type !== message.message_type
        const showTimestamp = index === 0 || 
          (message.timestamp instanceof Date && messages[index - 1]?.timestamp instanceof Date &&
           message.timestamp.getTime() - messages[index - 1].timestamp.getTime()) > 5 * 60 * 1000 // 5 minutes
        const isStreaming = message.isStreaming
        const isLastMessage = index === messages.length - 1

        return (
          <div
            key={message.id}
            className={cn(
              'group flex gap-2 md:gap-3 px-2 md:px-0',
              isAI ? 'flex-row' : 'flex-row-reverse',
              isStreaming && 'animate-pulse',
              'transition-all duration-200 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 rounded-lg py-2'
            )}
          >
            {/* Avatar */}
            <div className="shrink-0">
              {showAvatar ? (
                <Avatar className="h-7 w-7 md:h-8 md:w-8">
                  <AvatarFallback className={cn(
                    'text-sm font-medium transition-colors',
                    isAI 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' 
                      : 'bg-gradient-to-r from-slate-600 to-slate-700 dark:from-slate-400 dark:to-slate-500 text-white dark:text-slate-900'
                  )}>
                    {isAI ? (
                      isStreaming ? <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" /> : <Bot className="h-3 w-3 md:h-4 md:w-4" />
                    ) : (
                      <User className="h-3 w-3 md:h-4 md:w-4" />
                    )}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="h-7 w-7 md:h-8 md:w-8" />
              )}
            </div>

            {/* Message Content */}
            <div className={cn(
              'flex-1 max-w-[85%] md:max-w-[80%] min-w-0',
              isAI ? 'mr-auto' : 'ml-auto'
            )}>
              {/* Timestamp */}
              {showTimestamp && (
                <div className={cn(
                  'text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium px-1',
                  isAI ? 'text-left' : 'text-right'
                )}>
                  {formatTime(message.timestamp)}
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={cn(
                  'relative rounded-2xl px-3 py-2 md:px-4 md:py-3 text-sm shadow-sm transition-all duration-200',
                  isAI
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md',
                  isStreaming && 'opacity-80',
                  'hover:shadow-md',
                  isLastMessage && isStreaming && 'animate-pulse'
                )}
              >
                {/* Message Content */}
                <div className="whitespace-pre-wrap break-words leading-relaxed">
                  {message.content}
                  {isStreaming && isLastMessage && (
                    <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1 align-text-bottom" />
                  )}
                </div>

                {/* AI Metadata */}
                {isAI && !isStreaming && (message.ai_model_used || message.tokens_used || message.processing_time_ms) && (
                  <div className="flex flex-wrap gap-1 mt-2 md:mt-3 pt-2 border-t border-slate-200 dark:border-slate-600">
                    {message.ai_model_used && (
                      <Badge variant="outline" className="text-xs bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600">
                        {message.ai_model_used}
                      </Badge>
                    )}
                    {message.tokens_used && (
                      <Badge variant="outline" className="text-xs bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600">
                        {typeof message.tokens_used === 'object' ? message.tokens_used.total : message.tokens_used} tokens
                      </Badge>
                    )}
                    {message.processing_time_ms && (
                      <Badge variant="outline" className="text-xs bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600">
                        {message.processing_time_ms}ms
                      </Badge>
                    )}
                  </div>
                )}

                {/* RAG Sources for AI Messages */}
                {isAI && !isStreaming && message.rag_sources && message.rag_sources.length > 0 && (
                  <MessageSources 
                    sources={message.rag_sources as RAGSource[]}
                    isCompact={true}
                    onSourceClick={(source) => {
                      console.log('Source clicked:', source)
                    }}
                  />
                )}

                {/* Message Status */}
                {message.is_edited && (
                  <div className="text-xs text-slate-400 dark:text-slate-500 mt-2 italic">
                    (edited)
                  </div>
                )}
              </div>

              {/* Message Actions */}
              {!isStreaming && (
                <div className={cn(
                  'flex items-center gap-1 mt-2 opacity-0 md:group-hover:opacity-100 transition-all duration-200',
                  'md:opacity-0 opacity-100', // Always show on mobile
                  isAI ? 'justify-start' : 'justify-end'
                )}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 md:h-7 md:w-7 p-0 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    onClick={() => copyToClipboard(message.content, message.id)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>

                  {isAI && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 md:h-7 md:w-7 p-0 text-slate-400 hover:text-green-600 dark:text-slate-500 dark:hover:text-green-400 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        onClick={() => handleMessageAction(message.id, 'like')}
                      >
                        <ThumbsUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 md:h-7 md:w-7 p-0 text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        onClick={() => handleMessageAction(message.id, 'dislike')}
                      >
                        <ThumbsDown className="h-3 w-3" />
                      </Button>
                    </>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 md:h-7 md:w-7 p-0 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    onClick={() => handleMessageAction(message.id, 'more')}
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="flex gap-2 md:gap-3 animate-in fade-in slide-in-from-bottom-2 px-2 md:px-0">
          <Avatar className="h-7 w-7 md:h-8 md:w-8">
            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
              <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-3 py-2 md:px-4 md:py-3 max-w-xs border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex space-x-1 items-center">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-blue-500 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-2 font-medium">AI is thinking...</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
      </div>
      
      {/* Scroll to Bottom Button */}
      {showScrollToBottom && (
        <Button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 h-10 w-10 p-0 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200"
          size="sm"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </Button>
      )}
    </div>
  )
}