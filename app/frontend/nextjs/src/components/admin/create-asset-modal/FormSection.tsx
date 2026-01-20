/**
 * FormSection Component
 * 表单分组容器 - 用于分组表单项，统一视觉风格
 */
'use client'

import React from 'react'
import { Typography } from 'antd'
import type { FormSectionProps } from './types'

const { Text, Title } = Typography

export const FormSection = React.memo(function FormSection({
  icon,
  title,
  description,
  children,
  extra,
}: FormSectionProps) {
  return (
    <div
      className="mb-6 p-5 bg-white/[0.02] border border-white/[0.06] rounded-xl"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="text-web3-success text-lg">{icon}</span>
          <div>
            <Title level={5} style={{ margin: 0, fontSize: 15 }}>
              {title}
            </Title>
            {description && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {description}
              </Text>
            )}
          </div>
        </div>
        {extra}
      </div>
      {children}
    </div>
  )
})
