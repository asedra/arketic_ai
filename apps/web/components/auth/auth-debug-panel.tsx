"use client"

import React, { useState, useEffect } from 'react'
import { Bug, Eye, EyeOff, RefreshCw, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { authStorage, isAuthenticated, isTokenExpiring, getTimeUntilExpiry } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface AuthDebugPanelProps {
  className?: string
}

export function AuthDebugPanel({ className }: AuthDebugPanelProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>({})
  const { user, isLoading, error, refreshToken } = useAuth()

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  useEffect(() => {
    const interval = setInterval(() => {
      const token = authStorage.getToken()
      const refreshTokenValue = authStorage.getRefreshToken()
      
      setDebugInfo({
        token,
        refreshToken: refreshTokenValue,
        isAuthenticated: isAuthenticated(),
        isTokenExpiring: isTokenExpiring(),
        timeUntilExpiry: getTimeUntilExpiry(),
        tokenPayload: token ? tryDecodeToken(token) : null,
        localStorage: {
          auth_token: localStorage.getItem('auth_token'),
          refresh_token: localStorage.getItem('refresh_token'),
          user_data: localStorage.getItem('user_data'),
          remember_me: localStorage.getItem('remember_me'),
          redirect_after_login: localStorage.getItem('redirect_after_login')
        }
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const tryDecodeToken = (token: string) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return {
        ...payload,
        exp: new Date(payload.exp * 1000).toLocaleString(),
        iat: new Date(payload.iat * 1000).toLocaleString()
      }
    } catch {
      return null
    }
  }

  const handleClearStorage = () => {
    authStorage.clear()
    toast.success('Auth storage cleared')
  }

  const handleRefreshToken = async () => {
    try {
      await refreshToken()
      toast.success('Token refreshed successfully')
    } catch (error) {
      toast.error('Token refresh failed')
    }
  }

  const truncateToken = (token: string | null, show: boolean) => {
    if (!token) return 'null'
    if (show) return token
    return `${token.substring(0, 20)}...${token.substring(token.length - 10)}`
  }

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsVisible(true)}
          className="bg-yellow-100 hover:bg-yellow-200 border-yellow-300 text-yellow-800"
        >
          <Bug className="h-4 w-4 mr-2" />
          Auth Debug
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 w-80">
      <Card className="bg-yellow-50 border-yellow-200 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm text-yellow-800">
            <span className="flex items-center gap-2">
              <Bug className="h-4 w-4" />
              Auth Debug Panel
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsVisible(false)}
              className="h-6 w-6 p-0 hover:bg-yellow-200"
            >
              <EyeOff className="h-3 w-3" />
            </Button>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-3 text-xs">
          {/* Auth Status */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium">Status:</span>
              <Badge variant={debugInfo.isAuthenticated ? "default" : "destructive"}>
                {debugInfo.isAuthenticated ? "Authenticated" : "Not Authenticated"}
              </Badge>
            </div>
            
            {debugInfo.isAuthenticated && (
              <div className="flex items-center justify-between">
                <span className="font-medium">Expires in:</span>
                <Badge variant={debugInfo.isTokenExpiring ? "destructive" : "secondary"}>
                  {debugInfo.timeUntilExpiry}m
                </Badge>
              </div>
            )}
          </div>

          {/* User Info */}
          {user && (
            <div className="space-y-1">
              <div className="font-medium">User:</div>
              <div className="text-slate-600 pl-2">
                <div>Email: {user.email}</div>
                <div>Name: {user.firstName} {user.lastName}</div>
                <div>Role: {user.role}</div>
              </div>
            </div>
          )}

          {/* Context State */}
          <div className="space-y-1">
            <div className="font-medium">Context:</div>
            <div className="text-slate-600 pl-2">
              <div>Loading: {isLoading ? 'true' : 'false'}</div>
              {error && <div className="text-red-600">Error: {error}</div>}
            </div>
          </div>

          {/* Tokens */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">Tokens:</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowToken(!showToken)}
                className="h-5 w-5 p-0"
              >
                {showToken ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
            </div>
            
            <div className="text-slate-600 pl-2 break-all">
              <div>Access: {truncateToken(debugInfo.token, showToken)}</div>
              <div>Refresh: {truncateToken(debugInfo.refreshToken, showToken)}</div>
            </div>
          </div>

          {/* Token Payload */}
          {debugInfo.tokenPayload && (
            <div className="space-y-1">
              <div className="font-medium">Token Claims:</div>
              <div className="text-slate-600 pl-2">
                <div>Sub: {debugInfo.tokenPayload.sub}</div>
                <div>Exp: {debugInfo.tokenPayload.exp}</div>
                <div>Iat: {debugInfo.tokenPayload.iat}</div>
              </div>
            </div>
          )}

          {/* Storage */}
          <div className="space-y-1">
            <div className="font-medium">Storage:</div>
            <div className="text-slate-600 pl-2">
              {Object.entries(debugInfo.localStorage || {}).map(([key, value]) => (
                <div key={key}>
                  {key}: {value ? '✓' : '✗'}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-1 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefreshToken}
              className="flex-1 h-7 text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={handleClearStorage}
              className="flex-1 h-7 text-xs text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}