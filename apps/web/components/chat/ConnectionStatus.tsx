"use client"

import React from 'react'
import { cn } from '@/lib/utils'
import { Wifi, WifiOff } from 'lucide-react'

interface ConnectionStatusProps {
  isConnected: boolean
  className?: string
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  isConnected, 
  className 
}) => {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {isConnected ? (
        <>
          <div className="relative">
            <Wifi className="h-3 w-3 text-green-500" />
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          </div>
          <span className="text-green-600 dark:text-green-400 text-xs font-medium">Connected</span>
        </>
      ) : (
        <>
          <div className="relative">
            <WifiOff className="h-3 w-3 text-red-500" />
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-400 rounded-full animate-pulse" />
          </div>
          <span className="text-red-600 dark:text-red-400 text-xs font-medium">Disconnected</span>
        </>
      )}
    </div>
  )
}