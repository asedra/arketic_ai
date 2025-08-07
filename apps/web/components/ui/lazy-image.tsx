"use client"

import { useState, useRef, useEffect } from "react"
import { useIntersectionObserver } from "@/lib/performance"
import { cn } from "@/lib/utils"
import { LoadingSkeleton } from "./loading"

interface LazyImageProps {
  src: string
  alt: string
  className?: string
  width?: number
  height?: number
  placeholderClassName?: string
  onLoad?: () => void
  onError?: () => void
}

export function LazyImage({ 
  src, 
  alt, 
  className, 
  width, 
  height, 
  placeholderClassName,
  onLoad,
  onError
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isError, setIsError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const { hasIntersected } = useIntersectionObserver(containerRef, {
    threshold: 0.1,
    rootMargin: '50px'
  })

  useEffect(() => {
    if (hasIntersected && !isLoaded && !isError) {
      const img = new Image()
      
      img.onload = () => {
        setIsLoaded(true)
        onLoad?.()
      }
      
      img.onerror = () => {
        setIsError(true)
        onError?.()
      }
      
      img.src = src
    }
  }, [hasIntersected, src, isLoaded, isError, onLoad, onError])

  return (
    <div 
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      style={{ width, height }}
    >
      {!hasIntersected || (!isLoaded && !isError) ? (
        <LoadingSkeleton 
          className={cn("w-full h-full", placeholderClassName)} 
        />
      ) : isError ? (
        <div className="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
          <span className="text-xs text-slate-500">Failed to load</span>
        </div>
      ) : (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={cn("w-full h-full object-cover transition-opacity duration-300", {
            "opacity-0": !isLoaded,
            "opacity-100": isLoaded
          })}
          width={width}
          height={height}
        />
      )}
    </div>
  )
}