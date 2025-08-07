"use client"

import React, { useState, useEffect } from 'react'
import { FloatingActionButton } from './delightful-button'
import { DelightfulButton } from './delightful-button'
import { Card, CardContent } from './card'
import { 
  MessageCircle, 
  Sparkles, 
  Upload, 
  Plus, 
  RefreshCw,
  Lightbulb,
  X,
  ChevronUp,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface FloatingAssistantProps {
  className?: string
}

const quickActions = [
  {
    id: 'chat',
    label: 'Ask AI Assistant',
    icon: MessageCircle,
    color: 'bg-blue-600 hover:bg-blue-700',
    description: 'Get instant help from our AI'
  },
  {
    id: 'upload',
    label: 'Upload Document',
    icon: Upload,
    color: 'bg-green-600 hover:bg-green-700',
    description: 'Add files to knowledge base'
  },
  {
    id: 'sync',
    label: 'Sync Data',
    icon: RefreshCw,
    color: 'bg-purple-600 hover:bg-purple-700',
    description: 'Refresh all integrations'
  },
  {
    id: 'insights',
    label: 'Get Insights',
    icon: Lightbulb,
    color: 'bg-orange-600 hover:bg-orange-700',
    description: 'Generate smart recommendations'
  }
]

const helpfulTips = [
  "💡 Tip: Use Ctrl+K to quickly search across all your documents",
  "⚡ Pro tip: Auto-sync keeps your compliance data always up-to-date",
  "🎯 Hint: Tag documents for faster organization and retrieval",
  "🚀 Did you know? Our AI can summarize 100-page documents in seconds",
  "✨ Tip: Create custom workflows to automate repetitive tasks"
]

export function FloatingAssistant({ className }: FloatingAssistantProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentTip, setCurrentTip] = useState(0)
  const [showTip, setShowTip] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()
  
  // Show helpful tips periodically
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % helpfulTips.length)
      setShowTip(true)
      
      // Hide tip after 4 seconds
      setTimeout(() => setShowTip(false), 4000)
    }, 30000) // Show every 30 seconds
    
    return () => clearInterval(tipInterval)
  }, [])
  
  const handleQuickAction = async (actionId: string) => {
    setIsProcessing(true)
    setIsOpen(false)
    
    // Simulate action processing
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    switch (actionId) {
      case 'chat':
        toast({
          title: "AI Assistant Ready!",
          description: "How can I help you today?"
        })
        break
      case 'upload':
        toast({
          title: "Upload Started!",
          description: "Your files are being processed..."
        })
        break
      case 'sync':
        toast({
          title: "Sync Complete!",
          description: "All your data is up to date."
        })
        break
      case 'insights':
        toast({
          title: "Insights Generated!",
          description: "Check your dashboard for new recommendations."
        })
        break
    }
    
    setIsProcessing(false)
  }
  
  return (
    <div className={cn("fixed bottom-6 right-6 z-50", className)}>
      {/* Helpful Tips Tooltip */}
      {showTip && !isOpen && (
        <div className="absolute bottom-20 right-0 mb-2 animate-slide-in-up">
          <div className="bg-slate-900 text-white text-sm rounded-lg p-3 max-w-64 shadow-lg">
            <p>{helpfulTips[currentTip]}</p>
            <div className="absolute bottom-0 right-6 w-3 h-3 bg-slate-900 transform rotate-45 translate-y-1.5" />
          </div>
        </div>
      )}
      
      {/* Quick Actions Menu */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 mb-2 animate-slide-in-up">
          <Card className="w-64 shadow-xl border-slate-200 dark:border-slate-700">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                    <Zap className="h-4 w-4 text-blue-500" />
                    <span>Quick Actions</span>
                  </h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                {quickActions.map((action, index) => {
                  const Icon = action.icon
                  return (
                    <DelightfulButton
                      key={action.id}
                      onClick={() => handleQuickAction(action.id)}
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-full justify-start text-left h-auto p-3",
                        "animate-slide-in-up",
                        `stagger-${index + 1}`
                      )}
                      ripple
                    >
                      <div className="flex items-center space-x-3">
                        <div className={cn("p-2 rounded-lg", action.color)}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {action.label}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {action.description}
                          </p>
                        </div>
                      </div>
                    </DelightfulButton>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Main FAB */}
      <FloatingActionButton
        onClick={() => setIsOpen(!isOpen)}
        variant="primary"
        label={isOpen ? "Close" : "Quick Actions"}
        icon={isProcessing ? 
          () => <RefreshCw className="h-6 w-6 animate-spin" /> :
          isOpen ? 
            () => <X className="h-6 w-6" /> :
            () => (
              <div className="relative">
                <Sparkles className="h-6 w-6" />
                {!showTip && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                )}
              </div>
            )
        }
        className={cn(
          "transition-all duration-300",
          isOpen && "rotate-180",
          isProcessing && "animate-pulse"
        )}
      />
    </div>
  )
}