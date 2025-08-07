"use client"

import { useState, useEffect } from 'react'
import { Clock, RefreshCw, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { getTimeUntilExpiry, isTokenExpiring } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function TokenExpiryIndicator() {
  const { isAuthenticated, refreshToken, isLoading } = useAuth()
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [isExpiring, setIsExpiring] = useState<boolean>(false)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)

  // Update time left every minute
  useEffect(() => {
    if (!isAuthenticated) return

    const updateTimeLeft = () => {
      const minutes = getTimeUntilExpiry()
      setTimeLeft(minutes)
      setIsExpiring(isTokenExpiring())
    }

    // Initial update
    updateTimeLeft()

    // Update every minute
    const interval = setInterval(updateTimeLeft, 60000)

    return () => clearInterval(interval)
  }, [isAuthenticated])

  // Auto-show warning when token is expiring
  useEffect(() => {
    if (isExpiring && timeLeft > 0 && timeLeft <= 5) {
      toast.warning('Session expiring soon', {
        description: `Your session will expire in ${timeLeft} minute${timeLeft !== 1 ? 's' : ''}. Click to extend.`,
        duration: 10000,
        action: {
          label: 'Extend Session',
          onClick: handleRefreshToken
        }
      })
    }
  }, [isExpiring, timeLeft])

  const handleRefreshToken = async () => {
    try {
      setIsRefreshing(true)
      await refreshToken()
      toast.success('Session extended', {
        description: 'Your session has been refreshed successfully.'
      })
    } catch (error) {
      toast.error('Failed to extend session', {
        description: 'Please log in again to continue.'
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const formatTimeLeft = (minutes: number): string => {
    if (minutes <= 0) return 'Expired'
    if (minutes < 60) return `${minutes}m`
    
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  const getStatusColor = () => {
    if (timeLeft <= 0) return 'text-red-600 dark:text-red-400'
    if (timeLeft <= 5) return 'text-orange-600 dark:text-orange-400'
    if (timeLeft <= 15) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-green-600 dark:text-green-400'
  }

  const getIconColor = () => {
    if (timeLeft <= 0) return 'text-red-500'
    if (timeLeft <= 5) return 'text-orange-500'
    if (timeLeft <= 15) return 'text-yellow-500'
    return 'text-green-500'
  }

  // Don't show if not authenticated
  if (!isAuthenticated) return null

  // Don't show if loading or no time data
  if (isLoading || timeLeft === 0) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 px-2 gap-1 text-xs ${getStatusColor()} hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors`}
        >
          {isExpiring ? (
            <AlertTriangle className={`h-3 w-3 ${getIconColor()}`} />
          ) : (
            <Clock className={`h-3 w-3 ${getIconColor()}`} />
          )}
          <span className="hidden sm:inline">
            {formatTimeLeft(timeLeft)}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="end">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className={`h-4 w-4 ${getIconColor()}`} />
            <h4 className="font-medium text-sm">Session Status</h4>
          </div>
          
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Time remaining:</span>
              <span className={`font-medium ${getStatusColor()}`}>
                {formatTimeLeft(timeLeft)}
              </span>
            </div>
            
            {isExpiring && (
              <div className="p-2 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-md">
                <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                  <AlertTriangle className="h-3 w-3" />
                  <span className="text-xs font-medium">Session expiring soon</span>
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={handleRefreshToken}
            disabled={isRefreshing}
            size="sm"
            className="w-full"
            variant={isExpiring ? "default" : "outline"}
          >
            {isRefreshing ? (
              <>
                <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                Extending...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-2" />
                Extend Session
              </>
            )}
          </Button>
          
          <p className="text-xs text-muted-foreground text-center">
            Your session will be automatically refreshed when needed.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}