"use client"

import React, { memo, useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { useToast } from '@/hooks/use-toast'
import { Settings, Key, Eye, EyeOff, Save, Shield, TestTube, CheckCircle, Loader2, AlertCircle, Sparkles, Heart, Zap, Lock, UserCheck, Clock, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { settingsApi, systemSettingsApi, SystemSettings, SystemSettingsUpdate } from '@/lib/api-client'

interface SettingsContentProps {
  className?: string
}

const SettingsContent = memo(function SettingsContent({ className }: SettingsContentProps) {
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [celebrationStage, setCelebrationStage] = useState(0)
  const [language, setLanguage] = useState<'en' | 'tr'>('en')
  const [hasStoredKey, setHasStoredKey] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null)
  const [isLoadingSystemSettings, setIsLoadingSystemSettings] = useState(false)
  const [isSavingSystemSettings, setIsSavingSystemSettings] = useState(false)
  const [systemSettingsSaved, setSystemSettingsSaved] = useState(false)
  const { toast } = useToast()

  // Load settings from backend on component mount
  useEffect(() => {
    loadSettings()
    loadSystemSettings()
    // Detect language preference (could be from user settings or browser)
    const browserLang = navigator.language.toLowerCase()
    if (browserLang.startsWith('tr')) {
      setLanguage('tr')
    }
  }, [])

  // Reset success state and manage celebration sequence
  useEffect(() => {
    if (justSaved) {
      // Start celebration sequence
      setCelebrationStage(1)
      setShowConfetti(true)
      
      // Stage 2: Button bounce after 200ms
      const stage2Timer = setTimeout(() => setCelebrationStage(2), 200)
      
      // Stage 3: Glow effect after 600ms  
      const stage3Timer = setTimeout(() => setCelebrationStage(3), 600)
      
      // Hide confetti after 2 seconds
      const confettiTimer = setTimeout(() => setShowConfetti(false), 2000)
      
      // Reset everything after 4 seconds
      const resetTimer = setTimeout(() => {
        setJustSaved(false)
        setCelebrationStage(0)
      }, 4000)
      
      return () => {
        clearTimeout(stage2Timer)
        clearTimeout(stage3Timer) 
        clearTimeout(confettiTimer)
        clearTimeout(resetTimer)
      }
    }
  }, [justSaved])

  // Reset test status after showing for 5 seconds
  useEffect(() => {
    if (testStatus !== 'idle') {
      const timer = setTimeout(() => {
        setTestStatus('idle')
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [testStatus])

  const loadSettings = async () => {
    try {
      // Use the backend API to load OpenAI settings
      const response = await settingsApi.getSettings()
      console.log('🔄 Loading settings from backend:', response)
      
      if (response.success && response.data?.openai) {
        const openaiSettings = response.data.openai
        console.log('✅ Found OpenAI settings:', openaiSettings)
        
        
        // Show masked placeholder for API key (backend returns masked key for security)
        if (openaiSettings.api_key) {
          setApiKey('•'.repeat(20)) // Show masked placeholder
          setHasStoredKey(true) // Mark that we have a stored key
        }
      } else {
        console.log('⚠️ No OpenAI settings found in backend response')
        setHasStoredKey(false)
      }
    } catch (error: any) {
      console.error('Error loading settings from backend:', error)
      
      // Check if it's an authentication error
      if (error.status === 401) {
        console.log('🔐 Authentication required for settings')
        // Don't show error toast for auth errors, just mark as no stored key
        setHasStoredKey(false)
        return
      }
      
      // Fallback to localStorage for backward compatibility only on other errors
      console.log('🔄 Falling back to localStorage...')
      const savedApiKey = localStorage.getItem('openai-api-key')
      if (savedApiKey) {
        try {
          const decoded = atob(savedApiKey)
          setApiKey(decoded)
          setHasStoredKey(true)
          console.log('✅ Loaded API key from localStorage fallback')
        } catch (decodeError) {
          console.error('Error decoding API key from localStorage:', decodeError)
          localStorage.removeItem('openai-api-key') // Clean up invalid data
        }
      } else {
        setHasStoredKey(false)
      }
    }
  }

  const loadSystemSettings = async () => {
    setIsLoadingSystemSettings(true)
    try {
      const response = await systemSettingsApi.getSystemSettings()
      if (response.success && response.data) {
        setSystemSettings(response.data)
        console.log('✅ Loaded system settings:', response.data)
      }
    } catch (error: any) {
      console.error('Error loading system settings:', error)
      // Only admins can access system settings, so this is expected for regular users
      if (error.status === 403 || error.status === 401) {
        console.log('🔐 Admin privileges required for system settings')
      }
    } finally {
      setIsLoadingSystemSettings(false)
    }
  }

  const handleSystemSettingChange = (key: keyof SystemSettingsUpdate, value: any) => {
    if (systemSettings) {
      setSystemSettings({
        ...systemSettings,
        [key]: value
      })
    }
  }

  const saveSystemSettings = async () => {
    if (!systemSettings) return
    
    setIsSavingSystemSettings(true)
    setSystemSettingsSaved(false)
    try {
      const response = await systemSettingsApi.updateSystemSettings(systemSettings)
      if (response.success) {
        setSystemSettingsSaved(true)
        toast({
          title: (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="font-semibold">
                {language === 'tr' ? 'Başarılı' : 'Success'}
              </span>
            </div>
          ),
          description: language === 'tr' 
            ? 'Sistem ayarları başarıyla güncellendi'
            : 'System settings updated successfully',
          className: "border-green-200 bg-green-50 text-green-900"
        })
        // Reload settings to get the updated values
        await loadSystemSettings()
        
        // Reset saved state after 3 seconds
        setTimeout(() => {
          setSystemSettingsSaved(false)
        }, 3000)
      }
    } catch (error: any) {
      console.error('Error saving system settings:', error)
      setSystemSettingsSaved(false)
      toast({
        title: "Error",
        description: error.message || (language === 'tr' 
          ? 'Sistem ayarları kaydedilemedi'
          : 'Failed to save system settings'),
        variant: "destructive"
      })
    } finally {
      setIsSavingSystemSettings(false)
    }
  }

  const resetSystemSettings = async () => {
    setIsSavingSystemSettings(true)
    try {
      const response = await systemSettingsApi.resetToDefaults()
      if (response.success) {
        toast({
          title: (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-500" />
              <span className="font-semibold">
                {language === 'tr' ? 'Başarılı' : 'Success'}
              </span>
            </div>
          ),
          description: language === 'tr' 
            ? 'Sistem ayarları varsayılan değerlere döndürüldü'
            : 'System settings reset to defaults',
          className: "border-blue-200 bg-blue-50 text-blue-900"
        })
        // Reload settings to get the default values
        await loadSystemSettings()
      }
    } catch (error: any) {
      console.error('Error resetting system settings:', error)
      toast({
        title: "Error",
        description: error.message || (language === 'tr' 
          ? 'Sistem ayarları sıfırlanamadı'
          : 'Failed to reset system settings'),
        variant: "destructive"
      })
    } finally {
      setIsSavingSystemSettings(false)
    }
  }

  const getMessages = () => {
    if (language === 'tr') {
      return {
        success: {
          title: "Harika! 🎉",
          description: "API anahtarınız güvenle kaydedildi ve kullanıma hazır! Artık yapay zeka gücünden faydalanabilirsiniz.",
          buttonText: "Ayarları Kaydet",
          celebration: "Tebrikler! Hazırsınız! ✨"
        },
        error: {
          apiKeyRequired: "Lütfen bir API anahtarı girin",
          invalidApiKey: "Lütfen geçerli bir OpenAI API anahtarı girin ('sk-' ile başlamalı)",
          saveFailed: "OpenAI ayarları kaydedilemedi",
          testFirst: "Lütfen önce API anahtarınızı kaydedin",
          connectionFailed: "OpenAI API bağlantısı başarısız",
          clearFailed: "OpenAI ayarları temizlenemedi"
        },
        buttons: {
          saving: "Kaydediliyor...",
          save: "Ayarları Kaydet",
          testing: "Test ediliyor...",
          test: "Bağlantıyı Test Et",
          clear: "Ayarları Temizle"
        }
      }
    }
    
    return {
      success: {
        title: "Fantastic! 🎉",
        description: "Your API key is securely saved and ready to power your AI experience! You're all set to unleash the magic.",
        buttonText: "Save Settings",
        celebration: "Congratulations! You're ready to rock! ✨"
      },
      error: {
        apiKeyRequired: "Please enter an API key",
        invalidApiKey: "Please enter a valid OpenAI API key (starts with 'sk-')",
        saveFailed: "Failed to save OpenAI settings",
        testFirst: "Please save your API key first",
        connectionFailed: "Failed to connect to OpenAI API",
        clearFailed: "Failed to clear OpenAI settings"
      },
      buttons: {
        saving: "Saving...",
        save: "Save Settings",
        testing: "Testing...",
        test: "Test Connection",
        clear: "Clear Settings"
      }
    }
  }

  const handleSaveApiKey = async () => {
    const messages = getMessages()
    
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: messages.error.apiKeyRequired,
        variant: "destructive"
      })
      return
    }

    // Basic validation for OpenAI API key format
    if (!apiKey.startsWith('sk-') || apiKey.length < 20) {
      toast({
        title: "Invalid API Key",
        description: messages.error.invalidApiKey,
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    setJustSaved(false)
    
    try {
      const openaiSettings = {
        api_key: apiKey,
        model: 'gpt-3.5-turbo'
      }

      const response = await settingsApi.updateOpenAISettings(openaiSettings)
      
      if (response.success) {
        setJustSaved(true)
        setHasStoredKey(true) // Mark that we now have a stored key
        
        // Create a subtle "success" sound indication (visual feedback)
        // In a real app, this could play an actual sound
        console.log('🎵 Success sound: Settings saved! 🎉')
        
        // Show delightful success toast with celebration
        toast({
          title: (
            <div className="flex items-center gap-2 animate-bounce">
              <div className="relative">
                <CheckCircle className="h-5 w-5 text-green-500 animate-pulse" />
                <Sparkles className="h-3 w-3 text-yellow-500 absolute -top-1 -right-1 animate-spin" />
              </div>
              <span className="font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                {messages.success.title}
              </span>
            </div>
          ),
          description: (
            <div className="text-sm mt-2 space-y-2">
              <p className="text-green-700">{messages.success.description}</p>
              <div className="flex items-center gap-1 text-green-600 font-medium text-xs">
                <Heart className="h-3 w-3 text-red-400 animate-pulse" />
                <span>{messages.success.celebration}</span>
              </div>
            </div>
          ),
          className: "border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 text-green-900 shadow-xl border-2 transform transition-all duration-300 hover:scale-105",
          duration: 6000
        })
        
        // Also save to localStorage as backup
        localStorage.setItem('openai-api-key', btoa(apiKey))
      } else {
        throw new Error(response.message || 'Failed to save settings')
      }
    } catch (error: any) {
      console.error('Error saving API key:', error)
      
      let errorMessage = messages.error.saveFailed
      
      // Handle specific error types
      if (error.status === 401 || error.status === 403) {
        errorMessage = language === 'tr' ? 'Oturum süresi doldu. Lütfen tekrar giriş yapın.' : 'Session expired. Please log in again.'
      } else if (error.status === 400) {
        errorMessage = language === 'tr' ? 'API anahtarı geçersiz. Lütfen kontrol edin.' : 'Invalid API key. Please check and try again.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast({
        title: (
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span className="font-semibold">Error</span>
          </div>
        ),
        description: errorMessage,
        variant: "destructive",
        duration: 5000
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearApiKey = async () => {
    const messages = getMessages()
    
    try {
      await settingsApi.clearOpenAISettings()
      setApiKey('')
      setJustSaved(false)
      setHasStoredKey(false) // Clear stored key status
      localStorage.removeItem('openai-api-key')
      
      toast({
        title: (
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-blue-500" />
            <span className="font-semibold">Success</span>
          </div>
        ),
        description: language === 'tr' ? "OpenAI ayarları başarıyla temizlendi" : "OpenAI settings cleared successfully",
        className: "border-blue-200 bg-blue-50 text-blue-900"
      })
    } catch (error) {
      console.error('Error clearing settings:', error)
      toast({
        title: "Error",
        description: messages.error.clearFailed,
        variant: "destructive"
      })
    }
  }

  const handleTestConnection = async () => {
    const messages = getMessages()
    
    // Check if we have either a stored key or a new key entered
    const hasNewKey = apiKey.trim() && apiKey !== '•'.repeat(20)
    
    if (!hasNewKey && !hasStoredKey) {
      toast({
        title: "Error",
        description: messages.error.testFirst,
        variant: "destructive"
      })
      return
    }

    // Basic validation for OpenAI API key format if it's a new key (not masked)
    if (hasNewKey && !apiKey.includes('•') && (!apiKey.startsWith('sk-') || apiKey.length < 20)) {
      toast({
        title: "Invalid API Key",
        description: messages.error.invalidApiKey,
        variant: "destructive"
      })
      return
    }

    setIsTesting(true)
    setTestStatus('idle') // Reset status before testing
    
    try {
      // First save the API key if it's not masked (new key entered)
      if (hasNewKey && !apiKey.includes('•')) {
        const openaiSettings = {
          api_key: apiKey,
          model: 'gpt-3.5-turbo'
        }

        const saveResponse = await settingsApi.updateOpenAISettings(openaiSettings)
        
        if (!saveResponse.success) {
          throw new Error(saveResponse.message || 'Failed to save settings before testing')
        }
        
        console.log('✅ Settings saved before testing connection')
        setHasStoredKey(true) // Update stored key status
      }
      
      // Now test the connection (works with either new or stored key)
      const response = await settingsApi.testOpenAIConnection()
      
      if (response.success) {
        // Set success status for button color
        setTestStatus('success')
        
        // Extract detailed information from response
        const modelInfo = response.data?.model_info
        const responseTime = response.data?.response_time_ms
        
        let descriptionDetails = response.data?.message || response.message || 
          (language === 'tr' ? "OpenAI API bağlantı testi başarılı" : "OpenAI API connection test passed")
        
        // Add model and response time info if available
        if (modelInfo) {
          descriptionDetails += `\n${language === 'tr' ? 'Model' : 'Model'}: ${modelInfo.model || 'gpt-3.5-turbo'}`
        }
        if (responseTime) {
          descriptionDetails += `\n${language === 'tr' ? 'Yanıt süresi' : 'Response time'}: ${responseTime}ms`
        }
        
        toast({
          title: (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500 animate-pulse" />
              <span className="font-semibold">
                {language === 'tr' ? 'Bağlantı Başarılı' : 'Connection Success'}
              </span>
            </div>
          ),
          description: (
            <div className="text-sm space-y-1">
              <p>{descriptionDetails}</p>
              {modelInfo?.usage && (
                <p className="text-xs text-green-600">
                  {language === 'tr' ? 'Token kullanımı' : 'Token usage'}: {modelInfo.usage.total_tokens || 0}
                </p>
              )}
            </div>
          ),
          className: "border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 text-green-900",
          duration: 5000
        })
      } else {
        const errorMessage = response.data?.message || response.message || 'Connection test failed'
        const errorType = response.data?.error_type
        
        // Provide more specific error guidance
        let userGuidance = ''
        if (errorType === 'AuthenticationError') {
          userGuidance = language === 'tr' 
            ? '\n\n💡 API anahtarınızı OpenAI hesabınızdan kontrol edin.'
            : '\n\n💡 Please verify your API key from your OpenAI account.'
        } else if (errorType === 'QuotaError') {
          userGuidance = language === 'tr'
            ? '\n\n💡 OpenAI hesap bakiyenizi kontrol edin.'
            : '\n\n💡 Please check your OpenAI account billing.'
        } else if (errorType === 'RateLimitError') {
          userGuidance = language === 'tr'
            ? '\n\n💡 Birkaç dakika bekleyip tekrar deneyin.'
            : '\n\n💡 Please wait a few minutes and try again.'
        }
        
        throw new Error(errorMessage + userGuidance)
      }
    } catch (error: any) {
      console.error('Error testing connection:', error)
      
      // Set error status for button color
      setTestStatus('error')
      
      // Parse error response for more details
      let errorMessage = error.message || messages.error.connectionFailed
      
      // Handle specific API error responses
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }
      
      toast({
        title: (
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span className="font-semibold">
              {language === 'tr' ? 'Bağlantı Testi Başarısız' : 'Connection Test Failed'}
            </span>
          </div>
        ),
        description: (
          <div className="text-sm">
            <p>{errorMessage}</p>
            {error.data?.error && (
              <p className="text-xs text-red-600 mt-1">
                {language === 'tr' ? 'Hata detayı' : 'Error detail'}: {error.data.error}
              </p>
            )}
          </div>
        ),
        variant: "destructive",
        duration: 7000
      })
    } finally {
      setIsTesting(false)
    }
  }

  const maskApiKey = (key: string) => {
    if (!key || key.length < 8) return key
    return key.substring(0, 3) + '•'.repeat(key.length - 7) + key.substring(key.length - 4)
  }

  // Floating confetti particles component
  const ConfettiParticles = () => {
    if (!showConfetti) return null
    
    return (
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "absolute w-2 h-2 rounded-full animate-bounce",
              i % 4 === 0 && "bg-yellow-400",
              i % 4 === 1 && "bg-green-400", 
              i % 4 === 2 && "bg-blue-400",
              i % 4 === 3 && "bg-pink-400"
            )}
            style={{
              left: `${20 + (i * 7)}%`,
              top: `${30 + (i % 3) * 10}%`,
              animationDelay: `${i * 100}ms`,
              animationDuration: `${800 + (i * 200)}ms`
            }}
          >
            <div className="animate-spin">
              {i % 2 === 0 ? '✨' : '🎉'}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <ConfettiParticles />
      <div className={cn('p-6 space-y-6', className)}>
        <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            {language === 'tr' ? 'Ayarlar' : 'Settings'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {language === 'tr' ? 'Platform tercihlerinizi yapılandırın' : 'Configure your platform preferences'}
          </p>
        </div>
        
        {/* Language Toggle */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          <Button
            variant={language === 'en' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setLanguage('en')}
            className="text-xs px-3 py-1 h-7"
          >
            EN
          </Button>
          <Button
            variant={language === 'tr' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setLanguage('tr')}
            className="text-xs px-3 py-1 h-7"
          >
            TR
          </Button>
        </div>
      </div>
      
      {/* OpenAI API Key Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            {language === 'tr' ? 'OpenAI API Yapılandırması' : 'OpenAI API Configuration'}
            {justSaved && (
              <div className={cn(
                "ml-auto flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all duration-500 transform",
                "bg-gradient-to-r from-green-400 via-emerald-400 to-green-500 text-white shadow-lg",
                celebrationStage >= 1 && "animate-bounce",
                celebrationStage >= 2 && "scale-110",
                celebrationStage >= 3 && "shadow-green-200 shadow-2xl animate-pulse"
              )}>
                <div className="relative">
                  <CheckCircle className="h-4 w-4 animate-spin" />
                  {showConfetti && (
                    <Sparkles className="h-3 w-3 text-yellow-200 absolute -top-1 -right-1 animate-ping" />
                  )}
                </div>
                <span className="animate-pulse">
                  {language === 'tr' ? '✨ Kaydedildi! ✨' : '✨ Saved! ✨'}
                </span>
                {showConfetti && (
                  <Zap className="h-3 w-3 text-yellow-200 animate-bounce" />
                )}
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              {language === 'tr' ? 'API Anahtarı' : 'API Key'}
            </Label>
            <div className="relative">
              <Input
                id="api-key"
                type={showApiKey ? "text" : "password"}
                placeholder={language === 'tr' ? 'OpenAI API anahtarınızı girin (sk-...)' : 'Enter your OpenAI API key (sk-...)'}
                value={showApiKey ? apiKey : maskApiKey(apiKey)}
                onChange={(e) => {
                  const newValue = e.target.value
                  // Clear masked placeholder when user starts typing
                  if (apiKey === '•'.repeat(20) && newValue !== apiKey) {
                    setApiKey(newValue.replace(/•/g, ''))
                  } else {
                    setApiKey(newValue)
                  }
                }}
                onFocus={() => {
                  // Clear masked placeholder on focus if it's just bullets
                  if (apiKey === '•'.repeat(20)) {
                    setApiKey('')
                  }
                }}
                className={cn(
                  "pr-10 transition-all duration-300 focus:scale-[1.02] hover:shadow-md",
                  justSaved && "border-green-300 bg-green-50 shadow-green-100 shadow-md animate-pulse",
                  apiKey && apiKey !== '•'.repeat(20) && "border-blue-200 bg-blue-50/30"
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowApiKey(!showApiKey)}
                onMouseEnter={() => console.log('👁️ Eye hover - show/hide key')}
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4 text-slate-500" />
                ) : (
                  <Eye className="h-4 w-4 text-slate-500" />
                )}
              </Button>
            </div>
            <div className={cn(
              "text-sm transition-all duration-300 p-3 rounded-lg",
              justSaved 
                ? "text-green-700 bg-green-50 border border-green-200" 
                : "text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            )}>
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                  {language === 'tr' 
                    ? 'API anahtarınız yerel olarak saklanır ve sunucularımıza asla gönderilmez. Sadece OpenAI ile doğrudan iletişim için kullanılır.'
                    : 'Your API key is stored locally and never sent to our servers. It\'s used only for direct communication with OpenAI.'}
                </p>
              </div>
              {justSaved && (
                <div className="flex items-center gap-1 mt-2 text-xs font-medium text-green-600">
                  <Sparkles className="h-3 w-3 animate-spin" />
                  <span>
                    {language === 'tr' ? 'Güvenle kaydedildi!' : 'Securely saved!'}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          
          <div className="flex gap-3 mt-6">
            <Button 
              onClick={handleSaveApiKey}
              disabled={isLoading || !apiKey.trim()}
              className={cn(
                "flex items-center gap-2 transition-all duration-300",
                justSaved && "bg-green-500 hover:bg-green-600 text-white",
                isLoading && "bg-blue-500 hover:bg-blue-600 text-white"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="animate-pulse">{getMessages().buttons.saving}</span>
                </>
              ) : justSaved ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>{getMessages().buttons.save}</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 transition-transform group-hover:scale-110" />
                  <span className="font-medium">{getMessages().buttons.save}</span>
                </>
              )}
            </Button>
            
            {(apiKey || hasStoredKey) && (
              <>
                <Button 
                  variant={testStatus === 'success' ? 'default' : testStatus === 'error' ? 'destructive' : 'outline'}
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className={cn(
                    "flex items-center gap-2 transition-all duration-300 hover:scale-105 active:scale-95",
                    testStatus === 'success' && "bg-green-500 hover:bg-green-600 border-green-500 text-white shadow-green-200 shadow-lg animate-pulse",
                    testStatus === 'error' && "bg-red-500 hover:bg-red-600 border-red-500 text-white shadow-red-200 shadow-lg",
                    testStatus === 'idle' && "hover:shadow-md"
                  )}
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {getMessages().buttons.testing}
                    </>
                  ) : testStatus === 'success' ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      {language === 'tr' ? 'Başarılı!' : 'Success!'}
                    </>
                  ) : testStatus === 'error' ? (
                    <>
                      <AlertCircle className="h-4 w-4" />
                      {language === 'tr' ? 'Başarısız' : 'Failed'}
                    </>
                  ) : (
                    <>
                      <TestTube className="h-4 w-4" />
                      {getMessages().buttons.test}
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handleClearApiKey}
                  className="flex items-center gap-2 transition-all duration-300 hover:scale-105 active:scale-95 hover:bg-red-50 hover:border-red-200 hover:text-red-700 hover:shadow-md"
                >
                  <AlertCircle className="h-4 w-4" />
                  {getMessages().buttons.clear}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* General Platform Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {language === 'tr' ? 'Platform Ayarları' : 'Platform Settings'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Security Settings Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Shield className="h-5 w-5" />
              {language === 'tr' ? 'Güvenlik Ayarları' : 'Security Settings'}
            </div>
            
            {isLoadingSystemSettings ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : systemSettings ? (
              <div className="space-y-4">
                {/* Account Lockout Settings */}
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        <Label className="text-base font-medium">
                          {language === 'tr' ? 'Hesap Kilitleme' : 'Account Lockout'}
                        </Label>
                      </div>
                      <p className="text-sm text-slate-500">
                        {language === 'tr' 
                          ? 'Başarısız giriş denemelerinden sonra hesapları otomatik olarak kilitle'
                          : 'Automatically lock accounts after failed login attempts'}
                      </p>
                    </div>
                    <Switch
                      checked={systemSettings.enable_account_lockout}
                      onCheckedChange={(checked) => handleSystemSettingChange('enable_account_lockout', checked)}
                    />
                  </div>
                  
                  {systemSettings.enable_account_lockout && (
                    <div className="space-y-4 pl-6 animate-in slide-in-from-top-1">
                      <div className="space-y-2">
                        <Label className="text-sm">
                          {language === 'tr' ? 'Maksimum Başarısız Deneme Sayısı' : 'Maximum Failed Login Attempts'}
                        </Label>
                        <div className="flex items-center gap-4">
                          <Slider
                            value={[systemSettings.max_failed_login_attempts]}
                            onValueChange={([value]) => handleSystemSettingChange('max_failed_login_attempts', value)}
                            min={1}
                            max={10}
                            step={1}
                            className="flex-1"
                          />
                          <span className="w-12 text-center font-mono">
                            {systemSettings.max_failed_login_attempts}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm">
                          {language === 'tr' ? 'Kilitleme Süresi (Dakika)' : 'Lockout Duration (Minutes)'}
                        </Label>
                        <div className="flex items-center gap-4">
                          <Slider
                            value={[systemSettings.lockout_duration_minutes]}
                            onValueChange={([value]) => handleSystemSettingChange('lockout_duration_minutes', value)}
                            min={5}
                            max={1440}
                            step={5}
                            className="flex-1"
                          />
                          <span className="w-16 text-center font-mono">
                            {systemSettings.lockout_duration_minutes}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {language === 'tr' 
                            ? `${systemSettings.lockout_duration_minutes} dakika (${Math.floor(systemSettings.lockout_duration_minutes / 60)} saat ${systemSettings.lockout_duration_minutes % 60} dakika)`
                            : `${systemSettings.lockout_duration_minutes} minutes (${Math.floor(systemSettings.lockout_duration_minutes / 60)} hours ${systemSettings.lockout_duration_minutes % 60} minutes)`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Rate Limiting Settings */}
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <Label className="text-base font-medium">
                          {language === 'tr' ? 'Hız Sınırlaması' : 'Rate Limiting'}
                        </Label>
                      </div>
                      <p className="text-sm text-slate-500">
                        {language === 'tr' 
                          ? 'API isteklerini sınırlayarak kötüye kullanımı önle'
                          : 'Prevent abuse by limiting API requests'}
                      </p>
                    </div>
                    <Switch
                      checked={systemSettings.enable_rate_limiting}
                      onCheckedChange={(checked) => handleSystemSettingChange('enable_rate_limiting', checked)}
                    />
                  </div>
                  
                  {systemSettings.enable_rate_limiting && (
                    <div className="space-y-4 pl-6 animate-in slide-in-from-top-1">
                      <div className="space-y-2">
                        <Label className="text-sm">
                          {language === 'tr' ? 'Dakika Başına İstek Limiti' : 'Requests Per Minute Limit'}
                        </Label>
                        <div className="flex items-center gap-4">
                          <Slider
                            value={[systemSettings.rate_limit_requests_per_minute]}
                            onValueChange={([value]) => handleSystemSettingChange('rate_limit_requests_per_minute', value)}
                            min={10}
                            max={1000}
                            step={10}
                            className="flex-1"
                          />
                          <span className="w-16 text-center font-mono">
                            {systemSettings.rate_limit_requests_per_minute}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Email Verification Settings */}
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4" />
                        <Label className="text-base font-medium">
                          {language === 'tr' ? 'E-posta Doğrulama' : 'Email Verification'}
                        </Label>
                      </div>
                      <p className="text-sm text-slate-500">
                        {language === 'tr' 
                          ? 'Yeni kullanıcılar için e-posta doğrulaması gerektir'
                          : 'Require email verification for new users'}
                      </p>
                    </div>
                    <Switch
                      checked={systemSettings.require_email_verification}
                      onCheckedChange={(checked) => handleSystemSettingChange('require_email_verification', checked)}
                    />
                  </div>
                </div>
                
                {/* Save and Reset Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={saveSystemSettings}
                    disabled={isSavingSystemSettings}
                    className={cn(
                      "flex items-center gap-2 transition-all duration-300",
                      systemSettingsSaved && "bg-green-500 hover:bg-green-600 text-white shadow-green-200 shadow-lg"
                    )}
                    variant={systemSettingsSaved ? "default" : "default"}
                  >
                    {isSavingSystemSettings ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {language === 'tr' ? 'Kaydediliyor...' : 'Saving...'}
                      </>
                    ) : systemSettingsSaved ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        {language === 'tr' ? 'Kaydedildi!' : 'Saved!'}
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        {language === 'tr' ? 'Ayarları Kaydet' : 'Save Settings'}
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={resetSystemSettings}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {language === 'tr' ? 'Varsayılanlara Dön' : 'Reset to Defaults'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-500 dark:text-slate-400 py-8">
                {language === 'tr' 
                  ? 'Sistem ayarları yüklenemedi. Yönetici haklarına ihtiyacınız olabilir.'
                  : 'Unable to load system settings. You may need administrator privileges.'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </>
  )
})

export default SettingsContent
