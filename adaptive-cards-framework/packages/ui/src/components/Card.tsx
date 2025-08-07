import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

const cardVariants = cva(
  'rounded-lg border text-card-foreground shadow transition-shadow duration-200',
  {
    variants: {
      variant: {
        default: 'bg-card border-border shadow-elevation-1',
        emphasis: 'bg-emphasis text-emphasis-foreground border-emphasis/20 shadow-elevation-2',
        accent: 'bg-accent text-accent-foreground border-accent/20 shadow-elevation-1',
        success: 'bg-success/10 text-success-foreground border-success/20 shadow-elevation-1',
        warning: 'bg-warning/10 text-warning-foreground border-warning/20 shadow-elevation-1',
        error: 'bg-error/10 text-error-foreground border-error/20 shadow-elevation-1',
        ghost: 'border-transparent shadow-none',
      },
      size: {
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
        xl: 'p-8',
      },
      elevation: {
        none: 'shadow-none',
        sm: 'shadow-elevation-1',
        md: 'shadow-elevation-2',
        lg: 'shadow-elevation-3',
        xl: 'shadow-elevation-4',
      },
      interactive: {
        false: '',
        true: 'cursor-pointer hover:shadow-elevation-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      elevation: 'sm',
      interactive: false,
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, elevation, interactive, asChild = false, ...props }, ref) => {
    const Comp = asChild ? React.Fragment : 'div';
    
    if (asChild) {
      return (
        <React.Fragment {...props} />
      );
    }

    return (
      <Comp
        className={cn(cardVariants({ variant, size, elevation, interactive, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 pb-4', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-xl font-semibold leading-none tracking-tight text-card-foreground',
      className
    )}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground leading-relaxed', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('space-y-4', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center pt-4 border-t border-border/50', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  cardVariants,
};