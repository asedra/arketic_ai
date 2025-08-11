// Export all optimized components for easy importing
export { LazyImage } from './LazyImage'
export { 
  OptimizedImage,
  ProfileImage,
  HeroImage,
  ThumbnailImage,
  LogoImage
} from './OptimizedImage'

// Re-export image optimization utilities
export { imageLoader, generateBlurDataURL } from './image-utils'