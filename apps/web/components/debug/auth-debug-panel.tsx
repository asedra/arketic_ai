"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { authStorage } from '@/lib/auth'

interface TokenDebugInfo {
  accessToken: string | null
  refreshToken: string | null
  rememberMe: boolean
  decodedToken?: any
  isExpired?: boolean
  timeUntilExpiry?: string
}

export function AuthDebugPanel() {
  const { user, isAuthenticated, isLoading, error } = useAuth()
  const [tokenInfo, setTokenInfo] = useState<TokenDebugInfo>({
    accessToken: null,
    refreshToken: null,
    rememberMe: false
  })
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const updateTokenInfo = () => {
      const accessToken = authStorage.getToken()
      const refreshToken = authStorage.getRefreshToken()
      const rememberMe = authStorage.getRememberMe()
      
      let decodedToken = null
      let isExpired = false
      let timeUntilExpiry = ''
      
      if (accessToken) {
        try {
          const parts = accessToken.split('.')
          if (parts.length === 3) {
            decodedToken = JSON.parse(atob(parts[1]))
            const expiryTime = decodedToken.exp * 1000
            const currentTime = Date.now()
            isExpired = currentTime >= expiryTime
            const timeLeft = expiryTime - currentTime
            
            if (timeLeft > 0) {
              const minutes = Math.floor(timeLeft / (1000 * 60))
              const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000)
              timeUntilExpiry = `${minutes}m ${seconds}s`
            } else {
              timeUntilExpiry = 'Expired'
            }
          }
        } catch (e) {
          console.error('Error decoding token:', e)
        }
      }
      
      setTokenInfo({
        accessToken,
        refreshToken,
        rememberMe,
        decodedToken,
        isExpired,
        timeUntilExpiry
      })
    }
    
    updateTokenInfo()
    
    // Update every second for real-time expiry countdown
    const interval = setInterval(updateTokenInfo, 1000)
    
    return () => clearInterval(interval)
  }, [])

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
      >
        Auth Debug
      </button>
    )
  }

  const clearStorage = () => {
    authStorage.clear()
    setTokenInfo({
      accessToken: null,
      refreshToken: null,
      rememberMe: false
    })
  }

  return (
    <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white p-4 rounded-lg shadow-xl max-w-md text-xs">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-sm">Auth Debug Panel</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-slate-400 hover:text-white"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2">
        <div>
          <strong>Status:</strong> {isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
        </div>
        
        <div>
          <strong>Context:</strong>
          <div className="ml-2">
            Loading: {isLoading ? '🔄 Yes' : '✅ No'}
          </div>
        </div>
        
        <div>
          <strong>User:</strong> {user ? `${user.firstName} ${user.lastName} (${user.email})` : 'None'}
        </div>
        
        {error && (
          <div>
            <strong className="text-red-400">Error:</strong> {error}
          </div>
        )}
        
        <div>
          <strong>Tokens:</strong>
          <div className="ml-2">
            Access: {tokenInfo.accessToken ? (
              <span className={tokenInfo.isExpired ? 'text-red-400' : 'text-green-400'}>
                ✅ Present {tokenInfo.isExpired ? '(Expired)' : `(${tokenInfo.timeUntilExpiry})`}
              </span>
            ) : '❌ None'}
          </div>
          <div className="ml-2">
            Refresh: {tokenInfo.refreshToken ? '✅ Present' : '❌ None'}
          </div>
          <div className="ml-2">
            Remember Me: {tokenInfo.rememberMe ? '✅ Yes' : '❌ No'}
          </div>
        </div>
        
        {tokenInfo.decodedToken && (
          <div>
            <strong>Token Info:</strong>
            <div className="ml-2 text-xs">
              Subject: {tokenInfo.decodedToken.sub}<br/>
              Email: {tokenInfo.decodedToken.email}<br/>
              Issued: {new Date(tokenInfo.decodedToken.iat * 1000).toLocaleString()}<br/>
              Expires: {new Date(tokenInfo.decodedToken.exp * 1000).toLocaleString()}
            </div>
          </div>
        )}
        
        <div className="flex gap-2 mt-3">
          <button
            onClick={clearStorage}
            className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs"
          >
            Clear Storage
          </button>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs"
          >
            Reload
          </button>
        </div>
      </div>
    </div>
  )
}