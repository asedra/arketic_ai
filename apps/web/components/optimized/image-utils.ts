/**
 * Image optimization utilities for Next.js Image component
 */

/**
 * Custom image loader for external images or CDN integration
 */
export function imageLoader({ src, width, quality }: {
  src: string
  width: number
  quality?: number
}) {
  // If using a CDN like Cloudinary, Imgix, etc., modify the URL here
  // Example for Cloudinary:
  // return `https://res.cloudinary.com/demo/image/fetch/w_${width},q_${quality || 75}/${src}`
  
  // Default Next.js optimization
  return `${src}?w=${width}&q=${quality || 85}`
}

/**
 * Generate a blur data URL for placeholder
 * This would typically be done at build time or stored in database
 */
export async function generateBlurDataURL(src: string): Promise<string> {
  // This is a placeholder implementation
  // In production, you would:
  // 1. Use a service like Plaiceholder
  // 2. Generate at build time with a script
  // 3. Store pre-generated blur hashes in your database
  
  // Example base64 blur placeholder (1x1 transparent pixel)
  const DEFAULT_BLUR = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k='
  
  return DEFAULT_BLUR
}

/**
 * Preload critical images
 */
export function preloadImage(src: string): void {
  if (typeof window !== 'undefined') {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = src
    document.head.appendChild(link)
  }
}

/**
 * Check if image format is supported
 */
export function supportsWebP(): boolean {
  if (typeof window === 'undefined') return false
  
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  return canvas.toDataURL('image/webp').indexOf('image/webp') === 0
}

/**
 * Check if AVIF format is supported
 */
export function supportsAVIF(): boolean {
  if (typeof window === 'undefined') return false
  
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  return canvas.toDataURL('image/avif').indexOf('image/avif') === 0
}

/**
 * Get optimal image format based on browser support
 */
export function getOptimalFormat(originalFormat: string): string {
  if (supportsAVIF()) return 'avif'
  if (supportsWebP()) return 'webp'
  return originalFormat
}

/**
 * Calculate responsive image sizes based on container width
 */
export function calculateResponsiveSizes(containerWidth: number): string {
  const breakpoints = [
    { max: 640, vw: 100 },
    { max: 768, vw: 80 },
    { max: 1024, vw: 50 },
    { max: 1280, vw: 33 },
    { max: Infinity, vw: 25 }
  ]
  
  return breakpoints
    .map((bp, i) => {
      if (i === breakpoints.length - 1) {
        return `${bp.vw}vw`
      }
      return `(max-width: ${bp.max}px) ${bp.vw}vw`
    })
    .join(', ')
}

/**
 * Generate srcSet for responsive images
 */
export function generateSrcSet(src: string, widths: number[] = [320, 640, 768, 1024, 1280, 1920]): string {
  return widths
    .map(width => `${src}?w=${width} ${width}w`)
    .join(', ')
}

/**
 * Lazy load images using Intersection Observer
 */
export class ImageLazyLoader {
  private observer: IntersectionObserver | null = null
  
  constructor(options: IntersectionObserverInit = {}) {
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement
            const src = img.dataset.src
            
            if (src) {
              img.src = src
              img.removeAttribute('data-src')
              this.observer?.unobserve(img)
            }
          }
        })
      }, {
        rootMargin: '50px',
        threshold: 0.01,
        ...options
      })
    }
  }
  
  observe(img: HTMLImageElement): void {
    if (this.observer && img.dataset.src) {
      this.observer.observe(img)
    }
  }
  
  disconnect(): void {
    this.observer?.disconnect()
  }
}

/**
 * Image loading priorities based on viewport position
 */
export function getImagePriority(position: 'above-fold' | 'near-fold' | 'below-fold'): boolean {
  switch (position) {
    case 'above-fold':
      return true // Use priority loading
    case 'near-fold':
    case 'below-fold':
    default:
      return false // Use lazy loading
  }
}

/**
 * Optimize image URL for CDN caching
 */
export function optimizeImageUrl(url: string, params: {
  width?: number
  height?: number
  quality?: number
  format?: string
}): string {
  const searchParams = new URLSearchParams()
  
  if (params.width) searchParams.set('w', params.width.toString())
  if (params.height) searchParams.set('h', params.height.toString())
  if (params.quality) searchParams.set('q', params.quality.toString())
  if (params.format) searchParams.set('fm', params.format)
  
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}${searchParams.toString()}`
}