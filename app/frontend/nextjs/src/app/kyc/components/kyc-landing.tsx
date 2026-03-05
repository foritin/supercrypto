'use client';

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
  type LucideIcon,
} from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useKycContext } from '@/contexts/kyc-context';

type LandingIcon = LucideIcon;

export function KycLanding() {
  const { t } = useTranslation();
  const { hideLandingPage, loadDraft, status, lastSaved } = useKycContext();

  const benefits = React.useMemo(
    () => [
      {
        icon: Zap as LandingIcon,
        title: t('kyc.landing.benefits.limit.title'),
        description: t('kyc.landing.benefits.limit.desc'),
      },
      {
        icon: Globe as LandingIcon,
        title: t('kyc.landing.benefits.premium.title'),
        description: t('kyc.landing.benefits.premium.desc'),
      },
      {
        icon: Lock as LandingIcon,
        title: t('kyc.landing.benefits.security.title'),
        description: t('kyc.landing.benefits.security.desc'),
      },
      {
        icon: Shield as LandingIcon,
        title: t('kyc.landing.benefits.compliance.title'),
        description: t('kyc.landing.benefits.compliance.desc'),
      },
    ],
    [t]
  );

  const requirements = React.useMemo(
    () => [
      { icon: FileCheck as LandingIcon, text: t('kyc.landing.requirements.id') },
      { icon: Camera as LandingIcon, text: t('kyc.landing.requirements.camera') },
      { icon: Clock as LandingIcon, text: t('kyc.landing.requirements.time') },
    ],
    [t]
  );

  const processSteps = React.useMemo(
    () => [
      { step: '1', title: t('kyc.landing.process.step1.title'), desc: t('kyc.landing.process.step1.desc') },
      { step: '2', title: t('kyc.landing.process.step2.title'), desc: t('kyc.landing.process.step2.desc') },
      { step: '3', title: t('kyc.landing.process.step3.title'), desc: t('kyc.landing.process.step3.desc') },
      { step: '4', title: t('kyc.landing.process.step4.title'), desc: t('kyc.landing.process.step4.desc') },
    ],
    [t]
  );

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
        <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30">
          <Shield className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">
          {t('kyc.landing.title')}
        </h1>
        <p className="text-xl text-white/60 max-w-2xl mx-auto mb-8">
          {t('kyc.landing.subtitle')}
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
                {t('kyc.landing.continue')}
                <ChevronRight className="h-5 w-5" />
              </>
            ) : (
              <>
                {t('kyc.landing.start')}
                <ChevronRight className="h-5 w-5" />
              </>
            )}
          </Button>

          {status === 'draft' && lastSaved && (
            <p className="text-sm text-primary">
              {t('kyc.landing.draftSaved', {
                time: new Date(lastSaved).toLocaleString(),
              })}
            </p>
          )}
        </div>
      </div>

      {/* Benefits Grid */}
      <div>
        <h2 className="text-2xl font-bold text-white text-center mb-8">
          {t('kyc.landing.benefitsTitle')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {benefits.map((benefit, index) => {
            const BenefitIcon = benefit.icon;
            return (
              <Card
                key={index}
                className="p-6 glass border-white/10 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <BenefitIcon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">{benefit.title}</h3>
                    <p className="text-sm text-white/60">{benefit.description}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Requirements Section */}
      <Card className="p-8 glass border-primary/20">
        <h2 className="text-xl font-bold text-white mb-6">
          {t('kyc.landing.whatYouNeed')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {requirements.map((req, index) => {
            const ReqIcon = req.icon;
            return (
              <div key={index} className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <ReqIcon className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm text-white/70">{req.text}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Process Steps */}
      <Card className="p-8 glass border-white/10">
        <h2 className="text-xl font-bold text-white mb-8 text-center">
          {t('kyc.landing.processTitle')}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {processSteps.map((item, index) => (
            <div key={index} className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                <span className="text-primary font-bold">{item.step}</span>
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
            {t('kyc.landing.securityNote')}
          </h4>
          <p className="text-sm text-amber-400/70">
            {t('kyc.landing.securityDesc')}
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
            <>{t('kyc.landing.continue')}</>
          ) : (
            <>{t('kyc.landing.startNow')}</>
          )}
          <ChevronRight className="h-5 w-5" />
        </Button>
        <p className="mt-4 text-sm text-white/40">
          {t('kyc.landing.questions')}
          <a href="/support" className="text-primary hover:underline">
            {t('kyc.landing.supportTeam')}
          </a>
        </p>
      </div>
    </div>
  );
}
