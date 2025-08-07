"use client"

import React, { useState, useRef, memo } from 'react'
import Image from 'next/image'
import { useIntersectionObserver } from '@/lib/performance-hooks'
import { Skeleton } from '@/components/ui/skeleton'

interface LazyImageProps {
  src: string
  alt: string
  width: number
  height: number
  className?: string
  placeholder?: string
  priority?: boolean
}

export const LazyImage = memo(function LazyImage({
  src,
  alt,
  width,
  height,
  className = "",
  placeholder,
  priority = false
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef<HTMLDivElement>(null)
  
  const isInView = useIntersectionObserver(imgRef, {
    threshold: 0.1,
    rootMargin: '50px'
  })

  const shouldLoad = priority || isInView

  const handleLoad = () => {
    setIsLoaded(true)
  }

  const handleError = () => {
    setHasError(true)
    setIsLoaded(true)
  }

  return (
    <div 
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {!isLoaded && !hasError && (
        <Skeleton className="absolute inset-0" />
      )}
      
      {shouldLoad && (
        <>
          {hasError ? (
            <div className="absolute inset-0 bg-muted flex items-center justify-center">
              <span className="text-muted-foreground text-sm">Failed to load</span>
            </div>
          ) : (
            <Image
              src={src}
              alt={alt}
              width={width}
              height={height}
              className={`transition-opacity duration-300 ${
                isLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={handleLoad}
              onError={handleError}
              placeholder={placeholder ? 'blur' : 'empty'}
              blurDataURL={placeholder}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          )}
        </>
      )}
    </div>
  )
})