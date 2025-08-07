import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

const inputVariants = cva(
  'flex w-full rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
  {
    variants: {
      size: {
        sm: 'h-9 px-3 py-1 text-xs',
        md: 'h-10 px-3 py-2',
        lg: 'h-11 px-4 py-2 text-base',
      },
      variant: {
        default: 'border-input',
        error: 'border-error focus-visible:ring-error',
        success: 'border-success focus-visible:ring-success',
        warning: 'border-warning focus-visible:ring-warning',
      },
      state: {
        default: '',
        error: 'border-error text-error-foreground',
        success: 'border-success text-success-foreground',
        warning: 'border-warning text-warning-foreground',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
      state: 'default',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: boolean;
  success?: boolean;
  warning?: boolean;
  helperText?: string;
  label?: string;
  required?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      size,
      variant,
      state,
      leftIcon,
      rightIcon,
      error,
      success,
      warning,
      helperText,
      label,
      required,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    // Determine state based on props
    const inputState = error ? 'error' : success ? 'success' : warning ? 'warning' : state;
    const inputVariant = error ? 'error' : success ? 'success' : warning ? 'warning' : variant;
    
    // Generate unique ID if not provided
    const inputId = id || React.useId();
    const helperTextId = `${inputId}-helper`;
    
    const inputElement = (
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            inputVariants({ size, variant: inputVariant, state: inputState }),
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            className
          )}
          ref={ref}
          disabled={disabled}
          id={inputId}
          aria-describedby={helperText ? helperTextId : undefined}
          aria-invalid={error ? 'true' : undefined}
          aria-required={required}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none">
            {rightIcon}
          </div>
        )}
      </div>
    );

    if (label || helperText) {
      return (
        <div className="space-y-2">
          {label && (
            <label
              htmlFor={inputId}
              className={cn(
                'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                disabled && 'opacity-50 cursor-not-allowed',
                error && 'text-error',
                success && 'text-success',
                warning && 'text-warning'
              )}
            >
              {label}
              {required && <span className="text-error ml-1" aria-label="required">*</span>}
            </label>
          )}
          {inputElement}
          {helperText && (
            <p
              id={helperTextId}
              className={cn(
                'text-xs',
                error ? 'text-error' : success ? 'text-success' : warning ? 'text-warning' : 'text-muted-foreground',
                disabled && 'opacity-50'
              )}
            >
              {helperText}
            </p>
          )}
        </div>
      );
    }

    return inputElement;
  }
);
Input.displayName = 'Input';

// Textarea component with similar API
const textareaVariants = cva(
  'flex w-full rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors resize-none',
  {
    variants: {
      size: {
        sm: 'min-h-[80px] px-3 py-2 text-xs',
        md: 'min-h-[100px] px-3 py-2',
        lg: 'min-h-[120px] px-4 py-3 text-base',
      },
      variant: {
        default: 'border-input',
        error: 'border-error focus-visible:ring-error',
        success: 'border-success focus-visible:ring-success',
        warning: 'border-warning focus-visible:ring-warning',
      },
      state: {
        default: '',
        error: 'border-error text-error-foreground',
        success: 'border-success text-success-foreground',
        warning: 'border-warning text-warning-foreground',
      },
      resize: {
        none: 'resize-none',
        vertical: 'resize-y',
        horizontal: 'resize-x',
        both: 'resize',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
      state: 'default',
      resize: 'vertical',
    },
  }
);

export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>,
    VariantProps<typeof textareaVariants> {
  error?: boolean;
  success?: boolean;
  warning?: boolean;
  helperText?: string;
  label?: string;
  required?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      size,
      variant,
      state,
      resize,
      error,
      success,
      warning,
      helperText,
      label,
      required,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    // Determine state based on props
    const textareaState = error ? 'error' : success ? 'success' : warning ? 'warning' : state;
    const textareaVariant = error ? 'error' : success ? 'success' : warning ? 'warning' : variant;
    
    // Generate unique ID if not provided
    const textareaId = id || React.useId();
    const helperTextId = `${textareaId}-helper`;
    
    const textareaElement = (
      <textarea
        className={cn(
          textareaVariants({ size, variant: textareaVariant, state: textareaState, resize }),
          className
        )}
        ref={ref}
        disabled={disabled}
        id={textareaId}
        aria-describedby={helperText ? helperTextId : undefined}
        aria-invalid={error ? 'true' : undefined}
        aria-required={required}
        {...props}
      />
    );

    if (label || helperText) {
      return (
        <div className="space-y-2">
          {label && (
            <label
              htmlFor={textareaId}
              className={cn(
                'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                disabled && 'opacity-50 cursor-not-allowed',
                error && 'text-error',
                success && 'text-success',
                warning && 'text-warning'
              )}
            >
              {label}
              {required && <span className="text-error ml-1" aria-label="required">*</span>}
            </label>
          )}
          {textareaElement}
          {helperText && (
            <p
              id={helperTextId}
              className={cn(
                'text-xs',
                error ? 'text-error' : success ? 'text-success' : warning ? 'text-warning' : 'text-muted-foreground',
                disabled && 'opacity-50'
              )}
            >
              {helperText}
            </p>
          )}
        </div>
      );
    }

    return textareaElement;
  }
);
Textarea.displayName = 'Textarea';

export { Input, Textarea, inputVariants, textareaVariants };