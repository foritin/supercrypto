'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { StepIndicator } from '@/components/ui/step-indicator';
import { KycProvider, useKycContext, type KycStatus } from '@/contexts/kyc-context';
import { BasicInfoStep } from './steps/basic-info-step';
import { IdentityStep } from './steps/identity-step';
import { LivenessStep } from './steps/liveness-step';
import { ConfirmationStep } from './steps/confirmation-step';
import { KycLanding } from './components/kyc-landing';
import { KycStatusPanel } from './components/kyc-status-panel';
import { CheckCircle, FileText, Shield, User, RotateCcw } from 'lucide-react';

const steps = [
  { 
    id: 'basic-info', 
    title: 'Basic Info', 
    description: 'Personal details',
    icon: User,
  },
  { 
    id: 'identity', 
    title: 'Identity', 
    description: 'Document upload',
    icon: FileText,
  },
  { 
    id: 'liveness', 
    title: 'Verification', 
    description: 'Face verification',
    icon: Shield,
  },
  { 
    id: 'confirmation', 
    title: 'Review', 
    description: 'Confirm & submit',
    icon: CheckCircle,
  },
];

const statusMessages: Record<KycStatus, { title: string; description: string }> = {
  not_started: {
    title: 'Complete KYC Verification',
    description: 'Verify your identity to unlock full platform features',
  },
  draft: {
    title: 'Complete Your KYC',
    description: 'Your progress has been saved. Continue where you left off.',
  },
  submitted: {
    title: 'KYC Submitted',
    description: 'Your application is being reviewed.',
  },
  pending_review: {
    title: 'Under Review',
    description: 'Our team is reviewing your documents.',
  },
  approved: {
    title: 'KYC Approved',
    description: 'Your identity has been verified.',
  },
  rejected: {
    title: 'KYC Rejected',
    description: 'Please review the feedback and resubmit.',
  },
};

function KycContent() {
  const { t } = useTranslation();
  const { currentStep, status, showLanding, formData, lastSaved, goToStep, reset } = useKycContext();

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <BasicInfoStep />;
      case 1:
        return <IdentityStep />;
      case 2:
        return <LivenessStep />;
      case 3:
        return <ConfirmationStep />;
      default:
        return <BasicInfoStep />;
    }
  };

  // Show status panel for submitted/approved/rejected states
  if (status === 'submitted' || status === 'pending_review' || status === 'approved' || status === 'rejected') {
    return (
      <div className="min-h-screen bg-[#0A0F0D] py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <KycStatusPanel />
        </div>
      </div>
    );
  }

  // Show landing page
  if (showLanding) {
    return (
      <div className="min-h-screen bg-[#0A0F0D] py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <KycLanding />
        </div>
      </div>
    );
  }

  const message = statusMessages[status];

  return (
    <div className="min-h-screen bg-[#0A0F0D] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1" /> {/* Spacer */}
            <h1 className="text-3xl font-bold text-white">
              {t('kyc.title', message.title)}
            </h1>
            <div className="flex-1 flex justify-end">
              <button
                onClick={() => {
                  if (confirm(t('kyc.resetConfirm', 'Are you sure you want to clear all entered data? This action cannot be undone.'))) {
                    reset();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title={t('kyc.reset', 'Clear all data')}
              >
                <RotateCcw className="h-4 w-4" />
                <span className="hidden sm:inline">{t('kyc.reset', 'Reset')}</span>
              </button>
            </div>
          </div>
          <p className="text-white/60 max-w-lg mx-auto text-center">
            {t('kyc.subtitle', message.description)}
          </p>
          {lastSaved && (
            <p className="text-sm text-[#00D4AA] mt-2 text-center">
              {t('kyc.draftSaved', 'Draft saved {{time}}', {
                time: new Date(lastSaved).toLocaleTimeString(),
              })}
            </p>
          )}
        </div>

        {/* Step Indicator */}
        <Card className="p-6 mb-6 glass border-[#00D4AA]/20">
          <StepIndicator
            steps={steps.map((s, i) => ({
              id: s.id,
              title: s.title,
              description: s.description,
            }))}
            currentStep={currentStep}
            onStepClick={(index) => {
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

export default function KycPage() {
  return (
    <KycProvider>
      <KycContent />
    </KycProvider>
  );
}
