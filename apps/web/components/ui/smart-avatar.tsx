"use client"

import React, { useState, memo } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from './avatar'
import { cn } from '@/lib/utils'

interface SmartAvatarProps {
  src?: string | null
  alt: string
  fallback: string
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16'
} as const

export const SmartAvatar = memo(function SmartAvatar({
  src,
  alt,
  fallback,
  className,
  size = 'md'
}: SmartAvatarProps) {
  const [hasError, setHasError] = useState(false)

  // Don't try to load empty strings or null/undefined values
  const shouldShowImage = src && src.trim() !== '' && !hasError

  const handleImageError = () => {
    console.warn(`Failed to load avatar image: ${src}`)
    setHasError(true)
  }

  const handleImageLoad = () => {
    setHasError(false)
  }

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {shouldShowImage && (
        <AvatarImage 
          src={src} 
          alt={alt}
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
      )}
      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
        {fallback}
      </AvatarFallback>
    </Avatar>
  )
})