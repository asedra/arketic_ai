"use client"

import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { 
  FileText, 
  Search, 
  Upload, 
  Users, 
  Shield, 
  Sparkles,
  Plus,
  RefreshCw,
  Lightbulb,
  Rocket
} from 'lucide-react'

interface DelightfulEmptyStateProps {
  type?: 'search' | 'upload' | 'knowledge' | 'compliance' | 'organization' | 'general'
  title?: string
  description?: string
  actionLabel?: string
  secondaryActionLabel?: string
  onAction?: () => void
  onSecondaryAction?: () => void
  className?: string
  illustration?: React.ReactNode
}

const emptyStateConfig = {
  search: {
    icon: Search,
    title: "No results found",
    description: "We couldn't find anything matching your search. Try different keywords or check your filters.",
    actionLabel: "Clear filters",
    secondaryActionLabel: "Browse all",
    illustration: (
      <div className="relative">
        <Search className="h-16 w-16 text-slate-300 dark:text-slate-600" />
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-200 dark:bg-yellow-800 rounded-full flex items-center justify-center">
          <span className="text-xs">🔍</span>
        </div>
      </div>
    )
  },
  upload: {
    icon: Upload,
    title: "No files uploaded yet",
    description: "Start by uploading your first document. We support PDF, Word, and many other formats.",
    actionLabel: "Upload files",
    secondaryActionLabel: "Browse examples",
    illustration: (
      <div className="relative">
        <div className="w-20 h-24 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex items-center justify-center">
          <Upload className="h-8 w-8 text-slate-400" />
        </div>
        <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-blue-400 animate-bounce" />
      </div>
    )
  },
  knowledge: {
    icon: FileText,
    title: "Your knowledge base is empty",
    description: "Add documents, connect integrations, or create your first knowledge article to get started.",
    actionLabel: "Add knowledge",
    secondaryActionLabel: "Connect integration",
    illustration: (
      <div className="relative">
        <div className="flex space-x-2">
          <div className="w-12 h-16 bg-slate-100 dark:bg-slate-700 rounded border-l-4 border-blue-400" />
          <div className="w-12 h-16 bg-slate-100 dark:bg-slate-700 rounded border-l-4 border-green-400" />
          <div className="w-12 h-16 bg-slate-100 dark:bg-slate-700 rounded border-l-4 border-purple-400" />
        </div>
        <Lightbulb className="absolute -top-2 left-1/2 transform -translate-x-1/2 h-6 w-6 text-yellow-400 animate-pulse" />
      </div>
    )
  },
  compliance: {
    icon: Shield,
    title: "No compliance documents",
    description: "Start building your compliance library by adding standards, regulations, and frameworks.",
    actionLabel: "Add document",
    secondaryActionLabel: "Import standards",
    illustration: (
      <div className="relative">
        <Shield className="h-16 w-16 text-slate-300 dark:text-slate-600" />
        <div className="absolute inset-0 border-2 border-dashed border-green-300 dark:border-green-700 rounded-full animate-pulse" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-green-400 rounded-full animate-ping" />
      </div>
    )
  },
  organization: {
    icon: Users,
    title: "Organization setup needed",
    description: "Complete your organization profile to unlock powerful insights and collaboration features.",
    actionLabel: "Setup organization",
    secondaryActionLabel: "Import data",
    illustration: (
      <div className="relative">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-200 dark:bg-blue-800 rounded-full" />
          <div className="w-8 h-8 bg-green-200 dark:bg-green-800 rounded-full" />
          <div className="w-8 h-8 bg-purple-200 dark:bg-purple-800 rounded-full" />
        </div>
        <Rocket className="absolute -top-4 left-1/2 transform -translate-x-1/2 h-6 w-6 text-orange-400 animate-bounce" />
      </div>
    )
  },
  general: {
    icon: Sparkles,
    title: "Nothing here yet",
    description: "This space is ready for your content. Let's get started!",
    actionLabel: "Get started",
    secondaryActionLabel: "Learn more",
    illustration: (
      <div className="relative">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-full flex items-center justify-center">
          <Sparkles className="h-8 w-8 text-blue-500 animate-pulse" />
        </div>
      </div>
    )
  }
}

export function DelightfulEmptyState({
  type = 'general',
  title,
  description,
  actionLabel,
  secondaryActionLabel,
  onAction,
  onSecondaryAction,
  className,
  illustration
}: DelightfulEmptyStateProps) {
  const config = emptyStateConfig[type]
  const [isHovered, setIsHovered] = React.useState(false)

  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 px-6 text-center",
      "bg-gradient-to-br from-slate-50/50 to-white dark:from-slate-900/50 dark:to-slate-800/50",
      "rounded-xl border border-slate-200/50 dark:border-slate-700/50",
      "backdrop-blur-sm",
      className
    )}>
      {/* Illustration */}
      <div 
        className="mb-6 transform transition-all duration-300 ease-out"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          transform: isHovered ? 'scale(1.05) rotate(2deg)' : 'scale(1) rotate(0deg)'
        }}
      >
        {illustration || config.illustration}
      </div>

      {/* Content */}
      <div className="space-y-3 mb-8">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          {title || config.title}
        </h3>
        <p className="text-slate-600 dark:text-slate-400 max-w-md leading-relaxed">
          {description || config.description}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {onAction && (
          <Button 
            onClick={onAction}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            {actionLabel || config.actionLabel}
          </Button>
        )}
        
        {onSecondaryAction && (
          <Button 
            variant="outline" 
            onClick={onSecondaryAction}
            className="border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transform hover:scale-105 transition-all duration-200"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {secondaryActionLabel || config.secondaryActionLabel}
          </Button>
        )}
      </div>

      {/* Floating particles for ambiance */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-blue-300 dark:bg-blue-600 rounded-full opacity-60 animate-float"
            style={{
              left: `${20 + i * 30}%`,
              top: `${30 + i * 20}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3 + i}s`
            }}
          />
        ))}
      </div>
    </div>
  )
}

// Mini empty state for smaller spaces
export function MiniEmptyState({ 
  icon: Icon = FileText, 
  message = "No items found",
  className 
}: { 
  icon?: any
  message?: string
  className?: string 
}) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-8 px-4 text-center",
      "text-slate-500 dark:text-slate-400",
      className
    )}>
      <Icon className="h-8 w-8 mb-2 opacity-60" />
      <p className="text-sm">{message}</p>
    </div>
  )
}