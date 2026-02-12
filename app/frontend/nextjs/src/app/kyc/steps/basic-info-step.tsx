'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useKycContext } from '@/contexts/kyc-context';
import { FormField, FormInput } from '../components/form-field';
import { CountrySelect } from '../components/country-select';
import { ArrowRight, ArrowLeft, User, Mail, Phone, Calendar, Save } from 'lucide-react';

export function BasicInfoStep() {
  const { t, i18n } = useTranslation();
  const { formData, errors, updateFormData, validateField, showLandingPage, nextStep, saveDraft, lastSaved } = useKycContext();

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    updateFormData({ [field]: e.target.value });
  };

  const handleBlur = (field: keyof typeof formData) => () => {
    validateField(field);
  };

  const handleContinue = () => {
    saveDraft();
    nextStep();
  };

  // 当有错误时禁用按钮（实时响应）
  const hasErrors = Object.keys(errors).length > 0;

  // 设置日期输入框的语言
  const dateInputLang = i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-US';

  return (
    <Card className="p-8 glass border-primary/20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={showLandingPage}
            className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            title={t('kyc.backToOverview', 'Back to Overview')}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h3 className="text-xl font-semibold text-white">
            {t('kyc.basicInfo.title', 'Personal Information')}
          </h3>
        </div>
        {lastSaved && (
          <span className="flex items-center gap-1 text-xs text-primary">
            <Save className="h-3 w-3" />
            {t('kyc.autoSaved', 'Auto-saved')}
          </span>
        )}
      </div>

      <div className="space-y-6">
        {/* Name Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField 
            label={t('kyc.basicInfo.firstName', 'First Name')} 
            required 
            error={errors.firstName}
          >
            <FormInput
              type="text"
              value={formData.firstName || ''}
              onChange={handleInputChange('firstName')}
              onBlur={handleBlur('firstName')}
              placeholder="John"
              error={errors.firstName}
              icon={<User className="h-4 w-4" />}
            />
          </FormField>

          <FormField 
            label={t('kyc.basicInfo.lastName', 'Last Name')} 
            required 
            error={errors.lastName}
          >
            <FormInput
              type="text"
              value={formData.lastName || ''}
              onChange={handleInputChange('lastName')}
              onBlur={handleBlur('lastName')}
              placeholder="Doe"
              error={errors.lastName}
              icon={<User className="h-4 w-4" />}
            />
          </FormField>
        </div>

        {/* DOB and Nationality */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField 
            label={t('kyc.basicInfo.dateOfBirth', 'Date of Birth')} 
            required 
            error={errors.dateOfBirth}
          >
            <FormInput
              type="date"
              value={formData.dateOfBirth || ''}
              onChange={handleInputChange('dateOfBirth')}
              onBlur={handleBlur('dateOfBirth')}
              max={new Date().toISOString().split('T')[0]}
              error={errors.dateOfBirth}
              icon={<Calendar className="h-4 w-4" />}
              lang={dateInputLang}
            />
          </FormField>

          <FormField 
            label={t('kyc.basicInfo.nationality', 'Nationality')} 
            required 
            error={errors.nationality}
          >
            <CountrySelect
              value={formData.nationality || ''}
              onChange={handleInputChange('nationality')}
              onBlur={handleBlur('nationality')}
              error={errors.nationality}
            />
          </FormField>
        </div>

        {/* Contact Information */}
        <div className="pt-6 border-t border-white/10">
          <h4 className="text-lg font-medium text-white mb-4">
            {t('kyc.basicInfo.contact', 'Contact Information')}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField 
              label={t('kyc.basicInfo.email', 'Email Address')} 
              required 
              error={errors.email}
            >
              <FormInput
                type="email"
                value={formData.email || ''}
                onChange={handleInputChange('email')}
                onBlur={handleBlur('email')}
                placeholder="john.doe@example.com"
                error={errors.email}
                icon={<Mail className="h-4 w-4" />}
              />
            </FormField>

            <FormField 
              label={t('kyc.basicInfo.phone', 'Phone Number')} 
              required 
              error={errors.phone}
              helperText={t('kyc.basicInfo.phoneHelper', 'Include country code (e.g., +1 for US)')}
            >
              <FormInput
                type="tel"
                value={formData.phone || ''}
                onChange={handleInputChange('phone')}
                onBlur={handleBlur('phone')}
                placeholder="+1234567890"
                error={errors.phone}
                icon={<Phone className="h-4 w-4" />}
              />
            </FormField>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-end pt-6">
          <Button
            variant="primary"
            size="lg"
            onClick={handleContinue}
            disabled={hasErrors}
            className="gap-2"
          >
            {t('common.continue', 'Continue')}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
