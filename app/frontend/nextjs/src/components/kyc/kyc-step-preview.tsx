'use client'

/**
 * KycStepPreview - KYC 步骤预览组件
 *
 * 在 KYC 向导开始前显示各步骤的预览，帮助用户了解整个流程
 * 包含步骤图标、标题、描述和预估时间
 */

import {
  User,
  FileText,
  Camera,
  CheckCircle,
  Clock,
  Shield,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ============ 类型定义 ============

export interface KycStepPreviewProps {
  /** 开始 KYC 回调 */
  onStart: () => void
  /** 自定义类名 */
  className?: string
}

// ============ 步骤配置 ============

interface StepInfo {
  icon: React.ReactNode
  titleKey: string
  descriptionKey: string
  durationKey: string
}

const STEPS: StepInfo[] = [
  {
    icon: <User className="w-5 h-5" />,
    titleKey: 'kyc.steps.personal.title',
    descriptionKey: 'kyc.steps.personal.description',
    durationKey: 'kyc.steps.personal.duration',
  },
  {
    icon: <FileText className="w-5 h-5" />,
    titleKey: 'kyc.steps.document.title',
    descriptionKey: 'kyc.steps.document.description',
    durationKey: 'kyc.steps.document.duration',
  },
  {
    icon: <Camera className="w-5 h-5" />,
    titleKey: 'kyc.steps.selfie.title',
    descriptionKey: 'kyc.steps.selfie.description',
    durationKey: 'kyc.steps.selfie.duration',
  },
  {
    icon: <CheckCircle className="w-5 h-5" />,
    titleKey: 'kyc.steps.confirm.title',
    descriptionKey: 'kyc.steps.confirm.description',
    durationKey: 'kyc.steps.confirm.duration',
  },
]

// ============ 组件实现 ============

export function KycStepPreview({ onStart, className }: KycStepPreviewProps) {
  const { t } = useTranslation()

  return (
    <div
      className={cn(
        'bg-[rgba(17,25,22,0.8)] backdrop-blur-[12px]',
        'rounded-2xl border border-white/[0.08]',
        'overflow-hidden',
        className
      )}
    >
      {/* 头部 */}
      <div className="p-6 sm:p-8 border-b border-white/[0.08]">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-primary/10">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-white">
            {t('kyc.preview.title')}
          </h2>
        </div>
        <p className="text-white/60 text-sm leading-relaxed">
          {t(
            'kyc.preview.description'
          )}
        </p>
      </div>

      {/* 步骤列表 */}
      <div className="p-6 sm:p-8">
        <div className="space-y-4">
          {STEPS.map((step, index) => (
            <div
              key={index}
              className={cn(
                'flex items-start gap-4 p-4 rounded-xl',
                'bg-white/[0.02] border border-white/[0.06]',
                'transition-all duration-300',
                'hover:bg-white/[0.04] hover:border-white/[0.1]'
              )}
            >
              {/* 步骤序号和图标 */}
              <div className="flex-shrink-0">
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center',
                    'bg-primary/10 text-primary'
                  )}
                >
                  {step.icon}
                </div>
              </div>

              {/* 步骤内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-white/40">
                    {t('kyc.preview.step', { number: index + 1 })}
                  </span>
                  <h3 className="font-medium text-white">
                    {t(step.titleKey)}
                  </h3>
                </div>
                <p className="text-sm text-white/50 mb-2">
                  {t(step.descriptionKey)}
                </p>
                <div className="flex items-center gap-1 text-xs text-white/30">
                  <Clock className="w-3 h-3" />
                  <span>{t(step.durationKey)}</span>
                </div>
              </div>

              {/* 箭头指示 */}
              <div className="flex-shrink-0 self-center">
                <ChevronRight className="w-5 h-5 text-white/20" />
              </div>
            </div>
          ))}
        </div>

        {/* 底部信息 */}
        <div className="mt-6 p-4 rounded-lg bg-gold/5 border border-gold/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-gold mb-1">
                {t('kyc.preview.requirements.title')}
              </h4>
              <ul className="text-sm text-white/60 space-y-1">
                <li>• {t('kyc.preview.requirements.id')}</li>
                <li>• {t('kyc.preview.requirements.selfie')}</li>
                <li>• {t('kyc.preview.requirements.address')}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 开始按钮 */}
        <div className="mt-6">
          <Button
            onClick={onStart}
            className={cn(
              'w-full h-12',
              'bg-primary hover:bg-primary/90 text-bg-dark font-medium'
            )}
          >
            {t('kyc.preview.startButton')}
          </Button>
          <p className="text-center text-xs text-white/40 mt-3">
            {t('kyc.preview.eta')}
          </p>
        </div>
      </div>
    </div>
  )
}

export default KycStepPreview
