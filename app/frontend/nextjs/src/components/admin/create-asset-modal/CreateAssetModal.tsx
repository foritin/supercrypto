/**
 * CreateAssetModal - Premium 风格的创建资产弹窗
 * 
 * 功能:
 * - 分组布局 (基本信息 / APY 设置 / 媒体上传 / 项目绑定)
 * - 支持媒体文件上传 (封面图、相册、估值报告、法律文件等)
 * - 实时预览将要绑定的合约
 * - 符合 Premium UI 设计风格
 * 
 * 重构说明:
 * - 从单文件拆分为模块目录结构
 * - 提取 FormSection、MediaUploadSection、ProjectBindingSection 为独立组件
 * - 类型定义和常量移至 types.ts
 */
'use client'

import { useState } from 'react'
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Space,
  Typography,
  Tag,
  Tooltip,
  Row,
  Col,
  message,
} from 'antd'
import {
  PlusOutlined,
  InfoCircleOutlined,
  DollarOutlined,
  BankOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import type { UploadFile } from 'antd'
import {
  assetService,
  type AssetCreateRequest,
  type AssetType,
  ASSET_TYPE_NAMES,
} from '@/services/asset'

import { FormSection } from './FormSection'
import { MediaUploadSection } from './MediaUploadSection'
import { ProjectBindingSection } from './ProjectBindingSection'
import type { CreateAssetModalProps, AssetFormValues } from './types'

const { Text, Title } = Typography
const { TextArea } = Input

// 资产类型选项
const ASSET_TYPE_OPTIONS: { value: AssetType; label: string }[] = [
  { value: 'real_estate', label: ASSET_TYPE_NAMES.real_estate },
  { value: 'bond', label: ASSET_TYPE_NAMES.bond },
  { value: 'commodity', label: ASSET_TYPE_NAMES.commodity },
  { value: 'equity', label: ASSET_TYPE_NAMES.equity },
  { value: 'other', label: ASSET_TYPE_NAMES.other },
]

export function CreateAssetModal({
  open,
  onClose,
  onSuccess,
  availableProjects,
  isLoadingProjects,
}: CreateAssetModalProps) {
  const { t } = useTranslation()
  const [form] = Form.useForm()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // 媒体文件状态
  const [coverFile, setCoverFile] = useState<UploadFile[]>([])
  const [galleryFiles, setGalleryFiles] = useState<UploadFile[]>([])

  // 重置表单
  const handleClose = () => {
    form.resetFields()
    setCoverFile([])
    setGalleryFiles([])
    onClose()
  }

  // 提交表单
  const handleSubmit = async (values: AssetFormValues) => {
    setIsSubmitting(true)
    try {
      // 提取 bind_projects，不包含在 createData 中
      const { bind_projects, ...formValues } = values
      
      // 创建资产
      const createData: AssetCreateRequest = {
        name: formValues.name,
        symbol: formValues.symbol.toUpperCase(),
        asset_type: formValues.asset_type,
        description: formValues.description,
        location: formValues.location,
        total_supply: formValues.total_supply,
        min_subscription: formValues.min_subscription || 100,
        current_price: formValues.current_price || 1,
        apy_3m: formValues.apy_3m,
        apy_6m: formValues.apy_6m,
        apy_12m: formValues.apy_12m,
      }

      const newAsset = await assetService.createAsset(createData)
      
      // 绑定选中的项目合约
      if (bind_projects && bind_projects.length > 0) {
        for (const project of bind_projects) {
          try {
            await assetService.bindProjectContracts(newAsset.id, project, undefined, project !== 'common')
          } catch (bindErr) {
            console.error(`Failed to bind project ${project}:`, bindErr)
          }
        }
      }
      
      // 如果有封面图，上传
      if (coverFile.length > 0 && coverFile[0].originFileObj) {
        try {
          await assetService.uploadMedia(
            newAsset.id,
            coverFile[0].originFileObj,
            'cover',
            'Cover Image'
          )
        } catch (e) {
          console.error('Cover upload failed:', e)
        }
      }

      // 上传相册图片
      for (const file of galleryFiles) {
        if (file.originFileObj) {
          try {
            await assetService.uploadMedia(
              newAsset.id,
              file.originFileObj,
              'gallery',
              file.name
            )
          } catch (e) {
            console.error('Gallery upload failed:', e)
          }
        }
      }

      message.success(t('admin.assets.createSuccess', '资产创建成功'))
      handleClose()
      onSuccess()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('admin.assets.createFailed', '创建失败')
      message.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 上传前验证
  const beforeUpload = (file: File, maxSize: number = 5 * 1024 * 1024) => {
    const isValidSize = file.size <= maxSize
    if (!isValidSize) {
      message.error(t('admin.assets.form.fileSizeError', { size: maxSize / 1024 / 1024 }))
    }
    return false // 阻止自动上传
  }

  // 监听选中的项目
  const selectedProjects = Form.useWatch('bind_projects', form) || []

  // 获取选中项目的合约列表
  const selectedContracts = availableProjects
    .filter((p) => selectedProjects.includes(p.project))
    .flatMap((p) => p.contracts.filter((c) => c.is_available))

  return (
    <Modal
      title={null}
      open={open}
      onCancel={handleClose}
      width={800}
      footer={null}
      destroyOnHidden
      className="premium-create-modal"
      centered
      styles={{
        body: { 
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 100px)',
        },
      }}
    >
      {/* 头部 - 固定 */}
      <div className="shrink-0 px-7 pt-6 pb-5 border-b border-white/[0.06] rounded-t-2xl"
        style={{
          background: 'linear-gradient(180deg, rgba(0, 212, 170, 0.08) 0%, transparent 100%)',
        }}
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-web3-success/30"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.2) 0%, rgba(0, 212, 170, 0.05) 100%)',
            }}
          >
            <PlusOutlined className="text-[22px] text-web3-success" />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, color: '#fff' }}>
              {t('admin.assets.createTitle', 'Create New Asset')}
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {t('admin.assets.createSubtitle', '填写资产信息，媒体文件可在创建后管理')}
            </Text>
          </div>
        </div>
      </div>

      {/* 表单内容 - 可滚动区域 */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-7 py-6">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            asset_type: 'real_estate',
            min_subscription: 100,
            current_price: 1,
            apy_3m: 10,
            apy_6m: 12,
            apy_12m: 15,
          }}
        >
          {/* 基本信息 */}
          <FormSection
            icon={<BankOutlined />}
            title={t('admin.assets.section.basicInfo', '基本信息')}
            description={t('admin.assets.section.basicInfoDesc', '资产的基本属性信息')}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="name"
                  label={t('admin.assets.form.name', 'Asset Name')}
                  rules={[{ required: true, message: t('admin.assets.form.nameRequired') }]}
                >
                  <Input placeholder={t('admin.assets.form.namePlaceholder', 'e.g., Manhattan Luxury Apartment')} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="symbol"
                  label={t('admin.assets.form.symbol', 'Token Symbol')}
                  rules={[{ required: true, message: t('admin.assets.form.symbolRequired') }]}
                >
                  <Input placeholder="RWA001" style={{ textTransform: 'uppercase' }} maxLength={10} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="asset_type"
                  label={t('admin.assets.form.type', 'Asset Type')}
                  rules={[{ required: true }]}
                >
                  <Select options={ASSET_TYPE_OPTIONS} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="location" label={t('admin.assets.form.location', 'Location')}>
                  <Input placeholder={t('admin.assets.form.locationPlaceholder', 'e.g., New York, NY')} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="description" label={t('admin.assets.form.description', 'Description')}>
              <TextArea
                rows={3}
                placeholder={t('admin.assets.form.descriptionPlaceholder', '资产描述信息...')}
                showCount
                maxLength={500}
              />
            </Form.Item>
          </FormSection>

          {/* 财务信息 */}
          <FormSection
            icon={<DollarOutlined />}
            title={t('admin.assets.section.financial', '财务信息')}
            description={t('admin.assets.section.financialDesc', '定价与供应量设置')}
          >
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="total_supply"
                  label={t('admin.assets.form.totalSupply', 'Total Supply')}
                  rules={[{ required: true, message: t('admin.assets.form.totalSupplyRequired') }]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    prefix="$"
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value) => Number(value?.replace(/\$\s?|(,*)/g, '') || 0) as 0}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="min_subscription" label={t('admin.assets.form.minSubscription', 'Min. Subscription')}>
                  <InputNumber style={{ width: '100%' }} min={0} prefix="$" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="current_price" label={t('admin.assets.form.currentPrice', 'Current Price')}>
                  <InputNumber style={{ width: '100%' }} min={0} prefix="$" precision={2} />
                </Form.Item>
              </Col>
            </Row>
          </FormSection>

          {/* APY 设置 */}
          <FormSection
            icon={<DollarOutlined />}
            title={t('admin.assets.section.apy', 'APY Settings')}
            description={t('admin.assets.section.apyDesc', '不同锁定期的年化收益率')}
            extra={
              <Tag color="green" style={{ margin: 0 }}>
                {t('admin.assets.required', '必填')}
              </Tag>
            }
          >
            <Row gutter={24}>
              <Col span={8}>
                <Form.Item
                  name="apy_3m"
                  label={
                    <Space>
                      <span>3M APY</span>
                      <Tooltip title={t('admin.assets.form.apy3mTooltip', '3个月锁定期年化收益率')}>
                        <InfoCircleOutlined className="text-white/45" />
                      </Tooltip>
                    </Space>
                  }
                  rules={[{ required: true, message: t('admin.assets.form.apy3mRequired') }]}
                >
                  <InputNumber style={{ width: '100%' }} min={0} max={100} precision={2} suffix="%" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="apy_6m"
                  label={
                    <Space>
                      <span>6M APY</span>
                      <Tooltip title={t('admin.assets.form.apy6mTooltip', '6个月锁定期年化收益率')}>
                        <InfoCircleOutlined className="text-white/45" />
                      </Tooltip>
                    </Space>
                  }
                  rules={[{ required: true, message: t('admin.assets.form.apy6mRequired') }]}
                >
                  <InputNumber style={{ width: '100%' }} min={0} max={100} precision={2} suffix="%" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="apy_12m"
                  label={
                    <Space>
                      <span>12M APY</span>
                      <Tooltip title={t('admin.assets.form.apy12mTooltip', '12个月锁定期年化收益率')}>
                        <InfoCircleOutlined className="text-white/45" />
                      </Tooltip>
                    </Space>
                  }
                  rules={[{ required: true, message: t('admin.assets.form.apy12mRequired') }]}
                >
                  <InputNumber style={{ width: '100%' }} min={0} max={100} precision={2} suffix="%" />
                </Form.Item>
              </Col>
            </Row>
          </FormSection>

          {/* 媒体上传 */}
          <MediaUploadSection
            coverFile={coverFile}
            galleryFiles={galleryFiles}
            onCoverChange={setCoverFile}
            onGalleryChange={setGalleryFiles}
            beforeUpload={beforeUpload}
          />

          {/* 项目绑定 */}
          <ProjectBindingSection
            availableProjects={availableProjects}
            isLoadingProjects={isLoadingProjects}
            selectedProjects={selectedProjects}
            selectedContracts={selectedContracts}
          />
        </Form>
      </div>

      {/* 底部按钮 - 固定 */}
      <div className="shrink-0 px-7 py-4 border-t border-white/[0.06] flex justify-end gap-3">
        <Button onClick={handleClose}>{t('common.cancel', 'Cancel')}</Button>
        <Button type="primary" onClick={() => form.submit()} loading={isSubmitting}>
          {t('admin.assets.createButton', 'Create Asset')}
        </Button>
      </div>
    </Modal>
  )
}
