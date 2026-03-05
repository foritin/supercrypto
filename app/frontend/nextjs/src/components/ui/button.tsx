import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base styles
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // Primary: Deep Sea Blue
        primary:
          'bg-[var(--color-brand-primary)] text-white hover:bg-[var(--color-brand-primary-light)] active:bg-[var(--color-brand-primary-dark)] shadow-lg shadow-[var(--color-brand-primary)]/25',
        // Secondary: Outline with primary color
        secondary:
          'border border-[var(--color-brand-primary)] bg-transparent text-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/10 hover:border-[var(--color-brand-primary-light)]',
        // Accent: Antique Gold for emphasis
        accent:
          'bg-[var(--color-brand-accent)] text-[var(--color-bg-dark)] hover:bg-[var(--color-brand-accent-light)] active:bg-[var(--color-brand-accent-dark)] shadow-lg shadow-[var(--color-brand-accent)]/25 font-semibold',
        // Ghost: Transparent background
        ghost:
          'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-text-primary)]',
        // Destructive: Error state
        destructive:
          'bg-[var(--color-error)] text-white hover:bg-[var(--color-error-light)] active:bg-[var(--color-error-dark)] shadow-lg shadow-[var(--color-error)]/25',
        // Glass: Glassmorphism effect
        glass:
          'bg-[var(--color-glass-bg)] backdrop-blur-md border border-[var(--color-glass-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-glass-bg-elevated)] active:scale-[0.98]',
        // Outline variant
        outline:
          'border border-[var(--color-border-default)] bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)] hover:border-[var(--color-border-hover)]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-md px-8 text-base',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8 rounded-md',
        'icon-lg': 'h-12 w-12 rounded-md',
      },
      isLoading: {
        true: 'cursor-not-allowed opacity-70',
        false: '',
      },
      isFullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
      isLoading: false,
      isFullWidth: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  isFullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      isLoading,
      isFullWidth,
      asChild = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';
    
    // 当 asChild 为 true 时，Slot 只接受单个子元素，不渲染额外内容
    if (asChild) {
      return (
        <Comp
          className={cn(
            buttonVariants({ variant, size, isLoading, isFullWidth, className })
          )}
          ref={ref}
          disabled={disabled || isLoading}
          {...props}
        >
          {children}
        </Comp>
      );
    }
    
    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, isLoading, isFullWidth, className })
        )}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!isLoading && leftIcon}
        {children}
        {!isLoading && rightIcon}
      </Comp>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
