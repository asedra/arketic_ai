"use client"

import React, { useEffect, useState } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TypingUser {
  userId: string
  chatId: string
  timestamp: Date
  userName?: string
  isAI?: boolean
}

interface TypingIndicatorProps {
  typingUsers: TypingUser[]
  className?: string
  maxUsersShown?: number
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ 
  typingUsers, 
  className, 
  maxUsersShown = 3 
}) => {
  const [dots, setDots] = useState('')
  
  // Animate dots
  useEffect(() => {
    if (typingUsers.length === 0) return
    
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return ''
        return prev + '.'
      })
    }, 500)
    
    return () => clearInterval(interval)
  }, [typingUsers.length])
  
  if (typingUsers.length === 0) return null
  
  // Filter and limit users
  const activeUsers = typingUsers.slice(0, maxUsersShown)
  const hasMoreUsers = typingUsers.length > maxUsersShown
  
  // Group by user type
  const aiUsers = activeUsers.filter(user => user.isAI)
  const humanUsers = activeUsers.filter(user => !user.isAI)
  
  // Determine what to show
  const showAI = aiUsers.length > 0
  const showHumans = humanUsers.length > 0

  // Create typing text
  const getTypingText = () => {
    if (showAI && showHumans) {
      return `AI and ${humanUsers.length} user${humanUsers.length > 1 ? 's' : ''} are typing${dots}`
    } else if (showAI) {
      return `AI is thinking${dots}`
    } else if (humanUsers.length === 1) {
      return `${humanUsers[0].userName || 'Someone'} is typing${dots}`
    } else {
      const count = humanUsers.length
      const extra = hasMoreUsers ? ` and ${typingUsers.length - maxUsersShown} more` : ''
      return `${count} users${extra} are typing${dots}`
    }
  }
  
  return (
    <div className={cn(
      "flex gap-2 md:gap-3 mt-3 md:mt-4 px-2 md:px-0 animate-in fade-in slide-in-from-bottom-2 duration-300",
      className
    )}>
      {/* Avatar */}
      <Avatar className="h-7 w-7 md:h-8 md:w-8 shrink-0">
        <AvatarFallback className={cn(
          "text-white transition-colors",
          showAI 
            ? "bg-gradient-to-r from-blue-500 to-purple-600" 
            : "bg-gradient-to-r from-slate-600 to-slate-700 dark:from-slate-400 dark:to-slate-500"
        )}>
          {showAI ? (
            <Bot className="h-3 w-3 md:h-4 md:w-4 animate-pulse" />
          ) : (
            <User className="h-3 w-3 md:h-4 md:w-4" />
          )}
        </AvatarFallback>
      </Avatar>
      
      {/* Typing Bubble */}
      <div className="flex-1 max-w-xs">
        <div className={cn(
          "rounded-2xl px-3 py-2 md:px-4 md:py-3 border shadow-sm transition-all duration-200",
          showAI 
            ? "bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-700 border-slate-200 dark:border-slate-600"
            : "bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 border-blue-200 dark:border-blue-800"
        )}>
          <div className="flex items-center space-x-2">
            <div className={cn(
              "text-sm font-medium flex-1 min-w-0",
              showAI 
                ? "text-slate-600 dark:text-slate-300" 
                : "text-blue-700 dark:text-blue-300"
            )}>
              {getTypingText()}
            </div>
            
            {/* Animated Dots */}
            <div className="flex space-x-1 shrink-0">
              <div className={cn(
                "w-1.5 h-1.5 rounded-full animate-bounce",
                showAI ? "bg-blue-500" : "bg-blue-600"
              )} />
              <div 
                className={cn(
                  "w-1.5 h-1.5 rounded-full animate-bounce",
                  showAI ? "bg-purple-500" : "bg-purple-600"
                )}
                style={{ animationDelay: '0.1s' }} 
              />
              <div 
                className={cn(
                  "w-1.5 h-1.5 rounded-full animate-bounce",
                  showAI ? "bg-blue-500" : "bg-blue-600"
                )}
                style={{ animationDelay: '0.2s' }} 
              />
            </div>
          </div>
          
          {/* Users List (for multiple users) */}
          {showHumans && humanUsers.length > 1 && (
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {humanUsers.slice(0, 2).map(user => user.userName || 'User').join(', ')}
              {humanUsers.length > 2 && ` and ${humanUsers.length - 2} more`}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}