/**
 * 媒体管理组件
 * 
 * 用于管理资产的媒体文件（图片、文档等）
 * 支持：上传、删除、排序、设置主图
 */
'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  Modal,
  Tabs,
  Upload,
  Button,
  Card,
  Image,
  Space,
  Typography,
  Popconfirm,
  message,
  Spin,
  Badge,
  Empty,
} from 'antd'
import {
  InboxOutlined,
  DeleteOutlined,
  StarOutlined,
  StarFilled,
  FileTextOutlined,
  PictureOutlined,
} from '@ant-design/icons'
import type { UploadFile, UploadProps } from 'antd'
import { assetService, type AssetMediaItem, type MediaType, type MediaStats } from '@/services/asset'

const { Dragger } = Upload
const { Text, Title } = Typography

// 媒体类型配置
const MEDIA_TYPE_CONFIG: Record<
  string,
  { label: string; accept: string; maxSize: number; maxCount: number; required?: boolean }
> = {
  cover: {
    label: '封面图',
    accept: 'image/*',
    maxSize: 5 * 1024 * 1024, // 5MB
    maxCount: 1,
  },
  gallery: {
    label: '相册',
    accept: 'image/*',
    maxSize: 5 * 1024 * 1024,
    maxCount: 20,
  },
  valuation: {
    label: '估值报告',
    accept: '.pdf,.doc,.docx',
    maxSize: 10 * 1024 * 1024, // 10MB
    maxCount: 5,
    required: true,
  },
  legal: {
    label: '法律文件',
    accept: '.pdf,.doc,.docx',
    maxSize: 10 * 1024 * 1024,
    maxCount: 10,
    required: true,
  },
  financial: {
    label: '财务文件',
    accept: '.pdf,.doc,.docx,.xls,.xlsx',
    maxSize: 10 * 1024 * 1024,
    maxCount: 10,
  },
}

interface MediaManagerProps {
  assetId: number
  visible: boolean
  onClose: () => void
  onUpdate?: () => void
}

/**
 * 媒体管理器组件
 */
export function MediaManager({ assetId, visible, onClose, onUpdate }: MediaManagerProps) {
  const [activeTab, setActiveTab] = useState<MediaType>('cover')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [mediaList, setMediaList] = useState<AssetMediaItem[]>([])
  const [stats, setStats] = useState<MediaStats | null>(null)

  // 加载媒体列表
  const loadMedia = useCallback(async () => {
    if (!assetId) return
    setLoading(true)
    try {
      const [media, statsData] = await Promise.all([
        assetService.getAssetMediaAdmin(assetId),
        assetService.getMediaStats(assetId),
      ])
      setMediaList(media)
      setStats(statsData)
    } catch (error) {
      message.error('加载媒体列表失败')
    } finally {
      setLoading(false)
    }
  }, [assetId])

  useEffect(() => {
    if (visible) {
      loadMedia()
    }
  }, [visible, loadMedia])

  // 过滤当前类型的媒体
  const currentMedia = mediaList.filter((m) => m.media_type === activeTab)

  // 上传处理
  const handleUpload = async (file: File) => {
    const config = MEDIA_TYPE_CONFIG[activeTab]
    if (!config) return false

    // 验证文件大小
    if (file.size > config.maxSize) {
      message.error(`文件大小超过限制 (${config.maxSize / 1024 / 1024}MB)`)
      return false
    }

    setUploading(true)
    try {
      await assetService.uploadMedia(assetId, file, activeTab, file.name)
      message.success('上传成功')
      loadMedia()
      onUpdate?.()
    } catch (error) {
      message.error('上传失败')
    } finally {
      setUploading(false)
    }
    return false
  }

  // 删除媒体
  const handleDelete = async (mediaId: number) => {
    try {
      await assetService.deleteMedia(assetId, mediaId)
      message.success('删除成功')
      loadMedia()
      onUpdate?.()
    } catch (error) {
      message.error('删除失败')
    }
  }

  // 设置主图
  const handleSetPrimary = async (mediaId: number) => {
    try {
      await assetService.updateMedia(assetId, mediaId, { is_primary: true })
      message.success('已设为主图')
      loadMedia()
      onUpdate?.()
    } catch (error) {
      message.error('设置失败')
    }
  }

  // 上传组件配置
  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: MEDIA_TYPE_CONFIG[activeTab]?.accept,
    beforeUpload: handleUpload,
    showUploadList: false,
    disabled: uploading,
  }

  // 渲染图片卡片
  const renderImageCard = (media: AssetMediaItem) => (
    <Card
      key={media.id}
      hoverable
      style={{ width: 200 }}
      cover={
        <div style={{ position: 'relative', height: 150, overflow: 'hidden' }}>
          <Image
            src={media.url}
            alt={media.title || '媒体'}
            style={{ objectFit: 'cover', width: '100%', height: '100%' }}
            preview
          />
          {media.is_primary && (
            <Badge
              count={<StarFilled style={{ color: '#faad14' }} />}
              style={{ position: 'absolute', top: 8, right: 8 }}
            />
          )}
        </div>
      }
      actions={[
        !media.is_primary && activeTab === 'gallery' ? (
          <StarOutlined key="star" onClick={() => handleSetPrimary(media.id)} />
        ) : null,
        <Popconfirm
          key="delete"
          title="确定删除此媒体文件？"
          onConfirm={() => handleDelete(media.id)}
        >
          <DeleteOutlined />
        </Popconfirm>,
      ].filter(Boolean)}
    >
      <Card.Meta
        title={media.title || '未命名'}
        description={<Text type="secondary">{media.file_name}</Text>}
      />
    </Card>
  )

  // 渲染文档卡片
  const renderDocumentCard = (media: AssetMediaItem) => (
    <Card
      key={media.id}
      style={{ marginBottom: 8 }}
      actions={[
        <a key="download" href={media.url} target="_blank" rel="noopener noreferrer">
          下载
        </a>,
        <Popconfirm
          key="delete"
          title="确定删除此文件？"
          onConfirm={() => handleDelete(media.id)}
        >
          <Button type="link" danger>
            删除
          </Button>
        </Popconfirm>,
      ]}
    >
      <Card.Meta
        avatar={<FileTextOutlined style={{ fontSize: 32, color: '#1890ff' }} />}
        title={media.title || media.file_name}
        description={media.description}
      />
    </Card>
  )

  // 渲染标签页内容
  const renderTabContent = () => {
    const config = MEDIA_TYPE_CONFIG[activeTab]
    const isImageType = activeTab === 'cover' || activeTab === 'gallery'

    return (
      <div>
        {/* 上传区域 */}
        <Dragger {...uploadProps} style={{ marginBottom: 16 }}>
          <p className="ant-upload-drag-icon">
            {isImageType ? <PictureOutlined /> : <InboxOutlined />}
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持: {config?.accept} | 最大: {(config?.maxSize || 0) / 1024 / 1024}MB
          </p>
        </Dragger>

        {/* 媒体列表 */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin />
          </div>
        ) : currentMedia.length === 0 ? (
          <Empty description="暂无媒体文件" />
        ) : isImageType ? (
          <Space wrap style={{ marginTop: 16 }}>
            {currentMedia.map(renderImageCard)}
          </Space>
        ) : (
          <div style={{ marginTop: 16 }}>
            {currentMedia.map(renderDocumentCard)}
          </div>
        )}
      </div>
    )
  }

  // 生成标签页配置
  const tabItems = Object.entries(MEDIA_TYPE_CONFIG).map(([key, config]) => ({
    key,
    label: (
      <span>
        {config.label}
        {config.required && <span style={{ color: '#ff4d4f', marginLeft: 4 }}>*</span>}
        {stats?.by_type?.[key as MediaType] ? (
          <Badge
            count={stats.by_type[key as MediaType]}
            style={{ marginLeft: 8 }}
            size="small"
          />
        ) : null}
      </span>
    ),
    children: renderTabContent(),
  }))

  return (
    <Modal
      title="媒体管理"
      open={visible}
      onCancel={onClose}
      width={900}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
      ]}
    >
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as MediaType)}
        items={tabItems}
      />
    </Modal>
  )
}

export default MediaManager
