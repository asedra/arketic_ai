import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground border-border',
        success:
          'border-transparent bg-success text-success-foreground hover:bg-success/80',
        warning:
          'border-transparent bg-warning text-warning-foreground hover:bg-warning/80',
        error:
          'border-transparent bg-error text-error-foreground hover:bg-error/80',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
      dot: {
        true: 'pl-1.5',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      dot: false,
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  dotColor?: string;
}

function Badge({ className, variant, size, dot, dotColor, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size, dot }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            'inline-block w-1.5 h-1.5 rounded-full mr-1.5',
            dotColor || 'bg-current'
          )}
          aria-hidden="true"
        />
      )}
      {children}
    </div>
  );
}

// Status Badge - specifically for status indicators
const statusBadgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      status: {
        active: 'border-transparent bg-success/10 text-success border-success/20',
        inactive: 'border-transparent bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700',
        pending: 'border-transparent bg-warning/10 text-warning border-warning/20',
        error: 'border-transparent bg-error/10 text-error border-error/20',
        draft: 'border-transparent bg-muted text-muted-foreground border-border',
        published: 'border-transparent bg-success/10 text-success border-success/20',
        archived: 'border-transparent bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
      withDot: {
        true: 'pl-1.5',
        false: '',
      },
    },
    defaultVariants: {
      status: 'active',
      size: 'md',
      withDot: true,
    },
  }
);

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusBadgeVariants> {
  status: 'active' | 'inactive' | 'pending' | 'error' | 'draft' | 'published' | 'archived';
}

function StatusBadge({ 
  className, 
  status, 
  size, 
  withDot, 
  children, 
  ...props 
}: StatusBadgeProps) {
  const statusColors = {
    active: 'bg-success',
    inactive: 'bg-neutral-400',
    pending: 'bg-warning',
    error: 'bg-error',
    draft: 'bg-muted-foreground',
    published: 'bg-success',
    archived: 'bg-neutral-400',
  };

  return (
    <div 
      className={cn(statusBadgeVariants({ status, size, withDot }), className)} 
      {...props}
    >
      {withDot && (
        <span
          className={cn(
            'inline-block w-1.5 h-1.5 rounded-full mr-1.5',
            statusColors[status]
          )}
          aria-hidden="true"
        />
      )}
      {children || status.charAt(0).toUpperCase() + status.slice(1)}
    </div>
  );
}

// Notification Badge - for counts and notifications
export interface NotificationBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  count?: number;
  max?: number;
  showZero?: boolean;
  dot?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

function NotificationBadge({
  count = 0,
  max = 99,
  showZero = false,
  dot = false,
  size = 'md',
  className,
  children,
  ...props
}: NotificationBadgeProps) {
  const shouldShow = count > 0 || showZero;
  
  if (!shouldShow && !dot && !children) {
    return null;
  }

  const displayCount = count > max ? `${max}+` : count.toString();

  const sizeClasses = {
    sm: 'h-4 min-w-[1rem] text-xs px-1',
    md: 'h-5 min-w-[1.25rem] text-xs px-1.5',
    lg: 'h-6 min-w-[1.5rem] text-sm px-2',
  };

  if (dot) {
    return (
      <div
        className={cn(
          'inline-block rounded-full bg-destructive',
          size === 'sm' && 'w-2 h-2',
          size === 'md' && 'w-2.5 h-2.5',
          size === 'lg' && 'w-3 h-3',
          className
        )}
        {...props}
      />
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground font-semibold',
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children || (shouldShow ? displayCount : null)}
    </div>
  );
}

export { Badge, StatusBadge, NotificationBadge, badgeVariants };