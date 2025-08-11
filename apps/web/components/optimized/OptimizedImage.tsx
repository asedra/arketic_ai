"use client"

import React, { useState, memo } from 'react'
import Image, { ImageProps } from 'next/image'
import { cn } from '@/lib/utils'

interface OptimizedImageProps extends Omit<ImageProps, 'onLoad' | 'onError'> {
  fallbackSrc?: string
  containerClassName?: string
  aspectRatio?: number
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
}

/**
 * OptimizedImage component with automatic optimization features
 * - Automatic format conversion (WebP/AVIF)
 * - Responsive sizing
 * - Lazy loading (except when priority is set)
 * - Error handling with fallback
 * - Blur placeholder support
 */
export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  containerClassName,
  fallbackSrc = '/placeholder.jpg',
  priority = false,
  placeholder = 'empty',
  blurDataURL,
  aspectRatio,
  objectFit = 'cover',
  sizes,
  quality = 85,
  ...props
}: OptimizedImageProps) {
  const [imgSrc, setImgSrc] = useState(src)
  const [isLoading, setIsLoading] = useState(true)

  const handleLoad = () => {
    setIsLoading(false)
  }

  const handleError = () => {
    if (imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc)
    }
    setIsLoading(false)
  }

  // Calculate responsive sizes if not provided
  const responsiveSizes = sizes || generateResponsiveSizes()

  function generateResponsiveSizes() {
    // Default responsive sizes based on common breakpoints
    return "(max-width: 640px) 100vw, (max-width: 768px) 80vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
  }

  // Apply aspect ratio if specified
  const containerStyle = aspectRatio
    ? { aspectRatio, width: '100%', height: 'auto' }
    : undefined

  return (
    <div 
      className={cn('relative overflow-hidden', containerClassName)}
      style={containerStyle}
    >
      <Image
        src={imgSrc}
        alt={alt}
        width={width}
        height={height}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          className
        )}
        onLoad={handleLoad}
        onError={handleError}
        priority={priority}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        sizes={responsiveSizes}
        quality={quality}
        style={{
          objectFit: objectFit,
          width: '100%',
          height: aspectRatio ? 'auto' : '100%'
        }}
        {...props}
      />
    </div>
  )
})

/**
 * ProfileImage - Optimized for user avatars
 */
export const ProfileImage = memo(function ProfileImage({
  src,
  alt = 'Profile',
  size = 40,
  className,
  ...props
}: {
  src: string
  alt?: string
  size?: number
  className?: string
} & Partial<OptimizedImageProps>) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn('rounded-full', className)}
      containerClassName="rounded-full overflow-hidden"
      fallbackSrc="/placeholder-user.jpg"
      sizes={`${size}px`}
      objectFit="cover"
      {...props}
    />
  )
})

/**
 * HeroImage - Optimized for large hero/banner images
 */
export const HeroImage = memo(function HeroImage({
  src,
  alt,
  className,
  ...props
}: {
  src: string
  alt: string
  className?: string
} & Partial<OptimizedImageProps>) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={1920}
      height={1080}
      className={className}
      priority // Hero images should load immediately
      sizes="100vw"
      quality={90}
      objectFit="cover"
      {...props}
    />
  )
})

/**
 * ThumbnailImage - Optimized for gallery thumbnails
 */
export const ThumbnailImage = memo(function ThumbnailImage({
  src,
  alt,
  className,
  ...props
}: {
  src: string
  alt: string
  className?: string
} & Partial<OptimizedImageProps>) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={300}
      height={200}
      className={cn('rounded-md', className)}
      containerClassName="rounded-md overflow-hidden"
      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
      quality={75}
      objectFit="cover"
      {...props}
    />
  )
})

/**
 * LogoImage - Optimized for logos and icons
 */
export const LogoImage = memo(function LogoImage({
  src,
  alt = 'Logo',
  width = 120,
  height = 40,
  className,
  ...props
}: {
  src: string
  alt?: string
  width?: number
  height?: number
  className?: string
} & Partial<OptimizedImageProps>) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      fallbackSrc="/placeholder-logo.svg"
      sizes={`${width}px`}
      quality={100} // Logos should be crisp
      objectFit="contain"
      priority // Logos are usually above the fold
      {...props}
    />
  )
})