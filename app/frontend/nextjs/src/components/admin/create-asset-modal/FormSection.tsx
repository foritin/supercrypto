/**
 * FormSection Component
 * 表单分组容器 - 用于分组表单项，统一视觉风格
 * Migrated from Ant Design to shadcn/ui
 */
'use client'

import React from 'react'
import type { FormSectionProps } from './types'

export const FormSection = React.memo(function FormSection({
  icon,
  title,
  description,
  children,
  extra,
}: FormSectionProps) {
  return (
    <div className="mb-6 p-5 bg-white/[0.02] border border-white/[0.06] rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="text-web3-success text-lg">{icon}</span>
          <div>
            <h5 className="text-[15px] font-semibold text-white m-0">
              {title}
            </h5>
            {description && (
              <p className="text-xs text-muted-foreground m-0">
                {description}
              </p>
            )}
          </div>
        </div>
        {extra}
      </div>
      {children}
    </div>
  )
})
