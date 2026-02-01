'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useKycContext } from '@/contexts/kyc-context';
import { 
  Shield, 
  Zap, 
  Globe, 
  Lock, 
  FileCheck, 
  Camera, 
  ChevronRight,
  Clock,
  AlertCircle,
} from 'lucide-react';

const benefits = [
  {
    icon: Zap,
    title: 'Higher Investment Limits',
    description: 'Unlock higher daily and monthly investment limits after verification',
  },
  {
    icon: Globe,
    title: 'Access to Premium Assets',
    description: 'Get exclusive access to high-yield RWA investment opportunities',
  },
  {
    icon: Lock,
    title: 'Enhanced Security',
    description: 'Your identity is protected with bank-level encryption',
  },
  {
    icon: Shield,
    title: 'Regulatory Compliance',
    description: 'Stay compliant with global financial regulations',
  },
];

const requirements = [
  { icon: FileCheck, text: 'Valid government-issued ID (Passport, National ID, or Driver\'s License)' },
  { icon: Camera, text: 'Camera access for face verification' },
  { icon: Clock, text: '5-10 minutes of your time' },
];

export function KycLanding() {
  const { t } = useTranslation();
  const { hideLandingPage, loadDraft, status, lastSaved } = useKycContext();

  const handleStart = () => {
    if (status === 'draft') {
      loadDraft();
    }
    hideLandingPage();
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-12">
        <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#00D4AA]/20 to-[#00D4AA]/5 flex items-center justify-center border border-[#00D4AA]/30">
          <Shield className="h-12 w-12 text-[#00D4AA]" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">
          {t('kyc.landing.title', 'Identity Verification')}
        </h1>
        <p className="text-xl text-white/60 max-w-2xl mx-auto mb-8">
          {t('kyc.landing.subtitle', 'Complete your KYC verification to unlock the full potential of SuperCrypto RWA investment platform')}
        </p>

        {/* Start Button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            variant="primary"
            size="lg"
            onClick={handleStart}
            className="min-w-[200px] gap-2 text-lg h-14"
          >
            {status === 'draft' ? (
              <>
                {t('kyc.landing.continue', 'Continue Verification')}
                <ChevronRight className="h-5 w-5" />
              </>
            ) : (
              <>
                {t('kyc.landing.start', 'Start Verification')}
                <ChevronRight className="h-5 w-5" />
              </>
            )}
          </Button>

          {status === 'draft' && lastSaved && (
            <p className="text-sm text-[#00D4AA]">
              {t('kyc.landing.draftSaved', 'Last saved: {{time}}', {
                time: new Date(lastSaved).toLocaleString(),
              })}
            </p>
          )}
        </div>
      </div>

      {/* Benefits Grid */}
      <div>
        <h2 className="text-2xl font-bold text-white text-center mb-8">
          {t('kyc.landing.benefitsTitle', 'Why Verify Your Identity?')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {benefits.map((benefit, index) => (
            <Card
              key={index}
              className="p-6 glass border-white/10 hover:border-[#00D4AA]/30 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#00D4AA]/10 flex items-center justify-center shrink-0">
                  <benefit.icon className="h-6 w-6 text-[#00D4AA]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">{benefit.title}</h3>
                  <p className="text-sm text-white/60">{benefit.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Requirements Section */}
      <Card className="p-8 glass border-[#00D4AA]/20">
        <h2 className="text-xl font-bold text-white mb-6">
          {t('kyc.landing.whatYouNeed', 'What You\'ll Need')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {requirements.map((req, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00D4AA]/10 flex items-center justify-center shrink-0">
                <req.icon className="h-5 w-5 text-[#00D4AA]" />
              </div>
              <p className="text-sm text-white/70">{req.text}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Process Steps */}
      <Card className="p-8 glass border-white/10">
        <h2 className="text-xl font-bold text-white mb-8 text-center">
          {t('kyc.landing.processTitle', 'Verification Process')}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { step: '1', title: 'Personal Info', desc: 'Basic details' },
            { step: '2', title: 'Identity', desc: 'Upload documents' },
            { step: '3', title: 'Face Check', desc: 'Quick selfie' },
            { step: '4', title: 'Review', desc: 'Submit & wait' },
          ].map((item, index) => (
            <div key={index} className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#00D4AA]/10 border border-[#00D4AA]/30 flex items-center justify-center">
                <span className="text-[#00D4AA] font-bold">{item.step}</span>
              </div>
              <h4 className="font-medium text-white mb-1">{item.title}</h4>
              <p className="text-xs text-white/50">{item.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Security Note */}
      <div className="flex items-start gap-4 p-6 rounded-xl bg-amber-500/5 border border-amber-500/20">
        <AlertCircle className="h-6 w-6 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-medium text-amber-400 mb-1">
            {t('kyc.landing.securityNote', 'Your Data is Secure')}
          </h4>
          <p className="text-sm text-amber-400/70">
            We use bank-level encryption to protect your personal information. 
            Your data is only used for identity verification and compliance purposes. 
            We never share your information with third parties without your consent.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center pb-8">
        <Button
          variant="primary"
          size="lg"
          onClick={handleStart}
          className="min-w-[240px] gap-2 text-lg h-14"
        >
          {status === 'draft' ? (
            <>{t('kyc.landing.continue', 'Continue Verification')}</>
          ) : (
            <>{t('kyc.landing.startNow', 'Start Verification Now')}</>
          )}
          <ChevronRight className="h-5 w-5" />
        </Button>
        <p className="mt-4 text-sm text-white/40">
          {t('kyc.landing.questions', 'Questions? Contact our ')}
          <a href="/support" className="text-[#00D4AA] hover:underline">
            {t('kyc.landing.supportTeam', 'support team')}
          </a>
        </p>
      </div>
    </div>
  );
}
