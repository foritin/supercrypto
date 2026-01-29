'use client'
/**
 * Asset Admin List Component
 * Admin panel for managing RWA assets
 * 
 * Migrated from Ant Design to shadcn/ui:
 * - Table → DataTable (@tanstack/react-table)
 * - Modal → Dialog (Radix)
 * - Form → react-hook-form + zod
 * - Popconfirm → AlertDialog
 * - message → sonner toast (notification service)
 * 
 * @validates Requirements 8.1, 8.4, 8.5
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ColumnDef } from '@tanstack/react-table'
import { 
  Plus, Edit, RefreshCw, PauseCircle, PlayCircle, 
  DollarSign, Link, Image, Loader2
} from 'lucide-react'

// shadcn/ui components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Label } from '@/components/ui/label'
import { DataTable } from '@/components/ui/data-table'

// Services and utilities
import { notification } from '@/lib/notification'
import { getErrorMessage } from '@/utils/error-handler'
import { 
  assetService, 
  type AssetListItem, 
  type AssetDetail,
  type AssetStatus, 
  type AssetType,
  type AssetUpdateRequest,
  type ProjectContractInfo,
  ASSET_TYPE_NAMES,
  ASSET_STATUS_NAMES,
} from '@/services/asset'
import { MediaManager } from './media-manager'
import { AssetStatusIndicator } from './asset-status-indicator'
import { CreateAssetWizard } from './create-asset-wizard'

// Asset type options
const ASSET_TYPE_OPTIONS: { value: AssetType; label: string }[] = [
  { value: 'real_estate', label: ASSET_TYPE_NAMES.real_estate },
  { value: 'bond', label: ASSET_TYPE_NAMES.bond },
  { value: 'commodity', label: ASSET_TYPE_NAMES.commodity },
  { value: 'equity', label: ASSET_TYPE_NAMES.equity },
  { value: 'other', label: ASSET_TYPE_NAMES.other },
]

// Status badge variant mapping
const STATUS_BADGE_VARIANTS: Record<AssetStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  paused: 'secondary',
  sold_out: 'outline',
  closed: 'destructive',
}

interface PaginatedData {
  items: AssetListItem[]
  pagination: {
    total: number
    page: number
    page_size: number
    total_pages: number
  }
}

// Edit form schema factory - uses i18n
const createEditAssetSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(1, t('admin.assets.form.nameEmpty')),
  symbol: z.string().min(1, t('admin.assets.form.symbolEmpty')),
  description: z.string().optional(),
  asset_type: z.enum(['real_estate', 'bond', 'commodity', 'equity', 'other']),
  image_url: z.string().optional(),
  document_url: z.string().optional(),
  location: z.string().optional(),
  total_supply: z.number().min(0, t('admin.assets.form.totalSupplyNonNegative')),
  min_subscription: z.number().min(0, t('admin.assets.form.minSubscriptionNonNegative')),
  apy_3m: z.number().min(0).max(100),
  apy_6m: z.number().min(0).max(100),
  apy_12m: z.number().min(0).max(100),
})

type EditAssetFormValues = z.infer<ReturnType<typeof createEditAssetSchema>>

// Price update form schema factory - uses i18n
const createPriceUpdateSchema = (t: (key: string) => string) => z.object({
  price: z.number().min(0, t('admin.assets.form.priceNonNegative')),
  source: z.enum(['manual', 'oracle', 'api']),
})

type PriceUpdateFormValues = z.infer<ReturnType<typeof createPriceUpdateSchema>>

export function AssetAdminList() {
  const { t } = useTranslation()
  const [statusFilter, setStatusFilter] = useState<AssetStatus | undefined>(undefined)
  const [typeFilter, setTypeFilter] = useState<AssetType | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  
  // Data state
  const [data, setData] = useState<PaginatedData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [priceModalOpen, setPriceModalOpen] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<AssetListItem | null>(null)
  
  // AlertDialog state for status toggle confirmation
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false)
  const [assetToToggle, setAssetToToggle] = useState<AssetListItem | null>(null)
  
  // Loading states for mutations
  const [isUpdating, setIsUpdating] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false)
  
  // 项目绑定相关状态
  const [availableProjects, setAvailableProjects] = useState<ProjectContractInfo[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [bindModalOpen, setBindModalOpen] = useState(false)
  const [isBinding, setIsBinding] = useState(false)
  const [selectedBindProject, setSelectedBindProject] = useState<string | null>(null)
  const [selectedContracts, setSelectedContracts] = useState<string[]>([])
  const [contractsToUnbind, setContractsToUnbind] = useState<string[]>([])
  const [isUnbinding, setIsUnbinding] = useState(false)
  const [currentAssetDetail, setCurrentAssetDetail] = useState<AssetDetail | null>(null)
  
  // 媒体管理状态
  const [mediaModalOpen, setMediaModalOpen] = useState(false)
  const [mediaAssetId, setMediaAssetId] = useState<number | null>(null)
  
  // 防止重复点击
  const isOpeningCreateModal = useRef(false)

  // 使用 useMemo 创建带 i18n 的 schema
  const editAssetSchema = useMemo(() => createEditAssetSchema(t), [t])
  const priceUpdateSchema = useMemo(() => createPriceUpdateSchema(t), [t])

  // react-hook-form for edit modal
  const editForm = useForm<EditAssetFormValues>({
    resolver: zodResolver(editAssetSchema),
    defaultValues: {
      name: '',
      symbol: '',
      description: '',
      asset_type: 'real_estate',
      image_url: '',
      document_url: '',
      location: '',
      total_supply: 0,
      min_subscription: 0,
      apy_3m: 0,
      apy_6m: 0,
      apy_12m: 0,
    },
  })

  // react-hook-form for price modal
  const priceForm = useForm<PriceUpdateFormValues>({
    resolver: zodResolver(priceUpdateSchema),
    defaultValues: {
      price: 0,
      source: 'manual',
    },
  })

  // Fetch assets
  const fetchAssets = useCallback(async () => {
    setIsLoading(true)
    try {
      // 管理员使用 getAssetsAdmin，可以看到所有资产（包括未绑定合约的）
      const result = await assetService.getAssetsAdmin({
        page,
        page_size: pageSize,
        status: statusFilter,
        asset_type: typeFilter,
      })
      setData(result)
    } catch (err) {
      console.error('Failed to fetch assets:', err)
      notification.error(t('common.error'))
    } finally {
      setIsLoading(false)
    }
  }, [page, pageSize, statusFilter, typeFilter, t])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  // 加载可绑定的项目列表
  const fetchAvailableProjects = useCallback(async () => {
    setIsLoadingProjects(true)
    try {
      const projects = await assetService.getAvailableProjects()
      setAvailableProjects(projects)
    } catch (err) {
      console.error('Failed to fetch available projects:', err)
    } finally {
      setIsLoadingProjects(false)
    }
  }, [])

  // 打开创建 Modal（防重复点击）
  const handleOpenCreateModal = useCallback(() => {
    // 防止重复触发
    if (isOpeningCreateModal.current || createModalOpen) {
      console.log('[AssetAdminList] Prevented duplicate modal open')
      return
    }
    isOpeningCreateModal.current = true
    console.log('[AssetAdminList] Opening create modal')
    setCreateModalOpen(true)
    fetchAvailableProjects()
    // 延迟重置标志
    setTimeout(() => {
      isOpeningCreateModal.current = false
    }, 300)
  }, [createModalOpen, fetchAvailableProjects])

  // 打开绑定模态框时加载项目列表和资产详情
  const handleOpenBindModal = useCallback(async (asset: AssetListItem) => {
    setSelectedAsset(asset)
    setBindModalOpen(true)
    // 并行加载项目列表和资产详情
    await Promise.all([
      fetchAvailableProjects(),
      (async () => {
        try {
          const detail = await assetService.getAssetAdmin(asset.id)
          setCurrentAssetDetail(detail)
        } catch (err) {
          console.error('Failed to fetch asset detail:', err)
        }
      })()
    ])
  }, [fetchAvailableProjects])

  // 选择项目时自动选中可用合约
  const handleSelectProject = useCallback((project: string | null) => {
    setSelectedBindProject(project)
    if (project) {
      const projectInfo = availableProjects.find(p => p.project === project)
      if (projectInfo) {
        // 自动选中所有可用的合约
        const availableContractNames = projectInfo.contracts
          .filter(c => c.is_available)
          .map(c => c.contract_name)
        setSelectedContracts(availableContractNames)
      }
    } else {
      setSelectedContracts([])
    }
  }, [availableProjects])

  // 绑定项目合约
  const handleBindProject = useCallback(async () => {
    if (!selectedAsset || !selectedBindProject || selectedContracts.length === 0) return
    
    setIsBinding(true)
    try {
      await assetService.bindProjectContracts(
        selectedAsset.id, 
        selectedBindProject, 
        selectedContracts,
        true
      )
      notification.success(t('admin.assets.bindSuccess', { project: selectedBindProject, count: selectedContracts.length }))
      setBindModalOpen(false)
      setSelectedBindProject(null)
      setSelectedContracts([])
      fetchAssets()
    } catch (err) {
      notification.error(getErrorMessage(err))
    } finally {
      setIsBinding(false)
    }
  }, [selectedAsset, selectedBindProject, selectedContracts, t, fetchAssets])

  // 解绑选中的合约
  const handleUnbindContracts = useCallback(async () => {
    if (!selectedAsset || contractsToUnbind.length === 0) return
    
    setIsUnbinding(true)
    try {
      const detail = await assetService.unbindContracts(selectedAsset.id, { 
        contract_names: contractsToUnbind 
      })
      notification.success(t('admin.assets.unbindContractsSuccess', { count: contractsToUnbind.length }))
      setContractsToUnbind([])
      setCurrentAssetDetail(detail)
      fetchAssets()
    } catch (err) {
      notification.error(getErrorMessage(err))
    } finally {
      setIsUnbinding(false)
    }
  }, [selectedAsset, contractsToUnbind, t, fetchAssets])

  const refetch = fetchAssets

  // Update asset
  const handleUpdate = async (values: EditAssetFormValues) => {
    if (!selectedAsset) return
    setIsUpdating(true)
    try {
      await assetService.updateAsset(selectedAsset.id, values as AssetUpdateRequest)
      notification.success(t('admin.assets.updateSuccess'))
      setEditModalOpen(false)
      setSelectedAsset(null)
      editForm.reset()
      refetch()
    } catch (error) {
      notification.error((error as Error).message || t('common.error'))
    } finally {
      setIsUpdating(false)
    }
  }

  // Update status
  const handleStatusUpdate = async (id: number, status: AssetStatus) => {
    setIsUpdatingStatus(true)
    try {
      await assetService.updateAssetStatus(id, status)
      notification.success(t('admin.assets.statusUpdateSuccess'))
      refetch()
    } catch (error) {
      notification.error((error as Error).message || t('common.error'))
    } finally {
      setIsUpdatingStatus(false)
      setStatusConfirmOpen(false)
      setAssetToToggle(null)
    }
  }

  // Update price
  const handlePriceUpdate = async (values: PriceUpdateFormValues) => {
    if (!selectedAsset) return
    setIsUpdatingPrice(true)
    try {
      await assetService.updateAssetPrice(selectedAsset.id, values.price, values.source)
      notification.success(t('admin.assets.priceUpdateSuccess'))
      setPriceModalOpen(false)
      setSelectedAsset(null)
      priceForm.reset()
      refetch()
    } catch (error) {
      notification.error((error as Error).message || t('common.error'))
    } finally {
      setIsUpdatingPrice(false)
    }
  }

  // Open edit modal
  const openEditModal = async (asset: AssetListItem) => {
    setSelectedAsset(asset)
    try {
      const detail = await assetService.getAssetAdmin(asset.id)
      setCurrentAssetDetail(detail)
      editForm.reset({
        name: detail.name,
        symbol: detail.symbol,
        description: detail.description || '',
        asset_type: detail.asset_type,
        image_url: detail.image_url || '',
        document_url: detail.document_url || '',
        location: detail.location || '',
        total_supply: detail.total_supply,
        min_subscription: detail.min_subscription,
        apy_3m: detail.apy_3m,
        apy_6m: detail.apy_6m,
        apy_12m: detail.apy_12m,
      })
      setEditModalOpen(true)
    } catch (err) {
      notification.error(t('common.error'))
    }
  }

  // Open price modal
  const openPriceModal = (asset: AssetListItem) => {
    setSelectedAsset(asset)
    priceForm.reset({
      price: asset.current_price,
      source: 'manual',
    })
    setPriceModalOpen(true)
  }

  // Toggle status - open confirmation dialog
  const handleToggleStatusClick = (asset: AssetListItem) => {
    setAssetToToggle(asset)
    setStatusConfirmOpen(true)
  }

  // Confirm status toggle
  const confirmToggleStatus = () => {
    if (!assetToToggle) return
    const newStatus: AssetStatus = assetToToggle.status === 'active' ? 'paused' : 'active'
    handleStatusUpdate(assetToToggle.id, newStatus)
  }

  // Table columns using @tanstack/react-table ColumnDef
  const columns: ColumnDef<AssetListItem>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      size: 60,
    },
    {
      accessorKey: 'name',
      header: t('admin.assets.name'),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-semibold">{row.original.name}</span>
          <span className="text-xs text-muted-foreground">{row.original.symbol}</span>
        </div>
      ),
    },
    {
      accessorKey: 'asset_type',
      header: t('admin.assets.type'),
      size: 120,
      cell: ({ row }) => (
        <Badge variant="secondary">{ASSET_TYPE_NAMES[row.original.asset_type]}</Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: t('admin.assets.status'),
      size: 100,
      cell: ({ row }) => (
        <Badge variant={STATUS_BADGE_VARIANTS[row.original.status]}>
          {ASSET_STATUS_NAMES[row.original.status]}
        </Badge>
      ),
    },
    {
      id: 'visibility',
      header: t('admin.assets.visibility'),
      size: 80,
      cell: ({ row }) => (
        <div className="text-center">
          <AssetStatusIndicator asset={row.original} compact />
        </div>
      ),
    },
    {
      accessorKey: 'current_price',
      header: t('admin.assets.price'),
      size: 100,
      cell: ({ row }) => `$${row.original.current_price.toFixed(2)}`,
    },
    {
      id: 'apy',
      header: t('admin.assets.apy'),
      size: 150,
      cell: ({ row }) => (
        <div className="flex gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-xs">{row.original.apy_3m}%</Badge>
              </TooltipTrigger>
              <TooltipContent>3M</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-xs">{row.original.apy_6m}%</Badge>
              </TooltipTrigger>
              <TooltipContent>6M</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-xs">{row.original.apy_12m}%</Badge>
              </TooltipTrigger>
              <TooltipContent>12M</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
    },
    {
      id: 'progress',
      header: t('admin.assets.progress'),
      size: 120,
      cell: ({ row }) => (
        <span>{row.original.subscription_progress.toFixed(1)}%</span>
      ),
    },
    {
      id: 'actions',
      header: t('admin.assets.actions'),
      size: 240,
      cell: ({ row }) => {
        const record = row.original
        return (
          <div className="flex gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEditModal(record)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('common.edit')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openPriceModal(record)}
                  >
                    <DollarSign className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('admin.assets.updatePrice')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setMediaAssetId(record.id)
                      setMediaModalOpen(true)
                    }}
                  >
                    <Image className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('admin.assets.mediaManagement')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleOpenBindModal(record)}
                  >
                    <Link className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('admin.assets.bindContracts')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={record.status === 'active' ? 'destructive' : 'ghost'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleToggleStatusClick(record)}
                    disabled={isUpdatingStatus}
                  >
                    {isUpdatingStatus ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : record.status === 'active' ? (
                      <PauseCircle className="h-4 w-4" />
                    ) : (
                      <PlayCircle className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {record.status === 'active' 
                    ? t('admin.assets.pause')
                    : t('admin.assets.resume')
                  }
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )
      },
    },
  ]

  // Status filter options
  const statusOptions = [
    { value: 'all', label: t('admin.assets.allStatus') },
    { value: 'active', label: ASSET_STATUS_NAMES.active },
    { value: 'paused', label: ASSET_STATUS_NAMES.paused },
    { value: 'sold_out', label: ASSET_STATUS_NAMES.sold_out },
    { value: 'closed', label: ASSET_STATUS_NAMES.closed },
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>{t('admin.assets.title')}</CardTitle>
          <div className="flex gap-2">
            <Select
              value={statusFilter || 'all'}
              onValueChange={(value) => setStatusFilter(value === 'all' ? undefined : value as AssetStatus)}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder={t('admin.assets.filterByStatus')} />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={typeFilter || 'all'}
              onValueChange={(value) => setTypeFilter(value === 'all' ? undefined : value as AssetType)}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder={t('admin.assets.filterByType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.assets.allTypes')}</SelectItem>
                {ASSET_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('common.refresh')}
            </Button>
            <Button onClick={handleOpenCreateModal}>
              <Plus className="h-4 w-4 mr-2" />
              {t('admin.assets.create')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* DataTable */}
        <DataTable
          columns={columns}
          data={data?.items || []}
          loading={isLoading}
          emptyMessage={t('common.noData')}
          pagination={{
            pageIndex: page - 1,
            pageSize,
            pageCount: data?.pagination.total_pages || 1,
            onPageChange: (p) => setPage(p + 1),
            onPageSizeChange: setPageSize,
          }}
        />
      </CardContent>

      {/* Create Modal */}
      <CreateAssetWizard
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={fetchAssets}
        availableProjects={availableProjects}
        isLoadingProjects={isLoadingProjects}
      />

      {/* Edit Modal - using Dialog */}
      <Dialog open={editModalOpen} onOpenChange={(open) => {
        if (!open) {
          setEditModalOpen(false)
          setSelectedAsset(null)
          setCurrentAssetDetail(null)
          editForm.reset()
        }
      }}>
        <DialogContent className="max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('admin.assets.editTitle')}</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdate)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.assets.form.name')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="symbol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.assets.form.symbol')}</FormLabel>
                    <FormControl>
                      <Input {...field} className="uppercase" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="asset_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.assets.form.type')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ASSET_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.assets.form.description')}</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.assets.form.location')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="image_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.assets.form.imageUrl')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="total_supply"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.assets.form.totalSupply')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="min_subscription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.assets.form.minSubscription')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={editForm.control}
                  name="apy_3m"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.assets.form.apy3m')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="apy_6m"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.assets.form.apy6m')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="apy_12m"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.assets.form.apy12m')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 显示已绑定的合约（只读展示） */}
              <div className="space-y-2">
                <Label>{t('admin.assets.form.boundContracts')}</Label>
                {currentAssetDetail?.bound_contracts && currentAssetDetail.bound_contracts.length > 0 ? (
                  <Card className="bg-primary/5 border-primary/30">
                    <CardContent className="p-4 space-y-3">
                      {/* 按类型分组显示 */}
                      {['common', 'project'].map(type => {
                        const contracts = currentAssetDetail.bound_contracts!.filter(c => c.contract_type === type)
                        if (contracts.length === 0) return null
                        
                        const typeLabel = type === 'common' ? 'Common' : (currentAssetDetail.project || 'Project')
                        
                        return (
                          <div key={type} className="space-y-2">
                            {/* 类型标题 */}
                            <Badge variant={type === 'common' ? 'secondary' : 'default'}>
                              {typeLabel}
                            </Badge>
                            {/* 合约列表 */}
                            <div className="ml-3 space-y-1">
                              {contracts.map(c => (
                                <div 
                                  key={c.contract_name}
                                  className="flex items-center gap-2 p-2 rounded"
                                >
                                  <span className="flex-1">
                                    {c.contract_name}
                                    {c.is_primary && ' ⭐'}
                                  </span>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="text-xs text-muted-foreground font-mono">
                                          {c.contract_address.slice(0, 6)}...{c.contract_address.slice(-4)}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>{c.contract_address}</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('admin.assets.noContractsBound')}</p>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t('common.confirm')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Price Update Modal - using Dialog */}
      <Dialog open={priceModalOpen} onOpenChange={(open) => {
        if (!open) {
          setPriceModalOpen(false)
          setSelectedAsset(null)
          priceForm.reset()
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.assets.updatePriceTitle')}</DialogTitle>
          </DialogHeader>
          {selectedAsset && (
            <Form {...priceForm}>
              <form onSubmit={priceForm.handleSubmit(handlePriceUpdate)} className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t('admin.assets.currentPriceLabel')}: ${selectedAsset.current_price.toFixed(2)}
                </p>

                <FormField
                  control={priceForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.assets.newPrice')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={priceForm.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.assets.priceSource')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="manual">Manual Update</SelectItem>
                          <SelectItem value="oracle">Oracle</SelectItem>
                          <SelectItem value="api">External API</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setPriceModalOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={isUpdatingPrice}>
                    {isUpdatingPrice && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {t('common.confirm')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Toggle Confirmation - using AlertDialog */}
      <AlertDialog open={statusConfirmOpen} onOpenChange={setStatusConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {assetToToggle?.status === 'active' 
                ? t('admin.assets.confirmPause')
                : t('admin.assets.confirmResume')
              }
            </AlertDialogTitle>
            <AlertDialogDescription>
              {assetToToggle?.status === 'active'
                ? t('admin.assets.pauseDescription', { name: assetToToggle?.name })
                : t('admin.assets.resumeDescription', { name: assetToToggle?.name })
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmToggleStatus}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Project Contract Binding Modal - using Dialog */}
      <Dialog open={bindModalOpen} onOpenChange={(open) => {
        if (!open) {
          setBindModalOpen(false)
          setSelectedAsset(null)
          setSelectedBindProject(null)
          setSelectedContracts([])
          setContractsToUnbind([])
          setCurrentAssetDetail(null)
        }
      }}>
        <DialogContent className="max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t('admin.assets.bindContractsTitle')}</DialogTitle>
          </DialogHeader>
          {selectedAsset && (
            <div className="space-y-4">
              {/* 当前已绑定的合约（支持勾选解绑） */}
              {currentAssetDetail?.bound_contracts && currentAssetDetail.bound_contracts.length > 0 && (
                <Card className="bg-primary/5 border-primary/30">
                  <CardHeader className="py-3">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-sm">{t('admin.assets.currentlyBound')}</CardTitle>
                      {contractsToUnbind.length > 0 && (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={handleUnbindContracts}
                          disabled={isUnbinding}
                        >
                          {isUnbinding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          {t('admin.assets.unbindSelected', { count: contractsToUnbind.length })}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* 按类型分组显示 */}
                    {['common', 'project'].map(type => {
                      const contracts = currentAssetDetail.bound_contracts!.filter(c => c.contract_type === type)
                      if (contracts.length === 0) return null
                      
                      const typeLabel = type === 'common' ? 'Common' : (currentAssetDetail.project || 'Project')
                      const allSelected = contracts.every(c => contractsToUnbind.includes(c.contract_name))
                      const someSelected = contracts.some(c => contractsToUnbind.includes(c.contract_name))
                      
                      return (
                        <div key={type} className="space-y-2">
                          {/* 类型标题（可全选） */}
                          <div 
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => {
                              const contractNames = contracts.map(c => c.contract_name)
                              if (allSelected) {
                                setContractsToUnbind(prev => prev.filter(n => !contractNames.includes(n)))
                              } else {
                                setContractsToUnbind(prev => [...new Set([...prev, ...contractNames])])
                              }
                            }}
                          >
                            <Checkbox 
                              checked={allSelected}
                              // @ts-expect-error - indeterminate is a valid prop
                              indeterminate={someSelected && !allSelected}
                            />
                            <Badge variant={type === 'common' ? 'secondary' : 'default'}>
                              {typeLabel}
                            </Badge>
                          </div>
                          {/* 合约列表 */}
                          <div className="ml-6 space-y-1">
                            {contracts.map(c => {
                              const isChecked = contractsToUnbind.includes(c.contract_name)
                              return (
                                <div 
                                  key={c.contract_name}
                                  className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                                    isChecked ? 'bg-destructive/10' : 'hover:bg-muted/50'
                                  }`}
                                  onClick={() => {
                                    setContractsToUnbind(prev => 
                                      isChecked 
                                        ? prev.filter(n => n !== c.contract_name)
                                        : [...prev, c.contract_name]
                                    )
                                  }}
                                >
                                  <Checkbox checked={isChecked} />
                                  <span className="flex-1">
                                    {c.contract_name}
                                    {c.is_primary && ' ⭐'}
                                  </span>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="text-xs text-muted-foreground font-mono">
                                          {c.contract_address.slice(0, 6)}...{c.contract_address.slice(-4)}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>{c.contract_address}</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              )}

              <p className="text-sm text-muted-foreground">
                {t('admin.assets.bindDescription', { asset: selectedAsset.name })}
              </p>

              <Select
                value={selectedBindProject || ''}
                onValueChange={(value) => handleSelectProject(value || null)}
                disabled={isLoadingProjects || availableProjects.filter(p => p.project !== 'common').length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    isLoadingProjects 
                      ? t('admin.assets.loadingProjects')
                      : availableProjects.filter(p => p.project !== 'common').length === 0
                        ? t('admin.assets.noProjectsAvailable')
                        : t('admin.assets.selectProject')
                  } />
                </SelectTrigger>
                <SelectContent className="z-[1200]">
                  {availableProjects.filter(p => p.project !== 'common').length === 0 ? (
                    <div className="py-6 px-4 text-center text-muted-foreground text-sm">
                      {t('admin.assets.noProjectsAvailable')}
                    </div>
                  ) : (
                    availableProjects
                      .filter(p => p.project !== 'common')
                      .map(p => (
                      <SelectItem key={p.project} value={p.project}>
                        <div className="flex justify-between items-center w-full gap-4">
                          <span className="font-medium">{p.project}</span>
                          <Badge variant={p.project === 'mock' ? 'outline' : 'default'}>
                            {p.contracts.filter(c => c.is_available).length}/{p.contract_count}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              {selectedBindProject && (
                <Card>
                  <CardHeader className="py-3">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-sm">{t('admin.assets.contractsToBindTitle')}</CardTitle>
                      <span className="text-xs text-muted-foreground">
                        {t('admin.assets.selectedCount', { count: selectedContracts.length })}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {availableProjects
                      .find(p => p.project === selectedBindProject)
                      ?.contracts.map(contract => {
                        const isChecked = selectedContracts.includes(contract.contract_name)
                        
                        return (
                          <div 
                            key={contract.contract_name} 
                            className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                              !contract.is_available 
                                ? 'opacity-50 cursor-not-allowed' 
                                : isChecked 
                                  ? 'bg-primary/10 border-primary/30' 
                                  : 'hover:bg-muted/50 border-transparent'
                            }`}
                            onClick={() => {
                              if (!contract.is_available) return
                              setSelectedContracts(prev => 
                                isChecked 
                                  ? prev.filter(n => n !== contract.contract_name)
                                  : [...prev, contract.contract_name]
                              )
                            }}
                          >
                            <Checkbox 
                              checked={isChecked} 
                              disabled={!contract.is_available}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`font-medium ${!contract.is_available ? 'text-muted-foreground' : ''}`}>
                                  {contract.contract_name}
                                </span>
                                <Badge 
                                  variant="outline" 
                                  className="text-[10px] px-1 py-0"
                                >
                                  {contract.contract_type}
                                </Badge>
                              </div>
                              {!contract.is_available && contract.bound_to_asset && (
                                <p className="text-xs text-muted-foreground">
                                  {t('admin.assets.boundTo', { asset: contract.bound_to_asset })}
                                </p>
                              )}
                            </div>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-xs text-muted-foreground font-mono">
                                    {contract.contract_address.slice(0, 6)}...{contract.contract_address.slice(-4)}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>{contract.contract_address}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        )
                      })
                    }
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBindModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleBindProject}
              disabled={!selectedBindProject || selectedContracts.length === 0 || isBinding}
            >
              {isBinding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 媒体管理模态框 */}
      {mediaAssetId && (
        <MediaManager
          assetId={mediaAssetId}
          visible={mediaModalOpen}
          onClose={() => {
            setMediaModalOpen(false)
            setMediaAssetId(null)
          }}
          onUpdate={() => fetchAssets()}
        />
      )}
    </Card>
  )
}
