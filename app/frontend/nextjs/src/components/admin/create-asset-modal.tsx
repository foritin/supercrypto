/**
 * CreateAssetModal - Premium 风格的创建资产弹窗
 * 
 * 功能:
 * - 分组布局 (基本信息 / APY 设置 / 媒体上传 / 项目绑定)
 * - 支持媒体文件上传 (封面图、相册、估值报告、法律文件等)
 * - 实时预览将要绑定的合约
 * - 符合 Premium UI 设计风格
 */
'use client'

import { useState, useEffect } from 'react'
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Upload,
  Button,
  Space,
  Typography,
  Tag,
  Tooltip,
  Alert,
  Divider,
  Row,
  Col,
  message,
  Image,
} from 'antd'
import {
  PlusOutlined,
  InboxOutlined,
  InfoCircleOutlined,
  FileTextOutlined,
  PictureOutlined,
  DollarOutlined,
  BankOutlined,
  LinkOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import type { UploadFile, UploadProps } from 'antd'
import {
  assetService,
  type AssetCreateRequest,
  type AssetType,
  type ProjectContractInfo,
  ASSET_TYPE_NAMES,
} from '@/services/asset'

const { Text, Title } = Typography
const { TextArea } = Input
const { Dragger } = Upload

// 资产类型选项
const ASSET_TYPE_OPTIONS: { value: AssetType; label: string }[] = [
  { value: 'real_estate', label: ASSET_TYPE_NAMES.real_estate },
  { value: 'bond', label: ASSET_TYPE_NAMES.bond },
  { value: 'commodity', label: ASSET_TYPE_NAMES.commodity },
  { value: 'equity', label: ASSET_TYPE_NAMES.equity },
  { value: 'other', label: ASSET_TYPE_NAMES.other },
]

// 媒体类型配置
const MEDIA_CATEGORIES = {
  cover: { label: '封面图', accept: 'image/*', maxCount: 1, required: false },
  gallery: { label: '相册', accept: 'image/*', maxCount: 10, required: false },
  valuation: { label: '估值报告', accept: '.pdf,.doc,.docx', maxCount: 5, required: true },
  legal: { label: '法律文件', accept: '.pdf,.doc,.docx', maxCount: 10, required: true },
} as const

interface CreateAssetModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  availableProjects: ProjectContractInfo[]
  isLoadingProjects: boolean
}

// Section 组件 - 用于分组表单项
function FormSection({
  icon,
  title,
  description,
  children,
  extra,
}: {
  icon: React.ReactNode
  title: string
  description?: string
  children: React.ReactNode
  extra?: React.ReactNode
}) {
  return (
    <div
      style={{
        marginBottom: 24,
        padding: 20,
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: 'var(--color-primary)', fontSize: 18 }}>{icon}</span>
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
}

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
  const handleSubmit = async (values: any) => {
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
    } catch (error: any) {
      message.error(error?.message || t('admin.assets.createFailed', '创建失败'))
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
      <div
        style={{
          flexShrink: 0,
          padding: '24px 28px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          background: 'linear-gradient(180deg, rgba(0, 212, 170, 0.08) 0%, transparent 100%)',
          borderRadius: '16px 16px 0 0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.2) 0%, rgba(0, 212, 170, 0.05) 100%)',
              border: '1px solid rgba(0, 212, 170, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PlusOutlined style={{ fontSize: 22, color: 'var(--color-primary)' }} />
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
      <div 
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          overscrollBehavior: 'contain',
          padding: '24px 28px',
        }}
      >
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
                    parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as any}
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
                        <InfoCircleOutlined style={{ color: 'rgba(255,255,255,0.45)' }} />
                      </Tooltip>
                    </Space>
                  }
                  rules={[{ required: true, message: t('admin.assets.form.apy3mRequired') }]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    max={100}
                    precision={2}
                    suffix="%"
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="apy_6m"
                  label={
                    <Space>
                      <span>6M APY</span>
                      <Tooltip title={t('admin.assets.form.apy6mTooltip', '6个月锁定期年化收益率')}>
                        <InfoCircleOutlined style={{ color: 'rgba(255,255,255,0.45)' }} />
                      </Tooltip>
                    </Space>
                  }
                  rules={[{ required: true, message: t('admin.assets.form.apy6mRequired') }]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    max={100}
                    precision={2}
                    suffix="%"
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="apy_12m"
                  label={
                    <Space>
                      <span>12M APY</span>
                      <Tooltip title={t('admin.assets.form.apy12mTooltip', '12个月锁定期年化收益率')}>
                        <InfoCircleOutlined style={{ color: 'rgba(255,255,255,0.45)' }} />
                      </Tooltip>
                    </Space>
                  }
                  rules={[{ required: true, message: t('admin.assets.form.apy12mRequired') }]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    max={100}
                    precision={2}
                    suffix="%"
                  />
                </Form.Item>
              </Col>
            </Row>
          </FormSection>

          {/* 媒体上传 */}
          <FormSection
            icon={<PictureOutlined />}
            title={t('admin.assets.section.media', '媒体文件')}
            description={t('admin.assets.section.mediaDesc', '可选，更多文件可在创建后管理')}
            extra={
              <Tag color="blue" style={{ margin: 0 }}>
                {t('admin.assets.optional', '可选')}
              </Tag>
            }
          >
            <Row gutter={24}>
              {/* 封面图 */}
              <Col span={12}>
                <div style={{ marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 13 }}>
                    {t('admin.assets.form.coverImage', '封面图')}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                    {t('admin.assets.form.coverImageCount', '(1 张)')}
                  </Text>
                </div>
                <Upload
                  listType="picture-card"
                  fileList={coverFile}
                  onChange={({ fileList }) => setCoverFile(fileList.slice(-1))}
                  beforeUpload={(file) => beforeUpload(file)}
                  accept="image/*"
                  maxCount={1}
                >
                  {coverFile.length === 0 && (
                    <div>
                      <PlusOutlined />
                      <div style={{ marginTop: 8, fontSize: 12 }}>{t('admin.assets.form.uploadCover', '上传封面')}</div>
                    </div>
                  )}
                </Upload>
              </Col>

              {/* 相册 */}
              <Col span={12}>
                <div style={{ marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 13 }}>
                    {t('admin.assets.form.gallery', '相册')}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                    {t('admin.assets.form.galleryCount', '(最多 10 张)')}
                  </Text>
                </div>
                <Upload
                  listType="picture-card"
                  fileList={galleryFiles}
                  onChange={({ fileList }) => setGalleryFiles(fileList.slice(0, 10))}
                  beforeUpload={(file) => beforeUpload(file)}
                  accept="image/*"
                  multiple
                  maxCount={10}
                >
                  {galleryFiles.length < 10 && (
                    <div>
                      <PlusOutlined />
                      <div style={{ marginTop: 8, fontSize: 12 }}>{t('admin.assets.form.addImages', '添加图片')}</div>
                    </div>
                  )}
                </Upload>
              </Col>
            </Row>

            <Alert
              message={t('admin.assets.mediaNote', '估值报告、法律文件等可在创建后通过媒体管理功能上传')}
              type="info"
              showIcon
              style={{ marginTop: 16 }}
            />
          </FormSection>

          {/* 项目绑定 */}
          <FormSection
            icon={<LinkOutlined />}
            title={t('admin.assets.section.binding', '项目合约绑定')}
            description={t('admin.assets.section.bindingDesc', '选择要绑定的智能合约项目')}
            extra={
              <Tag color="orange" style={{ margin: 0 }}>
                {t('admin.assets.recommended', '推荐')}
              </Tag>
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
              <div
                style={{
                  padding: 16,
                  background: 'rgba(0, 212, 170, 0.05)',
                  border: '1px solid rgba(0, 212, 170, 0.15)',
                  borderRadius: 8,
                }}
              >
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
        </Form>
      </div>

      {/* 底部按钮 - 固定 */}
      <div
        style={{
          flexShrink: 0,
          padding: '16px 28px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12,
        }}
      >
        <Button onClick={handleClose}>{t('common.cancel', 'Cancel')}</Button>
        <Button type="primary" onClick={() => form.submit()} loading={isSubmitting}>
          {t('admin.assets.createButton', 'Create Asset')}
        </Button>
      </div>
    </Modal>
  )
}
