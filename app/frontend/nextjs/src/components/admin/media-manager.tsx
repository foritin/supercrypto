/**
 * 媒体管理组件
 * 
 * 用于管理资产的媒体文件（图片、文档等）
 * 支持：上传、删除、排序、设置主图
 * 
 * Migrated from Ant Design to shadcn/ui
 * @validates Requirements 8.6
 */
'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { 
  Trash2, 
  Star, 
  FileText, 
  Image as ImageIcon, 
  Upload,
  Download,
  Loader2,
  X
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
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { notification } from '@/lib/notification'
import { assetService, type AssetMediaItem, type MediaType, type MediaStats } from '@/services/asset'

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
  const [isDragging, setIsDragging] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      notification.error('加载媒体列表失败')
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
      notification.error(`文件大小超过限制 (${config.maxSize / 1024 / 1024}MB)`)
      return false
    }

    setUploading(true)
    try {
      await assetService.uploadMedia(assetId, file, activeTab, file.name)
      notification.success('上传成功')
      loadMedia()
      onUpdate?.()
    } catch (error) {
      notification.error('上传失败')
    } finally {
      setUploading(false)
    }
    return false
  }

  // 删除媒体
  const handleDelete = async (mediaId: number) => {
    try {
      await assetService.deleteMedia(assetId, mediaId)
      notification.success('删除成功')
      loadMedia()
      onUpdate?.()
    } catch (error) {
      notification.error('删除失败')
    }
  }

  // 设置主图
  const handleSetPrimary = async (mediaId: number) => {
    try {
      await assetService.updateMedia(assetId, mediaId, { is_primary: true })
      notification.success('已设为主图')
      loadMedia()
      onUpdate?.()
    } catch (error) {
      notification.error('设置失败')
    }
  }

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleUpload(files[0])
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
      handleUpload(files[0])
    }
  }

  // 渲染图片卡片
  const renderImageCard = (media: AssetMediaItem) => (
    <Card key={media.id} className="w-[200px] overflow-hidden group">
      <div className="relative h-[150px] overflow-hidden">
        <img
          src={media.url}
          alt={media.title || '媒体'}
          className="object-cover w-full h-full cursor-pointer transition-transform group-hover:scale-105"
          onClick={() => setPreviewImage(media.url)}
        />
        {media.is_primary && (
          <Badge 
            className="absolute top-2 right-2 bg-yellow-500/90 text-yellow-950"
          >
            <Star className="w-3 h-3 mr-1 fill-current" />
            主图
          </Badge>
        )}
      </div>
      <CardContent className="p-3">
        <p className="font-medium text-sm truncate">{media.title || '未命名'}</p>
        <p className="text-xs text-muted-foreground truncate">{media.file_name}</p>
      </CardContent>
      <CardFooter className="p-3 pt-0 flex justify-end gap-2">
        {!media.is_primary && activeTab === 'gallery' && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleSetPrimary(media.id)}
            title="设为主图"
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
              title="删除"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确定删除此媒体文件？</AlertDialogTitle>
              <AlertDialogDescription>
                此操作无法撤销，文件将被永久删除。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDelete(media.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  )

  // 渲染文档卡片
  const renderDocumentCard = (media: AssetMediaItem) => (
    <Card key={media.id} className="mb-2">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="flex-shrink-0">
          <FileText className="h-8 w-8 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{media.title || media.file_name}</p>
          {media.description && (
            <p className="text-sm text-muted-foreground truncate">{media.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            asChild
          >
            <a href={media.url} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4 mr-1" />
              下载
            </a>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                删除
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确定删除此文件？</AlertDialogTitle>
                <AlertDialogDescription>
                  此操作无法撤销，文件将被永久删除。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDelete(media.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )

  // 渲染上传区域
  const renderUploadArea = () => {
    const config = MEDIA_TYPE_CONFIG[activeTab]
    const isImageType = activeTab === 'cover' || activeTab === 'gallery'

    return (
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer mb-4",
          isDragging 
            ? "border-primary bg-primary/5" 
            : "border-white/20 hover:border-primary/50 hover:bg-white/5",
          uploading && "pointer-events-none opacity-50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={config?.accept}
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
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
            {uploading ? '上传中...' : '点击或拖拽文件到此区域上传'}
          </p>
          <p className="text-xs text-muted-foreground">
            支持: {config?.accept} | 最大: {(config?.maxSize || 0) / 1024 / 1024}MB
          </p>
        </div>
      </div>
    )
  }

  // 渲染空状态
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <FileText className="h-12 w-12 mb-4 opacity-50" />
      <p>暂无媒体文件</p>
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

  // 渲染标签页内容
  const renderTabContent = (tabKey: string) => {
    const isImageType = tabKey === 'cover' || tabKey === 'gallery'
    const tabMedia = mediaList.filter((m) => m.media_type === tabKey)

    return (
      <div>
        {renderUploadArea()}

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
        <DialogContent className="max-w-[900px] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>媒体管理</DialogTitle>
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
                    <span>{config.label}</span>
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
                <TabsContent key={key} value={key} className="mt-0">
                  {renderTabContent(key)}
                </TabsContent>
              ))}
            </Tabs>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              关闭
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
