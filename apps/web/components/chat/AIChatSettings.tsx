"use client"

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Settings, TestTube, CheckCircle, AlertCircle } from 'lucide-react'
import { settingsApi } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'

interface AIChatSettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  chatId?: string
}

interface AISettings {
  model: string
  system_prompt: string
}

export const AIChatSettings: React.FC<AIChatSettingsProps> = ({
  open,
  onOpenChange,
  chatId
}) => {
  const [settings, setSettings] = useState<AISettings>({
    model: 'gpt-3.5-turbo',
    system_prompt: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const modelOptions = [
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Fast and efficient' },
    { value: 'gpt-4', label: 'GPT-4', description: 'More capable, slower' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'Latest GPT-4 model' },
    { value: 'gpt-4o', label: 'GPT-4O', description: 'Optimized GPT-4' }
  ]

  // Load existing settings
  useEffect(() => {
    if (open) {
      loadSettings()
    }
  }, [open])

  const loadSettings = async () => {
    setIsLoading(true)
    try {
      const response = await settingsApi.getOpenAISettings()
      if (response.success && response.data) {
        setSettings({
          model: response.data.model,
          system_prompt: response.data.system_prompt || ''
        })
      }
    } catch (error) {
      console.log('No existing settings found')
    }
    setIsLoading(false)
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const response = await settingsApi.updateOpenAISettings(settings)
      if (response.success) {
        toast({
          title: "Settings Saved",
          description: "Your AI chat settings have been saved successfully.",
        })
        onOpenChange(false)
      } else {
        throw new Error(response.message || 'Failed to save settings')
      }
    } catch (error) {
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : 'Failed to save settings',
        variant: "destructive"
      })
    }
    setIsLoading(false)
  }



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Settings className="h-5 w-5" />
            AI Chat Settings
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-400">
            Configure your AI model and system prompt settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Model Selection */}
          <div className="space-y-2">
            <Label htmlFor="model">AI Model</Label>
            <Select 
              value={settings.model} 
              onValueChange={(value) => setSettings(prev => ({ ...prev, model: value }))}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {modelOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-slate-500">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* System Prompt */}
          <div className="space-y-2">
            <Label htmlFor="system_prompt">System Prompt</Label>
            <Textarea
              id="system_prompt"
              placeholder="Enter a system prompt to guide the AI's behavior..."
              value={settings.system_prompt}
              onChange={(e) => setSettings(prev => ({ ...prev, system_prompt: e.target.value }))}
              disabled={isLoading}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              This prompt will be used to set the AI's behavior and context for conversations.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button 
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}