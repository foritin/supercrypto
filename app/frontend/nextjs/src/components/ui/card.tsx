import * as React from 'react';

import { cn } from '@/lib/utils';

// Card Root
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: 'default' | 'glass' | 'elevated' | 'outlined';
    isInteractive?: boolean;
  }
>(({ className, variant = 'default', isInteractive = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-xl',
      // Variants
      variant === 'default' && 'bg-[var(--color-bg-elevated)] border border-[var(--color-border-default)]',
      variant === 'glass' && 'glass',
      variant === 'elevated' && 'bg-[var(--color-bg-elevated)] shadow-lg shadow-black/20',
      variant === 'outlined' && 'bg-transparent border border-[var(--color-border-default)]',
      // Interactive
      isInteractive && 'cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-xl',
      className
    )}
    {...props}
  />
));
Card.displayName = 'Card';

// Card Header
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

// Card Title
const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-lg font-semibold text-[var(--color-text-primary)]', className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

// Card Description
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-[var(--color-text-secondary)]', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

// Card Content
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

// Card Footer
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-6 pt-0', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
