/**
 * MediaUploadSection Component
 * 媒体上传区域 - 封面图和相册上传
 * Migrated from Ant Design to shadcn/ui
 */
'use client'

import React, { useRef } from 'react'
import { Plus, Image as ImageIcon, X, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { FormSection } from './FormSection'
import type { MediaUploadSectionProps, UploadFileItem } from './types'
import { cn } from '@/lib/utils'

export const MediaUploadSection = React.memo(function MediaUploadSection({
  coverFile,
  galleryFiles,
  onCoverChange,
  onGalleryChange,
  beforeUpload,
}: MediaUploadSectionProps) {
  const { t } = useTranslation()
  const coverInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  // Handle cover file selection
  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]
      if (beforeUpload(file)) {
        return
      }
      const newFile: UploadFileItem = {
        uid: `cover-${Date.now()}`,
        name: file.name,
        status: 'done',
        originFileObj: file,
        preview: URL.createObjectURL(file),
      }
      onCoverChange([newFile])
    }
    // Reset input
    if (coverInputRef.current) {
      coverInputRef.current.value = ''
    }
  }

  // Handle gallery file selection
  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const newFiles: UploadFileItem[] = []
      const remainingSlots = 10 - galleryFiles.length
      const filesToAdd = Math.min(files.length, remainingSlots)
      
      for (let i = 0; i < filesToAdd; i++) {
        const file = files[i]
        if (beforeUpload(file)) {
          continue
        }
        newFiles.push({
          uid: `gallery-${Date.now()}-${i}`,
          name: file.name,
          status: 'done',
          originFileObj: file,
          preview: URL.createObjectURL(file),
        })
      }
      onGalleryChange([...galleryFiles, ...newFiles])
    }
    // Reset input
    if (galleryInputRef.current) {
      galleryInputRef.current.value = ''
    }
  }

  // Remove cover file
  const handleRemoveCover = () => {
    if (coverFile[0]?.preview) {
      URL.revokeObjectURL(coverFile[0].preview)
    }
    onCoverChange([])
  }

  // Remove gallery file
  const handleRemoveGallery = (uid: string) => {
    const file = galleryFiles.find(f => f.uid === uid)
    if (file?.preview) {
      URL.revokeObjectURL(file.preview)
    }
    onGalleryChange(galleryFiles.filter(f => f.uid !== uid))
  }

  return (
    <FormSection
      icon={<ImageIcon className="w-5 h-5" />}
      title={t('admin.assets.section.media', '媒体文件')}
      description={t('admin.assets.section.mediaDesc', '可选，更多文件可在创建后管理')}
      extra={
        <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">
          {t('admin.assets.optional', '可选')}
        </span>
      }
    >
      <div className="grid grid-cols-2 gap-6">
        {/* 封面图 */}
        <div>
          <div className="mb-2">
            <span className="text-[13px] font-semibold text-white">
              {t('admin.assets.form.coverImage', '封面图')}
            </span>
            <span className="text-xs text-muted-foreground ml-2">
              {t('admin.assets.form.coverImageCount', '(1 张)')}
            </span>
          </div>
          
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverSelect}
            className="hidden"
          />
          
          {coverFile.length === 0 ? (
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className={cn(
                "w-[104px] h-[104px] border-2 border-dashed border-white/20 rounded-lg",
                "flex flex-col items-center justify-center gap-2",
                "bg-white/[0.02] hover:bg-white/[0.05] hover:border-primary/50",
                "transition-all duration-200 cursor-pointer"
              )}
            >
              <Plus className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {t('admin.assets.form.uploadCover', '上传封面')}
              </span>
            </button>
          ) : (
            <div className="relative w-[104px] h-[104px] rounded-lg overflow-hidden group">
              <img
                src={coverFile[0].preview || coverFile[0].url}
                alt={coverFile[0].name}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveCover}
                className={cn(
                  "absolute top-1 right-1 w-6 h-6 rounded-full",
                  "bg-black/60 hover:bg-destructive",
                  "flex items-center justify-center",
                  "opacity-0 group-hover:opacity-100 transition-opacity"
                )}
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          )}
        </div>

        {/* 相册 */}
        <div>
          <div className="mb-2">
            <span className="text-[13px] font-semibold text-white">
              {t('admin.assets.form.gallery', '相册')}
            </span>
            <span className="text-xs text-muted-foreground ml-2">
              {t('admin.assets.form.galleryCount', '(最多 10 张)')}
            </span>
          </div>
          
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleGallerySelect}
            className="hidden"
          />
          
          <div className="flex flex-wrap gap-2">
            {galleryFiles.map((file) => (
              <div
                key={file.uid}
                className="relative w-[104px] h-[104px] rounded-lg overflow-hidden group"
              >
                <img
                  src={file.preview || file.url}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveGallery(file.uid)}
                  className={cn(
                    "absolute top-1 right-1 w-6 h-6 rounded-full",
                    "bg-black/60 hover:bg-destructive",
                    "flex items-center justify-center",
                    "opacity-0 group-hover:opacity-100 transition-opacity"
                  )}
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            
            {galleryFiles.length < 10 && (
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className={cn(
                  "w-[104px] h-[104px] border-2 border-dashed border-white/20 rounded-lg",
                  "flex flex-col items-center justify-center gap-2",
                  "bg-white/[0.02] hover:bg-white/[0.05] hover:border-primary/50",
                  "transition-all duration-200 cursor-pointer"
                )}
              >
                <Plus className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {t('admin.assets.form.addImages', '添加图片')}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info alert */}
      <div className="mt-4 flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-300">
          {t('admin.assets.mediaNote', '估值报告、法律文件等可在创建后通过媒体管理功能上传')}
        </p>
      </div>
    </FormSection>
  )
})
