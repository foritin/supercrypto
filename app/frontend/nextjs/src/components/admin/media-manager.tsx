/**
 * 媒体管理组件
 * 
 * 用于管理资产的媒体文件（图片、文档等）
 * 支持：上传、删除、批量删除、排序、设置主图
 * 
 * Migrated from Ant Design to shadcn/ui
 * @validates Requirements 8.6
 */
'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  Trash2, 
  Star, 
  FileText, 
  Image as ImageIcon, 
  Upload,
  Download,
  Loader2,
  X,
  CheckSquare,
  Square,
  XCircle
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { notification } from '@/lib/notification'
import { assetService, type AssetMediaItem, type MediaType, type MediaStats, type FrameStyle } from '@/services/asset'
import { AssetLogoFrame, FRAME_STYLE_OPTIONS, FRAME_STYLE_THEMES } from '@/components/asset'

// 媒体类型配置
const MEDIA_TYPE_CONFIG: Record<
  string,
  { labelKey: string; accept: string; maxSize: number; maxCount: number; required?: boolean }
> = {
  cover: {
    labelKey: 'admin.media.types.cover',
    accept: 'image/*',
    maxSize: 5 * 1024 * 1024, // 5MB
    maxCount: 1,
  },
  gallery: {
    labelKey: 'admin.media.types.gallery',
    accept: 'image/*',
    maxSize: 5 * 1024 * 1024,
    maxCount: 20,
  },
  valuation: {
    labelKey: 'admin.media.types.valuation',
    accept: '.pdf,.doc,.docx',
    maxSize: 10 * 1024 * 1024, // 10MB
    maxCount: 5,
    required: true,
  },
  legal: {
    labelKey: 'admin.media.types.legal',
    accept: '.pdf,.doc,.docx',
    maxSize: 10 * 1024 * 1024,
    maxCount: 10,
    required: true,
  },
  financial: {
    labelKey: 'admin.media.types.financial',
    accept: '.pdf,.doc,.docx,.xls,.xlsx',
    maxSize: 10 * 1024 * 1024,
    maxCount: 10,
  },
  logo: {
    labelKey: 'admin.media.types.logo',
    accept: 'image/png,image/jpeg,image/svg+xml,image/webp',
    maxSize: 2 * 1024 * 1024, // 2MB
    maxCount: 1,
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
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<MediaType>('cover')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [mediaList, setMediaList] = useState<AssetMediaItem[]>([])
  const [stats, setStats] = useState<MediaStats | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // 批量选择状态
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  
  // Logo 边框样式状态
  const [frameStyle, setFrameStyle] = useState<FrameStyle | null>(null)
  const [savingFrameStyle, setSavingFrameStyle] = useState(false)

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
      notification.error(t('admin.media.messages.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [assetId, t])

  // 加载资产的 frame_style
  const loadFrameStyle = useCallback(async () => {
    if (!assetId) return
    try {
      const asset = await assetService.getAssetAdmin(assetId)
      setFrameStyle(asset.frame_style ?? null)
    } catch {
      // 静默失败，不影响媒体管理
    }
  }, [assetId])

  useEffect(() => {
    if (visible) {
      loadMedia()
      loadFrameStyle()
    } else {
      // 关闭时重置选择状态
      setSelectionMode(false)
      setSelectedIds(new Set())
    }
  }, [visible, loadMedia, loadFrameStyle])

  // 切换标签页时清除选择
  useEffect(() => {
    setSelectedIds(new Set())
  }, [activeTab])

  // 批量上传处理
  const handleUploadFiles = async (files: File[]) => {
    const config = MEDIA_TYPE_CONFIG[activeTab]
    if (!config || files.length === 0) return

    // 检查数量限制
    const currentCount = mediaList.filter((m) => m.media_type === activeTab).length
    const remainingSlots = config.maxCount - currentCount
    
    if (remainingSlots <= 0) {
      notification.error(t('admin.media.messages.maxCountReached', { count: config.maxCount }))
      return
    }

    // 限制上传数量
    const filesToUpload = files.slice(0, remainingSlots)
    
    // 预先验证文件大小
    const validFiles: File[] = []
    for (const file of filesToUpload) {
      if (file.size > config.maxSize) {
        notification.error(t('admin.media.messages.fileSizeExceeded', { 
          name: file.name,
          size: config.maxSize / 1024 / 1024 
        }))
      } else {
        validFiles.push(file)
      }
    }

    if (validFiles.length === 0) return

    setUploading(true)

    try {
      // 使用统一的批量上传接口
      const result = await assetService.uploadMedia(assetId, validFiles, activeTab)
      
      if (result.success_count > 0) {
        notification.success(t('admin.media.messages.uploadBatchSuccess', { count: result.success_count }))
        loadMedia()
        onUpdate?.()
      }
      if (result.failed_count > 0) {
        notification.error(t('admin.media.messages.uploadBatchFailed', { count: result.failed_count }))
      }
    } catch (error) {
      notification.error(t('admin.media.messages.uploadFailed'))
    } finally {
      setUploading(false)
    }
  }

  // 删除单个媒体
  const handleDelete = async (mediaId: number) => {
    try {
      const result = await assetService.deleteMedia(assetId, mediaId)
      if (result.success_count > 0) {
        notification.success(t('admin.media.messages.deleteSuccess'))
        loadMedia()
        onUpdate?.()
      } else {
        const error = result.results[0]?.error || 'Unknown error'
        notification.error(t('admin.media.messages.deleteFailed') + ': ' + error)
      }
    } catch (error) {
      notification.error(t('admin.media.messages.deleteFailed'))
    }
  }

  // 批量删除媒体
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return

    setDeleting(true)
    try {
      const result = await assetService.deleteMedia(assetId, Array.from(selectedIds))
      if (result.success_count > 0) {
        notification.success(t('admin.media.messages.deleteBatchSuccess', { count: result.success_count }))
        setSelectedIds(new Set())
        setSelectionMode(false)
        loadMedia()
        onUpdate?.()
      }
      if (result.failed_count > 0) {
        notification.error(t('admin.media.messages.deleteBatchFailed', { count: result.failed_count }))
      }
    } catch (error) {
      notification.error(t('admin.media.messages.deleteFailed'))
    } finally {
      setDeleting(false)
    }
  }

  // 切换选择项
  const toggleSelection = (mediaId: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(mediaId)) {
        newSet.delete(mediaId)
      } else {
        newSet.add(mediaId)
      }
      return newSet
    })
  }

  // 全选当前标签页
  const selectAll = () => {
    const tabMedia = mediaList.filter((m) => m.media_type === activeTab)
    setSelectedIds(new Set(tabMedia.map(m => m.id)))
  }

  // 取消全选
  const deselectAll = () => {
    setSelectedIds(new Set())
  }

  // 设置主图
  const handleSetPrimary = async (mediaId: number) => {
    try {
      await assetService.updateMedia(assetId, mediaId, { is_primary: true })
      notification.success(t('admin.media.messages.setPrimarySuccess'))
      loadMedia()
      onUpdate?.()
    } catch (error) {
      notification.error(t('admin.media.messages.setPrimaryFailed'))
    }
  }

  // 保存 Logo 边框样式
  const handleFrameStyleChange = async (style: FrameStyle) => {
    const newStyle = frameStyle === style ? null : style
    setFrameStyle(newStyle)
    setSavingFrameStyle(true)
    try {
      await assetService.updateAsset(assetId, { frame_style: newStyle ?? undefined })
      notification.success(t('admin.assets.form.frameStyle.saved'))
      onUpdate?.()
    } catch {
      // 回滚
      setFrameStyle(frameStyle)
      notification.error(t('admin.assets.form.frameStyle.saveFailed'))
    } finally {
      setSavingFrameStyle(false)
    }
  }

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleUploadFiles(Array.from(files))
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 处理拖拽
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleUploadFiles(Array.from(files))
    }
  }

  // 渲染图片卡片
  const renderImageCard = (media: AssetMediaItem) => {
    const isSelected = selectedIds.has(media.id)
    
    return (
      <Card 
        key={media.id} 
        className={cn(
          "w-[200px] overflow-hidden group relative",
          selectionMode && "cursor-pointer",
          isSelected && "ring-2 ring-primary"
        )}
        onClick={selectionMode ? () => toggleSelection(media.id) : undefined}
      >
        {/* 选择复选框 */}
        {selectionMode && (
          <div className="absolute top-2 left-2 z-10">
            <Checkbox 
              checked={isSelected}
              onCheckedChange={() => toggleSelection(media.id)}
              className="bg-black/50 border-white/50 data-[state=checked]:bg-primary"
            />
          </div>
        )}
        
        <div className="relative h-[150px] overflow-hidden">
          <img
            src={media.url}
            alt={media.title || t('admin.media.status.unnamed')}
            className={cn(
              "object-cover w-full h-full transition-transform group-hover:scale-105",
              !selectionMode && "cursor-pointer"
            )}
            onClick={!selectionMode ? () => setPreviewImage(media.url) : undefined}
          />
          {media.is_primary && (
            <Badge 
              className="absolute top-2 right-2 bg-yellow-500/90 text-yellow-950"
            >
              <Star className="w-3 h-3 mr-1 fill-current" />
              {t('admin.media.status.primary')}
            </Badge>
          )}
        </div>
        <CardContent className="p-3">
          <p className="font-medium text-sm truncate">{media.title || t('admin.media.status.unnamed')}</p>
          <p className="text-xs text-muted-foreground truncate">{media.file_name}</p>
        </CardContent>
        {!selectionMode && (
          <CardFooter className="p-3 pt-0 flex justify-end gap-2">
            {!media.is_primary && activeTab === 'gallery' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleSetPrimary(media.id)}
                title={t('admin.media.actions.setPrimary')}
              >
                <Star className="h-4 w-4" />
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  title={t('admin.media.actions.delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('admin.media.confirm.deleteTitle')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('admin.media.confirm.deleteDescription')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('admin.media.confirm.cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDelete(media.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {t('admin.media.confirm.delete')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        )}
      </Card>
    )
  }

  // 渲染文档卡片
  const renderDocumentCard = (media: AssetMediaItem) => {
    const isSelected = selectedIds.has(media.id)
    
    return (
      <Card 
        key={media.id} 
        className={cn(
          "mb-2",
          selectionMode && "cursor-pointer",
          isSelected && "ring-2 ring-primary"
        )}
        onClick={selectionMode ? () => toggleSelection(media.id) : undefined}
      >
        <CardContent className="p-4 flex items-center gap-4">
          {/* 选择复选框 */}
          {selectionMode && (
            <Checkbox 
              checked={isSelected}
              onCheckedChange={() => toggleSelection(media.id)}
              className="data-[state=checked]:bg-primary"
            />
          )}
          
          <div className="flex-shrink-0">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{media.title || media.file_name}</p>
            {media.description && (
              <p className="text-sm text-muted-foreground truncate">{media.description}</p>
            )}
          </div>
          {!selectionMode && (
            <div className="flex items-center gap-2">
              {media.url && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                >
                  <a href={media.url} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-1" />
                    {t('admin.media.actions.download')}
                  </a>
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {t('admin.media.actions.delete')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('admin.media.confirm.deleteTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('admin.media.confirm.deleteDescription')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('admin.media.confirm.cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(media.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {t('admin.media.confirm.delete')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // 渲染上传区域
  const renderUploadArea = () => {
    const config = MEDIA_TYPE_CONFIG[activeTab]
    const isImageType = activeTab === 'cover' || activeTab === 'gallery' || activeTab === 'logo'
    const currentCount = mediaList.filter((m) => m.media_type === activeTab).length
    const canUploadMore = currentCount < (config?.maxCount || 1)
    const allowMultiple = (config?.maxCount || 1) > 1

    return (
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer mb-4",
          isDragging 
            ? "border-primary bg-primary/5" 
            : "border-white/20 hover:border-primary/50 hover:bg-white/5",
          (uploading || !canUploadMore) && "pointer-events-none opacity-50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => canUploadMore && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={config?.accept}
          multiple={allowMultiple}
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading || !canUploadMore}
        />
        <div className="flex flex-col items-center gap-2">
          {uploading ? (
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
          ) : isImageType ? (
            <ImageIcon className="h-10 w-10 text-muted-foreground" />
          ) : (
            <Upload className="h-10 w-10 text-muted-foreground" />
          )}
          <p className="text-sm text-muted-foreground">
            {uploading 
              ? t('admin.media.upload.uploading') 
              : !canUploadMore 
                ? t('admin.media.messages.maxCountReached', { count: config?.maxCount })
                : allowMultiple
                  ? t('admin.media.upload.dragOrClickMultiple')
                  : t('admin.media.upload.dragOrClick')
            }
          </p>
          <p className="text-xs text-muted-foreground">
            {t('admin.media.upload.support', { accept: config?.accept, size: (config?.maxSize || 0) / 1024 / 1024 })}
            {allowMultiple && ` · ${t('admin.media.upload.remaining', { count: (config?.maxCount || 0) - currentCount })}`}
          </p>
        </div>
      </div>
    )
  }

  // 渲染批量操作工具栏
  const renderBatchToolbar = () => {
    const tabMedia = mediaList.filter((m) => m.media_type === activeTab)
    const hasMedia = tabMedia.length > 0
    const selectedCount = selectedIds.size
    const allSelected = hasMedia && selectedCount === tabMedia.length

    if (!hasMedia) return null

    return (
      <div className="flex items-center justify-between mb-4 p-3 bg-white/5 rounded-lg">
        <div className="flex items-center gap-3">
          {selectionMode ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={allSelected ? deselectAll : selectAll}
              >
                {allSelected ? (
                  <>
                    <XCircle className="h-4 w-4 mr-1" />
                    {t('admin.media.batch.deselectAll')}
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-4 w-4 mr-1" />
                    {t('admin.media.batch.selectAll')}
                  </>
                )}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t('admin.media.batch.selected', { count: selectedCount })}
              </span>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectionMode(true)}
            >
              <Square className="h-4 w-4 mr-1" />
              {t('admin.media.batch.selectMode')}
            </Button>
          )}
        </div>

        {selectionMode && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectionMode(false)
                setSelectedIds(new Set())
              }}
            >
              {t('admin.media.batch.cancel')}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={selectedCount === 0 || deleting}
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-1" />
                  )}
                  {t('admin.media.batch.deleteSelected', { count: selectedCount })}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('admin.media.confirm.deleteBatchTitle')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('admin.media.confirm.deleteBatchDescription', { count: selectedCount })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('admin.media.confirm.cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleBatchDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {t('admin.media.confirm.delete')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    )
  }

  // 渲染空状态
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <FileText className="h-12 w-12 mb-4 opacity-50" />
      <p>{t('admin.media.empty')}</p>
    </div>
  )

  // 渲染加载状态
  const renderLoadingState = () => (
    <div className="space-y-4">
      <div className="flex gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="w-[200px] h-[220px] rounded-lg" />
        ))}
      </div>
    </div>
  )

  // 渲染 Logo 边框样式选择器
  const renderFrameStylePicker = () => (
    <div className="mb-4 p-4 rounded-lg bg-white/5 border border-white/10">
      <p className="text-sm font-medium mb-1">{t('admin.assets.form.frameStyle.label')}</p>
      <p className="text-xs text-muted-foreground mb-3">{t('admin.assets.form.frameStyle.hint')}</p>
      <div className="flex flex-wrap gap-3">
        {FRAME_STYLE_OPTIONS.map((style) => {
          const theme = FRAME_STYLE_THEMES[style]
          const isSelected = frameStyle === style
          return (
            <button
              key={style}
              type="button"
              disabled={savingFrameStyle}
              onClick={() => handleFrameStyleChange(style)}
              className={cn(
                'flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200',
                'hover:bg-white/5',
                isSelected
                  ? 'border-white/30 bg-white/[0.06]'
                  : 'border-white/10 bg-transparent',
                savingFrameStyle && 'opacity-50 cursor-not-allowed'
              )}
              style={isSelected ? { boxShadow: `0 0 12px ${theme.glow}` } : undefined}
            >
              <AssetLogoFrame frameStyle={style} size="sm" />
              <span className="text-xs text-muted-foreground">
                {t(`admin.assets.form.frameStyle.${style}`)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )

  // 渲染标签页内容
  const renderTabContent = (tabKey: string) => {
    const isImageType = tabKey === 'cover' || tabKey === 'gallery' || tabKey === 'logo'
    const tabMedia = mediaList.filter((m) => m.media_type === tabKey)

    return (
      <div>
        {renderUploadArea()}
        {tabKey === 'logo' && renderFrameStylePicker()}
        {renderBatchToolbar()}

        {loading ? (
          renderLoadingState()
        ) : tabMedia.length === 0 ? (
          renderEmptyState()
        ) : isImageType ? (
          <div className="flex flex-wrap gap-4 mt-4">
            {tabMedia.map(renderImageCard)}
          </div>
        ) : (
          <div className="mt-4">
            {tabMedia.map(renderDocumentCard)}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <Dialog open={visible} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-[900px] max-h-[85vh] overflow-hidden flex flex-col top-[10vh] translate-y-0 data-[state=open]:slide-in-from-top-2">
          <DialogHeader>
            <DialogTitle>{t('admin.media.title')}</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as MediaType)}>
              <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-transparent p-0 mb-4">
                {Object.entries(MEDIA_TYPE_CONFIG).map(([key, config]) => (
                  <TabsTrigger
                    key={key}
                    value={key}
                    className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary border border-white/10 data-[state=active]:border-primary/30"
                  >
                    <span>{t(config.labelKey)}</span>
                    {config.required && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                    {stats?.by_type?.[key as MediaType] ? (
                      <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                        {stats.by_type[key as MediaType]}
                      </Badge>
                    ) : null}
                  </TabsTrigger>
                ))}
              </TabsList>

              {Object.keys(MEDIA_TYPE_CONFIG).map((key) => (
                <TabsContent key={key} value={key} className="mt-0 min-h-[400px]">
                  {renderTabContent(key)}
                </TabsContent>
              ))}
            </Tabs>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              {t('admin.media.actions.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden">
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 hover:bg-black/70 transition-colors"
          >
            <X className="h-4 w-4 text-white" />
          </button>
          {previewImage && (
            <img
              src={previewImage}
              alt="Preview"
              className="w-full h-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default MediaManager
