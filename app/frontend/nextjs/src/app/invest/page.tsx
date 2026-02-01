'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { StepIndicator } from '@/components/ui/step-indicator';
import { TransactionProvider, useTransactionContext } from '@/contexts/transaction-context';
import { InvestmentStep } from './steps/investment-step';
import { ConfirmationStep } from './steps/confirmation-step';
import { SubmissionStep } from './steps/submission-step';
import { CompletionStep } from './steps/completion-step';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const steps = [
  { id: 'investment', title: 'Investment', description: 'Enter amount' },
  { id: 'confirmation', title: 'Confirmation', description: 'Review details' },
  { id: 'submission', title: 'Submission', description: 'Sign transaction' },
  { id: 'completion', title: 'Completion', description: 'Transaction complete' },
];

function InvestContent() {
  const { t } = useTranslation();
  const { currentStep, goToStep } = useTransactionContext();

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <InvestmentStep />;
      case 1:
        return <ConfirmationStep />;
      case 2:
        return <SubmissionStep />;
      case 3:
        return <CompletionStep />;
      default:
        return <InvestmentStep />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F0D] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/assets">
            <Button variant="ghost" size="icon" className="text-white/60 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {t('invest.title', 'Invest in RWA')}
            </h1>
            <p className="text-white/60 text-sm">
              {t('invest.subtitle', 'Tokenized real world assets with transparent yields')}
            </p>
          </div>
        </div>

        {/* Step Indicator */}
        <Card className="p-6 mb-6 glass border-[#00D4AA]/20">
          <StepIndicator
            steps={steps.map((s, i) => ({
              title: s.title,
              description: s.description,
              status: i < currentStep ? 'completed' : i === currentStep ? 'current' : 'pending',
            }))}
            currentStep={currentStep}
            onStepClick={(index) => {
              // Only allow going back to completed steps
              if (index < currentStep) {
                goToStep(index);
              }
            }}
          />
        </Card>

        {/* Step Content */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}

export default function InvestPage() {
  return (
    <TransactionProvider>
      <InvestContent />
    </TransactionProvider>
  );
}
