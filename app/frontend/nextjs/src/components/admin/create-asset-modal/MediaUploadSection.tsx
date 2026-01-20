/**
 * MediaUploadSection Component
 * 媒体上传区域 - 封面图和相册上传
 */
'use client'

import React from 'react'
import { Row, Col, Upload, Alert, Typography } from 'antd'
import { PlusOutlined, PictureOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { FormSection } from './FormSection'
import type { MediaUploadSectionProps } from './types'

const { Text } = Typography

export const MediaUploadSection = React.memo(function MediaUploadSection({
  coverFile,
  galleryFiles,
  onCoverChange,
  onGalleryChange,
  beforeUpload,
}: MediaUploadSectionProps) {
  const { t } = useTranslation()

  return (
    <FormSection
      icon={<PictureOutlined />}
      title={t('admin.assets.section.media', '媒体文件')}
      description={t('admin.assets.section.mediaDesc', '可选，更多文件可在创建后管理')}
      extra={
        <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">
          {t('admin.assets.optional', '可选')}
        </span>
      }
    >
      <Row gutter={24}>
        {/* 封面图 */}
        <Col span={12}>
          <div className="mb-2">
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
            onChange={({ fileList }) => onCoverChange(fileList.slice(-1))}
            beforeUpload={(file) => beforeUpload(file)}
            accept="image/*"
            maxCount={1}
          >
            {coverFile.length === 0 && (
              <div>
                <PlusOutlined />
                <div className="mt-2 text-xs">{t('admin.assets.form.uploadCover', '上传封面')}</div>
              </div>
            )}
          </Upload>
        </Col>

        {/* 相册 */}
        <Col span={12}>
          <div className="mb-2">
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
            onChange={({ fileList }) => onGalleryChange(fileList.slice(0, 10))}
            beforeUpload={(file) => beforeUpload(file)}
            accept="image/*"
            multiple
            maxCount={10}
          >
            {galleryFiles.length < 10 && (
              <div>
                <PlusOutlined />
                <div className="mt-2 text-xs">{t('admin.assets.form.addImages', '添加图片')}</div>
              </div>
            )}
          </Upload>
        </Col>
      </Row>

      <Alert
        message={t('admin.assets.mediaNote', '估值报告、法律文件等可在创建后通过媒体管理功能上传')}
        type="info"
        showIcon
        className="mt-4"
      />
    </FormSection>
  )
})
