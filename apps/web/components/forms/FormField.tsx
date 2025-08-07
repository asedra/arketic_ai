import React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { FormValidationError } from '@/lib/types'

interface BaseFieldProps {
  name: string
  label?: string
  error?: string
  required?: boolean
  disabled?: boolean
  className?: string
  description?: string
}

interface InputFieldProps extends BaseFieldProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel'
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
}

export function InputField({
  name,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  required,
  disabled,
  className,
  description
}: InputFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor={name} className={required ? "after:content-['*'] after:ml-0.5 after:text-red-500" : ""}>
          {label}
        </Label>
      )}
      <Input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className={cn(
          error && "border-red-500 focus:border-red-500 focus:ring-red-500"
        )}
      />
      {description && (
        <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
      )}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}

interface TextareaFieldProps extends BaseFieldProps {
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  rows?: number
}

export function TextareaField({
  name,
  label,
  placeholder,
  value,
  onChange,
  error,
  required,
  disabled,
  className,
  description,
  rows = 3
}: TextareaFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor={name} className={required ? "after:content-['*'] after:ml-0.5 after:text-red-500" : ""}>
          {label}
        </Label>
      )}
      <Textarea
        id={name}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        rows={rows}
        className={cn(
          error && "border-red-500 focus:border-red-500 focus:ring-red-500"
        )}
      />
      {description && (
        <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
      )}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}

interface SelectFieldProps extends BaseFieldProps {
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  options: Array<{ value: string; label: string }>
}

export function SelectField({
  name,
  label,
  placeholder,
  value,
  onChange,
  options,
  error,
  required,
  disabled,
  className,
  description
}: SelectFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor={name} className={required ? "after:content-['*'] after:ml-0.5 after:text-red-500" : ""}>
          {label}
        </Label>
      )}
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className={cn(
          error && "border-red-500 focus:border-red-500 focus:ring-red-500"
        )}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description && (
        <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
      )}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}

interface CheckboxFieldProps extends BaseFieldProps {
  checked?: boolean
  onChange?: (checked: boolean) => void
}

export function CheckboxField({
  name,
  label,
  checked,
  onChange,
  error,
  disabled,
  className,
  description
}: CheckboxFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center space-x-2">
        <Checkbox
          id={name}
          name={name}
          checked={checked}
          onCheckedChange={onChange}
          disabled={disabled}
        />
        {label && (
          <Label htmlFor={name} className="cursor-pointer">
            {label}
          </Label>
        )}
      </div>
      {description && (
        <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
      )}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}

// Form validation error display component
interface FormErrorsProps {
  errors: FormValidationError[]
  className?: string
}

export function FormErrors({ errors, className }: FormErrorsProps) {
  if (errors.length === 0) return null
  
  return (
    <div className={cn('rounded-md bg-red-50 dark:bg-red-900/20 p-4', className)}>
      <div className="flex">
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
            Please fix the following errors:
          </h3>
          <div className="mt-2 text-sm text-red-700 dark:text-red-300">
            <ul className="list-disc pl-5 space-y-1">
              {errors.map((error, index) => (
                <li key={index}>
                  <span className="font-medium">{error.field}:</span> {error.message}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
