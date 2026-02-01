import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isFullWidth?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      isFullWidth = false,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = React.useId();
    const hasError = !!error;

    return (
      <div className={cn('flex flex-col gap-1.5', isFullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[var(--color-text-primary)]"
          >
            {label}
            {props.required && (
              <span className="text-[var(--color-error)] ml-1">*</span>
            )}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            type={type}
            className={cn(
              // Base styles
              'flex h-10 w-full rounded-md border bg-[var(--color-bg-elevated)] px-3 py-2 text-sm',
              'text-[var(--color-text-primary)] placeholder:text-[var(--color-text-placeholder)]',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/50',
              'disabled:cursor-not-allowed disabled:opacity-50',
              // Error state
              hasError
                ? 'border-[var(--color-error)] focus:border-[var(--color-error)] focus:ring-[var(--color-error)]/50'
                : 'border-[var(--color-border-default)] focus:border-[var(--color-brand-primary)]',
              // Icon padding
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            ref={ref}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={
              hasError ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]">
              {rightIcon}
            </div>
          )}
        </div>
        {helperText && !hasError && (
          <p id={`${inputId}-helper`} className="text-xs text-[var(--color-text-tertiary)]">
            {helperText}
          </p>
        )}
        {hasError && (
          <p id={`${inputId}-error`} className="text-xs text-[var(--color-error)]">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
