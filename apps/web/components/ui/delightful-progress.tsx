"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from './card'
import { Badge } from './badge'
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Sparkles,
  Zap,
  Trophy,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  id: string
  title: string
  description?: string
  status: 'pending' | 'active' | 'completed' | 'error'
  duration?: number
}

interface DelightfulProgressProps {
  steps: Step[]
  currentStep?: number
  onStepComplete?: (stepId: string) => void
  onAllComplete?: () => void
  className?: string
  variant?: 'vertical' | 'horizontal'
  showEstimatedTime?: boolean
}

export function DelightfulProgress({
  steps,
  currentStep = 0,
  onStepComplete,
  onAllComplete,
  className,
  variant = 'vertical',
  showEstimatedTime = true
}: DelightfulProgressProps) {
  const [animatingStep, setAnimatingStep] = useState<string | null>(null)
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())
  
  const totalSteps = steps.length
  const completedCount = steps.filter(step => step.status === 'completed').length
  const progress = (completedCount / totalSteps) * 100
  const isAllComplete = completedCount === totalSteps
  
  // Calculate estimated time remaining
  const estimatedTime = steps
    .slice(currentStep)
    .reduce((acc, step) => acc + (step.duration || 30), 0)
  
  // Handle step completion animations
  useEffect(() => {
    const completedStep = steps.find(step => 
      step.status === 'completed' && !completedSteps.has(step.id)
    )
    
    if (completedStep) {
      setAnimatingStep(completedStep.id)
      setCompletedSteps(prev => new Set([...prev, completedStep.id]))
      
      setTimeout(() => {
        setAnimatingStep(null)
        onStepComplete?.(completedStep.id)
        
        // Check if all steps are complete
        if (completedCount === totalSteps) {
          setTimeout(() => onAllComplete?.(), 500)
        }
      }, 1000)
    }
  }, [steps, completedSteps, completedCount, totalSteps, onStepComplete, onAllComplete])
  
  const getStepIcon = (step: Step) => {
    if (animatingStep === step.id) {
      return <Sparkles className="h-5 w-5 text-yellow-500 animate-spin" />
    }
    
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'active':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-slate-400" />
    }
  }
  
  const getStepClasses = (step: Step, index: number) => {
    const baseClasses = "transition-all duration-300"
    
    if (animatingStep === step.id) {
      return cn(baseClasses, "animate-pulse scale-105 bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800")
    }
    
    switch (step.status) {
      case 'completed':
        return cn(baseClasses, "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800")
      case 'active':
        return cn(baseClasses, "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 animate-pulse")
      case 'error':
        return cn(baseClasses, "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 animate-shake")
      default:
        return cn(baseClasses, "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700")
    }
  }
  
  if (variant === 'horizontal') {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6">
          {/* Progress Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Progress Tracker
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {completedCount} of {totalSteps} steps completed
              </p>
            </div>
            
            {isAllComplete && (
              <div className="flex items-center space-x-2 text-green-600">
                <Trophy className="h-5 w-5 animate-bounce" />
                <span className="font-medium">Complete!</span>
              </div>
            )}
          </div>
          
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
              <div 
                className={cn(
                  "h-3 rounded-full transition-all duration-500 ease-out",
                  isAllComplete 
                    ? "bg-gradient-to-r from-green-400 to-green-600 animate-glow" 
                    : "bg-gradient-to-r from-blue-400 to-blue-600"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            
            {showEstimatedTime && !isAllComplete && (
              <div className="flex justify-between mt-2 text-xs text-slate-600 dark:text-slate-400">
                <span>{Math.round(progress)}% complete</span>
                <span>~{Math.ceil(estimatedTime / 60)} min remaining</span>
              </div>
            )}
          </div>
          
          {/* Steps - Horizontal Layout */}
          <div className="flex items-center space-x-4 overflow-x-auto pb-2">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center space-x-4 flex-shrink-0">
                <div className={cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-lg border",
                  getStepClasses(step, index)
                )}>
                  {getStepIcon(step)}
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                      {step.title}
                    </p>
                    {step.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                        {step.description}
                      </p>
                    )}
                  </div>
                </div>
                
                {index < steps.length - 1 && (
                  <div className={cn(
                    "w-8 h-0.5 transition-colors duration-300",
                    steps[index + 1].status !== 'pending' 
                      ? "bg-green-400" 
                      : "bg-slate-300 dark:bg-slate-600"
                  )} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }
  
  // Vertical Layout (default)
  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="p-6">
        {/* Progress Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <Zap className="h-5 w-5 text-blue-500" />
              <span>Progress Tracker</span>
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {completedCount} of {totalSteps} steps completed
            </p>
          </div>
          
          <Badge 
            variant={isAllComplete ? "default" : "secondary"} 
            className={isAllComplete ? "animate-heartbeat" : ""}
          >
            {Math.round(progress)}%
          </Badge>
        </div>
        
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
            <div 
              className={cn(
                "h-3 rounded-full transition-all duration-500 ease-out",
                isAllComplete 
                  ? "bg-gradient-to-r from-green-400 to-green-600 animate-glow" 
                  : "bg-gradient-to-r from-blue-400 to-blue-600"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {showEstimatedTime && !isAllComplete && (
            <div className="flex justify-between mt-2 text-xs text-slate-600 dark:text-slate-400">
              <span>In progress...</span>
              <span>~{Math.ceil(estimatedTime / 60)} min remaining</span>
            </div>
          )}
        </div>
        
        {/* Steps - Vertical Layout */}
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div 
              key={step.id} 
              className={cn(
                "flex items-center space-x-4 p-4 rounded-lg border animate-slide-in-up",
                getStepClasses(step, index),
                `stagger-${Math.min(index + 1, 5)}`
              )}
            >
              {getStepIcon(step)}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {step.title}
                  </p>
                  
                  {step.status === 'active' && step.duration && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      ~{step.duration}s
                    </span>
                  )}
                </div>
                
                {step.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {step.description}
                  </p>
                )}
              </div>
              
              {/* Step connector line */}
              {index < steps.length - 1 && (
                <div className="absolute left-8 mt-12 w-0.5 h-6 bg-slate-200 dark:bg-slate-700" />
              )}
            </div>
          ))}
        </div>
        
        {/* Completion celebration */}
        {isAllComplete && (
          <div className="mt-6 text-center p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/10 dark:to-blue-900/10 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-center space-x-2 text-green-600 mb-2">
              <Trophy className="h-6 w-6 animate-bounce" />
              <span className="font-semibold text-lg">All Steps Complete!</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Great job! All tasks have been completed successfully.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}