import { z } from 'zod'
import type { FormValidationError } from '../types'

// Common validation schemas
export const emailSchema = z.string().email('Invalid email address')
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters')
export const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number')

// User validation schemas
export const userSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: emailSchema,
  department: z.string().min(1, 'Department is required'),
  site: z.string().min(1, 'Site is required'),
  role: z.string().optional(),
  title: z.string().optional(),
  phone: phoneSchema.optional().or(z.literal(''))
})

export const createUserSchema = userSchema
export const updateUserSchema = userSchema.partial().extend({
  id: z.number()
})

// Knowledge item validation
export const knowledgeItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  type: z.enum(['document', 'url', 'folder']),
  description: z.string().optional(),
  tags: z.array(z.string()).optional()
})

// Search and filter validation
export const searchSchema = z.object({
  query: z.string().max(500, 'Search query too long'),
  filters: z.record(z.any()).optional()
})

// Generic form validation function
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: FormValidationError[] } {
  try {
    const validData = schema.parse(data)
    return { success: true, data: validData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: FormValidationError[] = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }))
      return { success: false, errors }
    }
    
    return {
      success: false,
      errors: [{ field: 'general', message: 'Validation failed' }]
    }
  }
}

// Form field validation helpers
export const fieldValidators = {
  required: (value: any) => {
    if (value === null || value === undefined || value === '') {
      return 'This field is required'
    }
    return null
  },
  
  email: (value: string) => {
    if (!value) return null
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value) ? null : 'Invalid email address'
  },
  
  minLength: (min: number) => (value: string) => {
    if (!value) return null
    return value.length >= min ? null : `Must be at least ${min} characters`
  },
  
  maxLength: (max: number) => (value: string) => {
    if (!value) return null
    return value.length <= max ? null : `Must be no more than ${max} characters`
  },
  
  phone: (value: string) => {
    if (!value) return null
    const phoneRegex = /^\+?[1-9]\d{1,14}$/
    return phoneRegex.test(value) ? null : 'Invalid phone number'
  }
}

// Compose multiple validators
export function composeValidators(...validators: Array<(value: any) => string | null>) {
  return (value: any) => {
    for (const validator of validators) {
      const error = validator(value)
      if (error) return error
    }
    return null
  }
}

// React Hook Form resolver for Zod schemas
export function createZodResolver<T>(schema: z.ZodSchema<T>) {
  return (data: any) => {
    const result = validateForm(schema, data)
    
    if (result.success) {
      return {
        values: result.data,
        errors: {}
      }
    }
    
    const errors: Record<string, { message: string }> = {}
    result.errors.forEach(error => {
      errors[error.field] = { message: error.message }
    })
    
    return {
      values: {},
      errors
    }
  }
}
