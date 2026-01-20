/**
 * ProjectBindingSection Component
 * 项目绑定区域 - 选择项目并预览将绑定的合约
 */
'use client'

import React from 'react'
import { Form, Select, Space, Tag, Tooltip, Alert, Typography } from 'antd'
import { LinkOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { FormSection } from './FormSection'
import type { ProjectBindingSectionProps } from './types'

const { Text } = Typography

export const ProjectBindingSection = React.memo(function ProjectBindingSection({
  availableProjects,
  isLoadingProjects,
  selectedProjects,
  selectedContracts,
}: ProjectBindingSectionProps) {
  const { t } = useTranslation()

  return (
    <FormSection
      icon={<LinkOutlined />}
      title={t('admin.assets.section.binding', '项目合约绑定')}
      description={t('admin.assets.section.bindingDesc', '选择要绑定的智能合约项目')}
      extra={
        <span className="px-2 py-0.5 text-xs bg-orange-500/20 text-orange-400 rounded">
          {t('admin.assets.recommended', '推荐')}
        </span>
      }
    >
      <Form.Item
        name="bind_projects"
        label={t('admin.assets.form.bindProjects', 'Select Projects')}
        tooltip={t('admin.assets.form.bindProjectsTooltip', '选择项目后，该项目下的可用合约将自动绑定')}
      >
        <Select
          mode="multiple"
          placeholder={t('admin.assets.form.selectProjects', 'Select projects (multiple)')}
          loading={isLoadingProjects}
          options={availableProjects.map((p) => ({
            value: p.project,
            label: `${p.project} (${p.contract_count} ${t('admin.assets.contracts', 'contracts')})`,
          }))}
          style={{ width: '100%' }}
        />
      </Form.Item>

      {/* 合约预览 */}
      {selectedContracts.length > 0 && (
        <div className="p-4 bg-web3-success/5 border border-web3-success/15 rounded-lg">
          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>
            {t('admin.assets.contractsToBindTitle', '将要绑定的合约')} ({selectedContracts.length})
          </Text>
          <Space wrap size={[8, 8]}>
            {selectedContracts.map((c) => (
              <Tooltip key={`${c.contract_name}-${c.contract_address}`} title={c.contract_address}>
                <Tag
                  color={c.contract_type === 'common' ? 'blue' : c.contract_type === 'mock' ? 'cyan' : 'green'}
                >
                  {c.contract_name}
                </Tag>
              </Tooltip>
            ))}
          </Space>
        </div>
      )}

      {selectedProjects.length === 0 && (
        <Alert
          message={t('admin.assets.noProjectWarning', '未选择项目，资产创建后将不会绑定任何合约')}
          description={t(
            'admin.assets.noProjectWarningDesc',
            '用户端仅展示已绑定合约的资产，您可以在创建后通过合约绑定功能进行绑定'
          )}
          type="warning"
          showIcon
        />
      )}
    </FormSection>
  )
})
