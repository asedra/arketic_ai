"use client"

import React, { useEffect } from 'react'
import { ChatWindow, ChatSidebar } from '@/components/chat'
import { useChatStore } from '@/lib/stores/chat-store'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

export default function ChatPage() {
  const { loadChats, reset } = useChatStore()
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)

  useEffect(() => {
    // Load chats when the page mounts
    loadChats()
    
    // Cleanup function to disconnect WebSocket connections when leaving the page
    return () => {
      // Don't reset the store, just disconnect WebSocket connections
      // reset() would clear all chat data
    }
  }, [loadChats])

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </Button>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                AI Chat
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">
                Powered by advanced AI models
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="lg:hidden"
            >
              {sidebarCollapsed ? 'Show Chats' : 'Hide Chats'}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex w-full pt-16">
        {/* Chat Sidebar */}
        <div className={cn(
          "shrink-0 transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "w-0 lg:w-80" : "w-80",
          "lg:block",
          sidebarCollapsed && "hidden lg:block"
        )}>
          <div className="h-full border-r border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <ChatSidebar />
          </div>
        </div>
        
        {/* Main Chat Area */}
        <div className="flex-1 min-w-0">
          <ChatWindow />
        </div>
      </div>
    </div>
  )
}
