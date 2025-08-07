import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

const skeletonVariants = cva(
  'animate-pulse bg-muted rounded',
  {
    variants: {
      variant: {
        default: 'bg-muted',
        shimmer: 'bg-gradient-to-r from-muted via-background to-muted bg-[length:200%_100%] animate-[shimmer_2s_infinite]',
        wave: 'bg-muted relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:animate-[wave_2s_infinite]',
      },
      speed: {
        slow: 'animate-[pulse_2s_ease-in-out_infinite]',
        normal: 'animate-pulse',
        fast: 'animate-[pulse_1s_ease-in-out_infinite]',
      },
    },
    defaultVariants: {
      variant: 'default',
      speed: 'normal',
    },
  }
);

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

function Skeleton({ className, variant, speed, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(skeletonVariants({ variant, speed }), className)}
      {...props}
    />
  );
}

// Pre-built skeleton components for common patterns
function SkeletonText({ 
  lines = 1, 
  className,
  ...props 
}: { 
  lines?: number;
  className?: string;
} & SkeletonProps) {
  if (lines === 1) {
    return <Skeleton className={cn('h-4', className)} {...props} />;
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            i === lines - 1 && 'w-3/4', // Last line is shorter
            className
          )}
          {...props}
        />
      ))}
    </div>
  );
}

function SkeletonButton({ 
  size = 'md',
  className,
  ...props 
}: { 
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
} & SkeletonProps) {
  const sizeClasses = {
    sm: 'h-9 w-20',
    md: 'h-10 w-24',
    lg: 'h-11 w-28',
    xl: 'h-12 w-32',
  };

  return (
    <Skeleton
      className={cn(sizeClasses[size], 'rounded-md', className)}
      {...props}
    />
  );
}

function SkeletonAvatar({ 
  size = 'md',
  className,
  ...props 
}: { 
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
} & SkeletonProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-14 w-14',
  };

  return (
    <Skeleton
      className={cn(sizeClasses[size], 'rounded-full', className)}
      {...props}
    />
  );
}

function SkeletonCard({ 
  showAvatar = false,
  showButton = false,
  textLines = 3,
  className,
  ...props 
}: { 
  showAvatar?: boolean;
  showButton?: boolean;
  textLines?: number;
  className?: string;
} & SkeletonProps) {
  return (
    <div className={cn('p-4 space-y-4 border rounded-lg', className)}>
      {/* Header */}
      <div className="flex items-center space-x-3">
        {showAvatar && <SkeletonAvatar {...props} />}
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/4" {...props} />
          <Skeleton className="h-3 w-1/3" {...props} />
        </div>
      </div>

      {/* Content */}
      <SkeletonText lines={textLines} {...props} />

      {/* Footer */}
      {showButton && (
        <div className="flex justify-end">
          <SkeletonButton {...props} />
        </div>
      )}
    </div>
  );
}

function SkeletonTable({ 
  rows = 5,
  columns = 4,
  showHeader = true,
  className,
  ...props 
}: { 
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
} & SkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {showHeader && (
        <div className="flex space-x-4">
          {Array.from({ length: columns }, (_, i) => (
            <Skeleton key={i} className="h-4 flex-1" {...props} />
          ))}
        </div>
      )}
      
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4">
          {Array.from({ length: columns }, (_, colIndex) => (
            <Skeleton
              key={colIndex}
              className={cn(
                'h-4 flex-1',
                colIndex === 0 && 'w-1/4', // First column narrower
                colIndex === columns - 1 && 'w-1/6' // Last column narrower
              )}
              {...props}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function SkeletonGrid({ 
  items = 6,
  columns = 3,
  className,
  ...props 
}: { 
  items?: number;
  columns?: number;
  className?: string;
} & SkeletonProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
  };

  return (
    <div className={cn('grid gap-4', gridCols[columns as keyof typeof gridCols], className)}>
      {Array.from({ length: items }, (_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-40 w-full" {...props} />
          <Skeleton className="h-4 w-3/4" {...props} />
          <Skeleton className="h-3 w-1/2" {...props} />
        </div>
      ))}
    </div>
  );
}

// Loading container that can wrap other components
function SkeletonWrapper({ 
  loading,
  children,
  fallback,
  className
}: {
  loading: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}) {
  if (loading) {
    return (
      <div className={className}>
        {fallback || <SkeletonCard />}
      </div>
    );
  }

  return <>{children}</>;
}

export {
  Skeleton,
  SkeletonText,
  SkeletonButton,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonTable,
  SkeletonGrid,
  SkeletonWrapper,
  skeletonVariants,
};