"use client"

import React, { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useArketicStore } from '@/lib/state-manager'

interface ChatContentProps {
  className?: string
}

const ChatContent = memo(function ChatContent({ className }: ChatContentProps) {
  const chatMessage = useArketicStore(state => state.chatMessage)
  const selectedAssistant = useArketicStore(state => state.selectedAssistant)
  
  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      // This will be replaced with actual API call
      console.log('Sending message:', chatMessage)
      // setChatMessage('')
    }
  }
  
  return (
    <div className={cn('p-6 h-full flex flex-col', className)}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          AI Chat
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Chat with {selectedAssistant} and other AI assistants
        </p>
      </div>
      
      {/* Chat Container */}
      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            {selectedAssistant}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 space-y-4 mb-4 min-h-0 overflow-y-auto">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3">
                  <p className="text-slate-900 dark:text-slate-100">
                    Hello! I'm your AI assistant. How can I help you today?
                  </p>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Just now
                </p>
              </div>
            </div>
          </div>
          
          {/* Message Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Type your message..."
              value={chatMessage}
              onChange={(e) => {
                // This will be replaced with proper state management
                console.log('Message changed:', e.target.value)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              className="flex-1"
            />
            <Button onClick={handleSendMessage} size="sm">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

export default ChatContent
