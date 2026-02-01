import * as React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export interface Step {
  id: string;
  title: string;
  description?: string;
}

export interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  orientation?: 'horizontal' | 'vertical';
  variant?: 'default' | 'simple' | 'detailed';
  onStepClick?: (stepIndex: number) => void;
  className?: string;
}

export function StepIndicator({
  steps,
  currentStep,
  orientation = 'horizontal',
  variant = 'default',
  onStepClick,
  className,
}: StepIndicatorProps) {
  const isClickable = !!onStepClick;

  return (
    <div
      className={cn(
        'w-full',
        orientation === 'horizontal' && 'flex items-center justify-between',
        orientation === 'vertical' && 'flex flex-col space-y-4',
        className
      )}
    >
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isUpcoming = index > currentStep;
        const isLast = index === steps.length - 1;

        return (
          <React.Fragment key={step.id}>
            <div
              className={cn(
                'flex items-center',
                orientation === 'horizontal' && 'flex-col flex-1',
                orientation === 'vertical' && 'flex-row w-full',
                isClickable && isCompleted && 'cursor-pointer'
              )}
              onClick={() => isClickable && isCompleted && onStepClick(index)}
            >
              {/* Step Circle */}
              <div
                className={cn(
                  'flex items-center justify-center rounded-full transition-all duration-300',
                  variant === 'default' && 'w-10 h-10 border-2',
                  variant === 'simple' && 'w-3 h-3',
                  variant === 'detailed' && 'w-12 h-12 border-2',
                  // States
                  isCompleted &&
                    'bg-[var(--color-success)] border-[var(--color-success)] text-white',
                  isCurrent &&
                    'bg-[var(--color-brand-primary)] border-[var(--color-brand-primary)] text-white ring-4 ring-[var(--color-brand-primary)]/20',
                  isUpcoming &&
                    'bg-transparent border-[var(--color-border-default)] text-[var(--color-text-tertiary)]'
                )}
              >
                {isCompleted ? (
                  <Check className={cn('w-5 h-5', variant === 'simple' && 'w-3 h-3')} />
                ) : (
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      variant === 'simple' && 'text-xs',
                      isUpcoming && 'text-[var(--color-text-tertiary)]'
                    )}
                  >
                    {index + 1}
                  </span>
                )}
              </div>

              {/* Step Labels */}
              {variant !== 'simple' && (
                <div
                  className={cn(
                    'mt-2 text-center',
                    orientation === 'vertical' && 'ml-4 mt-0 text-left flex-1'
                  )}
                >
                  <p
                    className={cn(
                      'text-sm font-medium transition-colors',
                      isCompleted && 'text-[var(--color-success)]',
                      isCurrent && 'text-[var(--color-text-primary)]',
                      isUpcoming && 'text-[var(--color-text-tertiary)]'
                    )}
                  >
                    {step.title}
                  </p>
                  {variant === 'detailed' && step.description && (
                    <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                      {step.description}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Connector Line */}
            {!isLast && (
              <div
                className={cn(
                  'transition-colors duration-300',
                  orientation === 'horizontal' && 'flex-1 h-0.5 mx-4',
                  orientation === 'vertical' && 'w-0.5 h-8 ml-5',
                  isCompleted
                    ? 'bg-[var(--color-success)]'
                    : 'bg-[var(--color-border-default)]'
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Transaction Flow Step Indicator (Specialized)
export function TransactionStepIndicator({
  currentStep,
  className,
}: {
  currentStep: number;
  className?: string;
}) {
  const steps: Step[] = [
    { id: 'preview', title: 'Preview', description: 'Review details' },
    { id: 'confirm', title: 'Confirm', description: 'Verify info' },
    { id: 'submit', title: 'Submit', description: 'Sign transaction' },
    { id: 'complete', title: 'Complete', description: 'Confirmation' },
  ];

  return (
    <StepIndicator
      steps={steps}
      currentStep={currentStep}
      variant="detailed"
      className={className}
    />
  );
}

// KYC Flow Step Indicator (Specialized)
export function KYCStepIndicator({
  currentStep,
  className,
}: {
  currentStep: number;
  className?: string;
}) {
  const steps: Step[] = [
    { id: 'basic', title: 'Basic Info', description: 'Personal details' },
    { id: 'identity', title: 'Identity', description: 'Document upload' },
    { id: 'liveness', title: 'Liveness', description: 'Face verification' },
    { id: 'review', title: 'Review', description: 'Submit KYC' },
  ];

  return (
    <StepIndicator
      steps={steps}
      currentStep={currentStep}
      variant="detailed"
      className={className}
    />
  );
}
