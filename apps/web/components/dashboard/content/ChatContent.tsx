"use client"

import React, { memo, useEffect } from 'react'
import { ChatWindow, ChatSidebar } from '@/components/chat'
import { useChatStore } from '@/lib/stores/chat-store'
import { cn } from '@/lib/utils'

interface ChatContentProps {
  className?: string
}

const ChatContent = memo(function ChatContent({ className }: ChatContentProps) {
  const { loadChats } = useChatStore()
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)

  useEffect(() => {
    // Load chats when the component mounts
    loadChats()
    
    // Cleanup function to disconnect WebSocket connections when leaving
    return () => {
      // Don't reset the store, just disconnect WebSocket connections
      // reset() would clear all chat data
    }
  }, [loadChats])

  return (
    <div className={cn('h-full flex overflow-hidden', className)}>
      {/* Chat Sidebar */}
      <div className={cn(
        "shrink-0 transition-all duration-300 ease-in-out border-r border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm",
        sidebarCollapsed ? "w-0" : "w-80",
        sidebarCollapsed && "hidden"
      )}>
        <ChatSidebar />
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 min-w-0">
        <ChatWindow />
      </div>
      
      {/* Toggle Button for Mobile */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="fixed bottom-4 left-4 z-10 lg:hidden bg-blue-500 text-white p-2 rounded-full shadow-lg hover:bg-blue-600 transition-colors"
      >
        {sidebarCollapsed ? '📝' : '✕'}
      </button>
    </div>
  )
})

export default ChatContent
