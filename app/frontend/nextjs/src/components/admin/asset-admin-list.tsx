'use client'
/**
 * Asset Admin List Component
 * Admin panel for managing RWA assets
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  Table, Card, Select, Button, Tag, Space, Flex, Typography, Modal, 
  Form, Input, InputNumber, message, Popconfirm, Tooltip, Checkbox
} from 'antd'
import { 
  PlusOutlined, EditOutlined, ReloadOutlined, 
  PauseCircleOutlined, PlayCircleOutlined, DollarOutlined,
  LinkOutlined, PictureOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import type { ColumnsType } from 'antd/es/table'
import { 
  assetService, 
  type AssetListItem, 
  type AssetDetail,
  type AssetStatus, 
  type AssetType,
  type AssetCreateRequest,
  type AssetUpdateRequest,
  type ProjectContractInfo,
  type ContractBindingItem,
  type ContractBindingStatus,
  ASSET_TYPE_NAMES,
  ASSET_STATUS_NAMES,
  ASSET_STATUS_COLORS
} from '@/services/asset'
import { MediaManager } from './media-manager'
import { AssetStatusIndicator } from './asset-status-indicator'
import { CreateAssetModal } from './create-asset-modal'

const { Title, Text } = Typography

// Asset type options
const ASSET_TYPE_OPTIONS: { value: AssetType; label: string }[] = [
  { value: 'real_estate', label: ASSET_TYPE_NAMES.real_estate },
  { value: 'bond', label: ASSET_TYPE_NAMES.bond },
  { value: 'commodity', label: ASSET_TYPE_NAMES.commodity },
  { value: 'equity', label: ASSET_TYPE_NAMES.equity },
  { value: 'other', label: ASSET_TYPE_NAMES.other },
]

interface PaginatedData {
  items: AssetListItem[]
  pagination: {
    total: number
    page: number
    page_size: number
    total_pages: number
  }
}

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
  
  // Forms
  const [editForm] = Form.useForm()
  const [priceForm] = Form.useForm()

  // Fetch assets
  const fetchAssets = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await assetService.getAssets({
        page,
        page_size: pageSize,
        status: statusFilter,
        asset_type: typeFilter,
      })
      setData(result)
    } catch (err) {
      console.error('Failed to fetch assets:', err)
      message.error(t('common.error'))
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
          const detail = await assetService.getAsset(asset.id)
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
      message.success(t('admin.assets.bindSuccess', { project: selectedBindProject, count: selectedContracts.length }))
      setBindModalOpen(false)
      setSelectedBindProject(null)
      setSelectedContracts([])
      fetchAssets()
    } catch (err) {
      message.error((err as Error).message || t('admin.assets.bindFailed'))
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
      message.success(t('admin.assets.unbindContractsSuccess', { count: contractsToUnbind.length }))
      setContractsToUnbind([])
      setCurrentAssetDetail(detail)
      fetchAssets()
    } catch (err) {
      message.error((err as Error).message || t('admin.assets.unbindFailed'))
    } finally {
      setIsUnbinding(false)
    }
  }, [selectedAsset, contractsToUnbind, t, fetchAssets])

  const refetch = fetchAssets

  // Update asset
  const handleUpdate = async (id: number, values: AssetUpdateRequest) => {
    setIsUpdating(true)
    try {
      await assetService.updateAsset(id, values)
      message.success(t('admin.assets.updateSuccess'))
      setEditModalOpen(false)
      setSelectedAsset(null)
      refetch()
    } catch (error) {
      message.error((error as Error).message || t('common.error'))
    } finally {
      setIsUpdating(false)
    }
  }

  // Update status
  const handleStatusUpdate = async (id: number, status: AssetStatus) => {
    setIsUpdatingStatus(true)
    try {
      await assetService.updateAssetStatus(id, status)
      message.success(t('admin.assets.statusUpdateSuccess'))
      refetch()
    } catch (error) {
      message.error((error as Error).message || t('common.error'))
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // Update price
  const handlePriceUpdate = async (id: number, price: number, source: string) => {
    setIsUpdatingPrice(true)
    try {
      await assetService.updateAssetPrice(id, price, source)
      message.success(t('admin.assets.priceUpdateSuccess'))
      setPriceModalOpen(false)
      setSelectedAsset(null)
      priceForm.resetFields()
      refetch()
    } catch (error) {
      message.error((error as Error).message || t('common.error'))
    } finally {
      setIsUpdatingPrice(false)
    }
  }

  // Open edit modal
  const openEditModal = async (asset: AssetListItem) => {
    setSelectedAsset(asset)
    try {
      const detail = await assetService.getAsset(asset.id)
      setCurrentAssetDetail(detail)
      editForm.setFieldsValue({
        name: detail.name,
        symbol: detail.symbol,
        description: detail.description,
        asset_type: detail.asset_type,
        image_url: detail.image_url,
        document_url: detail.document_url,
        location: detail.location,
        total_supply: detail.total_supply,
        min_subscription: detail.min_subscription,
        apy_3m: detail.apy_3m,
        apy_6m: detail.apy_6m,
        apy_12m: detail.apy_12m,
      })
      setEditModalOpen(true)
    } catch (err) {
      message.error(t('common.error'))
    }
  }

  // Open price modal
  const openPriceModal = (asset: AssetListItem) => {
    setSelectedAsset(asset)
    priceForm.setFieldsValue({
      price: asset.current_price,
      source: 'manual',
    })
    setPriceModalOpen(true)
  }

  // Toggle status
  const toggleStatus = (asset: AssetListItem) => {
    const newStatus: AssetStatus = asset.status === 'active' ? 'paused' : 'active'
    handleStatusUpdate(asset.id, newStatus)
  }

  // Table columns
  const columns: ColumnsType<AssetListItem> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: t('admin.assets.name'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <Flex vertical gap={0}>
          <Text strong>{name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.symbol}</Text>
        </Flex>
      ),
    },
    {
      title: t('admin.assets.type'),
      dataIndex: 'asset_type',
      key: 'asset_type',
      width: 120,
      render: (type: AssetType) => (
        <Tag color="blue">{ASSET_TYPE_NAMES[type]}</Tag>
      ),
    },
    {
      title: t('admin.assets.status'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: AssetStatus) => (
        <Tag color={ASSET_STATUS_COLORS[status]}>
          {ASSET_STATUS_NAMES[status]}
        </Tag>
      ),
    },
    {
      title: '可见性',
      key: 'visibility',
      width: 80,
      align: 'center' as const,
      render: (_, record) => (
        <AssetStatusIndicator asset={record} compact />
      ),
    },
    {
      title: t('admin.assets.price'),
      dataIndex: 'current_price',
      key: 'current_price',
      width: 100,
      render: (price: number) => `$${price.toFixed(2)}`,
    },
    {
      title: t('admin.assets.apy'),
      key: 'apy',
      width: 150,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="3M">
            <Tag>{record.apy_3m}%</Tag>
          </Tooltip>
          <Tooltip title="6M">
            <Tag>{record.apy_6m}%</Tag>
          </Tooltip>
          <Tooltip title="12M">
            <Tag>{record.apy_12m}%</Tag>
          </Tooltip>
        </Space>
      ),
    },
    {
      title: t('admin.assets.progress'),
      key: 'progress',
      width: 120,
      render: (_, record) => (
        <Text>{record.subscription_progress.toFixed(1)}%</Text>
      ),
    },
    {
      title: t('admin.assets.actions'),
      key: 'actions',
      width: 240,
      render: (_, record) => (
        <Space>
          <Tooltip title={t('common.edit')}>
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
            />
          </Tooltip>
          <Tooltip title={t('admin.assets.updatePrice')}>
            <Button
              size="small"
              icon={<DollarOutlined />}
              onClick={() => openPriceModal(record)}
            />
          </Tooltip>
          <Tooltip title="媒体管理">
            <Button
              size="small"
              icon={<PictureOutlined />}
              onClick={() => {
                setMediaAssetId(record.id)
                setMediaModalOpen(true)
              }}
            />
          </Tooltip>
          <Tooltip title={t('admin.assets.bindContracts')}>
            <Button
              size="small"
              icon={<LinkOutlined />}
              onClick={() => handleOpenBindModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title={record.status === 'active' 
              ? t('admin.assets.confirmPause')
              : t('admin.assets.confirmResume')
            }
            onConfirm={() => toggleStatus(record)}
            okText={t('common.confirm')}
            cancelText={t('common.cancel')}
          >
            <Tooltip title={record.status === 'active' 
              ? t('admin.assets.pause')
              : t('admin.assets.resume')
            }>
              <Button
                size="small"
                icon={record.status === 'active' 
                  ? <PauseCircleOutlined />
                  : <PlayCircleOutlined />
                }
                danger={record.status === 'active'}
                loading={isUpdatingStatus}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // Status filter options
  const statusOptions = [
    { value: undefined, label: t('admin.assets.allStatus') },
    { value: 'active' as AssetStatus, label: ASSET_STATUS_NAMES.active },
    { value: 'paused' as AssetStatus, label: ASSET_STATUS_NAMES.paused },
    { value: 'sold_out' as AssetStatus, label: ASSET_STATUS_NAMES.sold_out },
    { value: 'closed' as AssetStatus, label: ASSET_STATUS_NAMES.closed },
  ]

  return (
    <Card>
      <Flex vertical gap={24} style={{ width: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>{t('admin.assets.title')}</Title>
          <Space>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusOptions}
              style={{ width: 130 }}
              placeholder={t('admin.assets.filterByStatus')}
            />
            <Select
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: undefined, label: t('admin.assets.allTypes') },
                ...ASSET_TYPE_OPTIONS,
              ]}
              style={{ width: 130 }}
              placeholder={t('admin.assets.filterByType')}
            />
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
              {t('common.refresh')}
            </Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={handleOpenCreateModal}
            >
              {t('admin.assets.create')}
            </Button>
          </Space>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          dataSource={data?.items || []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize,
            total: data?.pagination.total || 0,
            showSizeChanger: true,
            showTotal: (total) => t('admin.assets.totalRecords', { total }),
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            },
          }}
          scroll={{ x: 1000 }}
        />
      </Flex>

      {/* Create Modal */}
      <CreateAssetModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={fetchAssets}
        availableProjects={availableProjects}
        isLoadingProjects={isLoadingProjects}
      />

      {/* Edit Modal */}
      <Modal
        title={t('admin.assets.editTitle')}
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false)
          setSelectedAsset(null)
          setCurrentAssetDetail(null)
          editForm.resetFields()
        }}
        onOk={() => editForm.submit()}
        confirmLoading={isUpdating}
        width={700}
        destroyOnHidden
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={(values) => {
            if (selectedAsset) {
              handleUpdate(selectedAsset.id, values)
            }
          }}
        >
          <Form.Item
            name="name"
            label={t('admin.assets.form.name')}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="symbol"
            label={t('admin.assets.form.symbol')}
            rules={[{ required: true }]}
          >
            <Input style={{ textTransform: 'uppercase' }} />
          </Form.Item>

          <Form.Item name="asset_type" label={t('admin.assets.form.type')}>
            <Select options={ASSET_TYPE_OPTIONS} />
          </Form.Item>

          <Form.Item name="description" label={t('admin.assets.form.description')}>
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item name="location" label={t('admin.assets.form.location')}>
            <Input />
          </Form.Item>

          <Form.Item name="image_url" label={t('admin.assets.form.imageUrl')}>
            <Input />
          </Form.Item>

          <Form.Item name="total_supply" label={t('admin.assets.form.totalSupply')}>
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              prefix="$"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            />
          </Form.Item>

          <Form.Item name="min_subscription" label={t('admin.assets.form.minSubscription')}>
            <InputNumber style={{ width: '100%' }} min={0} prefix="$" />
          </Form.Item>

          <Space size="large">
            <Form.Item name="apy_3m" label={t('admin.assets.form.apy3m')}>
              <InputNumber min={0} max={100} suffix="%" />
            </Form.Item>
            <Form.Item name="apy_6m" label={t('admin.assets.form.apy6m')}>
              <InputNumber min={0} max={100} suffix="%" />
            </Form.Item>
            <Form.Item name="apy_12m" label={t('admin.assets.form.apy12m')}>
              <InputNumber min={0} max={100} suffix="%" />
            </Form.Item>
          </Space>

          {/* 显示已绑定的合约（只读展示） */}
          <Form.Item label={t('admin.assets.form.boundContracts')}>
            {currentAssetDetail?.bound_contracts && currentAssetDetail.bound_contracts.length > 0 ? (
              <Card 
                size="small" 
                style={{ background: 'rgba(0, 212, 170, 0.05)', borderColor: 'rgba(0, 212, 170, 0.3)' }}
              >
                <Flex vertical gap={8}>
                  {/* 按类型分组显示 */}
                  {['common', 'project'].map(type => {
                    const contracts = currentAssetDetail.bound_contracts!.filter(c => c.contract_type === type)
                    if (contracts.length === 0) return null
                    
                    const typeLabel = type === 'common' ? 'Common' : (currentAssetDetail.project || 'Project')
                    const typeColor = type === 'common' ? 'processing' : 'success'
                    
                    return (
                      <Flex key={type} vertical gap={6}>
                        {/* 类型标题 */}
                        <Tag color={typeColor} style={{ margin: 0, width: 'fit-content' }}>{typeLabel}</Tag>
                        {/* 合约列表 */}
                        <Flex vertical gap={4} style={{ marginLeft: 12 }}>
                          {contracts.map(c => (
                            <Flex 
                              key={c.contract_name}
                              align="center" 
                              gap={8}
                              style={{ padding: '4px 8px', borderRadius: 4 }}
                            >
                              <Text style={{ flex: 1 }}>
                                {c.contract_name}
                                {c.is_primary && ' ⭐'}
                              </Text>
                              <Tooltip title={c.contract_address}>
                                <Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>
                                  {c.contract_address.slice(0, 6)}...{c.contract_address.slice(-4)}
                                </Text>
                              </Tooltip>
                            </Flex>
                          ))}
                        </Flex>
                      </Flex>
                    )
                  })}
                </Flex>
              </Card>
            ) : (
              <Text type="secondary">{t('admin.assets.noContractsBound')}</Text>
            )}
          </Form.Item>
        </Form>
      </Modal>

      {/* Price Update Modal */}
      <Modal
        title={t('admin.assets.updatePriceTitle')}
        open={priceModalOpen}
        onCancel={() => {
          setPriceModalOpen(false)
          setSelectedAsset(null)
          priceForm.resetFields()
        }}
        onOk={() => priceForm.submit()}
        confirmLoading={isUpdatingPrice}
        destroyOnHidden
      >
        {selectedAsset && (
          <Form
            form={priceForm}
            layout="vertical"
            onFinish={(values) => {
              handlePriceUpdate(selectedAsset.id, values.price, values.source)
            }}
          >
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              {t('admin.assets.currentPriceLabel')}: ${selectedAsset.current_price.toFixed(2)}
            </Text>

            <Form.Item
              name="price"
              label={t('admin.assets.newPrice')}
              rules={[{ required: true, message: t('admin.assets.priceRequired') }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                precision={2}
                prefix="$"
              />
            </Form.Item>

            <Form.Item
              name="source"
              label={t('admin.assets.priceSource')}
              initialValue="manual"
            >
              <Select
                options={[
                  { value: 'manual', label: 'Manual Update' },
                  { value: 'oracle', label: 'Oracle' },
                  { value: 'api', label: 'External API' },
                ]}
              />
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* Project Contract Binding Modal */}
      <Modal
        title={t('admin.assets.bindContractsTitle')}
        open={bindModalOpen}
        onCancel={() => {
          setBindModalOpen(false)
          setSelectedAsset(null)
          setSelectedBindProject(null)
          setSelectedContracts([])
          setContractsToUnbind([])
          setCurrentAssetDetail(null)
        }}
        onOk={handleBindProject}
        okButtonProps={{ disabled: !selectedBindProject || selectedContracts.length === 0 }}
        confirmLoading={isBinding}
        width={600}
        destroyOnHidden
      >
        {selectedAsset && (
          <Flex vertical gap={16}>
            {/* 当前已绑定的合约（支持勾选解绑） */}
            {currentAssetDetail?.bound_contracts && currentAssetDetail.bound_contracts.length > 0 && (
              <Card 
                size="small" 
                title={
                  <Flex justify="space-between" align="center">
                    <span>{t('admin.assets.currentlyBound')}</span>
                    {contractsToUnbind.length > 0 && (
                      <Button 
                        danger 
                        size="small" 
                        loading={isUnbinding}
                        onClick={handleUnbindContracts}
                      >
                        {t('admin.assets.unbindSelected', { count: contractsToUnbind.length })}
                      </Button>
                    )}
                  </Flex>
                }
                style={{ background: 'rgba(0, 212, 170, 0.05)', borderColor: 'rgba(0, 212, 170, 0.3)' }}
              >
                <Flex vertical gap={8}>
                  {/* 按类型分组显示 */}
                  {['common', 'project'].map(type => {
                    const contracts = currentAssetDetail.bound_contracts!.filter(c => c.contract_type === type)
                    if (contracts.length === 0) return null
                    
                    const typeLabel = type === 'common' ? 'Common' : (currentAssetDetail.project || 'Project')
                    const typeColor = type === 'common' ? 'processing' : 'success'
                    const allSelected = contracts.every(c => contractsToUnbind.includes(c.contract_name))
                    const someSelected = contracts.some(c => contractsToUnbind.includes(c.contract_name))
                    
                    return (
                      <Flex key={type} vertical gap={6}>
                        {/* 类型标题（可全选） */}
                        <Flex 
                          align="center" 
                          gap={8}
                          style={{ cursor: 'pointer' }}
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
                            indeterminate={someSelected && !allSelected}
                          />
                          <Tag color={typeColor} style={{ margin: 0 }}>{typeLabel}</Tag>
                        </Flex>
                        {/* 合约列表 */}
                        <Flex vertical gap={4} style={{ marginLeft: 24 }}>
                          {contracts.map(c => {
                            const isChecked = contractsToUnbind.includes(c.contract_name)
                            return (
                              <Flex 
                                key={c.contract_name}
                                align="center" 
                                gap={8}
                                style={{ 
                                  padding: '4px 8px',
                                  borderRadius: 4,
                                  background: isChecked ? 'rgba(255, 77, 79, 0.08)' : 'transparent',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                                onClick={() => {
                                  setContractsToUnbind(prev => 
                                    isChecked 
                                      ? prev.filter(n => n !== c.contract_name)
                                      : [...prev, c.contract_name]
                                  )
                                }}
                              >
                                <Checkbox checked={isChecked} />
                                <Text style={{ flex: 1 }}>
                                  {c.contract_name}
                                  {c.is_primary && ' ⭐'}
                                </Text>
                                <Tooltip title={c.contract_address}>
                                  <Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>
                                    {c.contract_address.slice(0, 6)}...{c.contract_address.slice(-4)}
                                  </Text>
                                </Tooltip>
                              </Flex>
                            )
                          })}
                        </Flex>
                      </Flex>
                    )
                  })}
                </Flex>
              </Card>
            )}

            <Text>
              {t('admin.assets.bindDescription', { asset: selectedAsset.name })}
            </Text>
            
            <Select
              placeholder={t('admin.assets.selectProject')}
              loading={isLoadingProjects}
              value={selectedBindProject}
              onChange={handleSelectProject}
              style={{ width: '100%' }}
              options={availableProjects.map(p => ({
                value: p.project,
                label: (
                  <Flex justify="space-between" align="center">
                    <Text strong>{p.project}</Text>
                    <Tag color={p.project === 'common' ? 'blue' : p.project === 'mock' ? 'cyan' : 'green'}>
                      {p.contracts.filter(c => c.is_available).length}/{p.contract_count}
                    </Tag>
                  </Flex>
                )
              }))}
            />

            {selectedBindProject && (
              <Card 
                size="small" 
                title={
                  <Flex justify="space-between" align="center">
                    <span>{t('admin.assets.contractsToBindTitle')}</span>
                    <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>
                      {t('admin.assets.selectedCount', { count: selectedContracts.length })}
                    </Text>
                  </Flex>
                }
              >
                <Flex vertical gap={8}>
                  {availableProjects
                    .find(p => p.project === selectedBindProject)
                    ?.contracts.map(contract => {
                      const isChecked = selectedContracts.includes(contract.contract_name)
                      const typeColor = contract.contract_type === 'common' ? '#1890ff' 
                        : contract.contract_type === 'mock' ? '#13c2c2' 
                        : '#52c41a'
                      
                      return (
                        <Flex 
                          key={contract.contract_name} 
                          align="center" 
                          gap={12}
                          style={{ 
                            padding: '8px 12px',
                            borderRadius: 6,
                            background: isChecked ? 'rgba(0, 212, 170, 0.08)' : 'rgba(0, 0, 0, 0.02)',
                            border: `1px solid ${isChecked ? 'rgba(0, 212, 170, 0.3)' : 'rgba(0, 0, 0, 0.06)'}`,
                            cursor: contract.is_available ? 'pointer' : 'not-allowed',
                            opacity: contract.is_available ? 1 : 0.5,
                            transition: 'all 0.2s'
                          }}
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
                          <Flex vertical style={{ flex: 1 }}>
                            <Flex align="center" gap={8}>
                              <Text strong style={{ color: contract.is_available ? undefined : 'rgba(0,0,0,0.25)' }}>
                                {contract.contract_name}
                              </Text>
                              <Tag 
                                color={typeColor} 
                                style={{ margin: 0, fontSize: 10, padding: '0 4px', lineHeight: '16px' }}
                              >
                                {contract.contract_type}
                              </Tag>
                            </Flex>
                            {!contract.is_available && contract.bound_to_asset && (
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                {t('admin.assets.boundTo', { asset: contract.bound_to_asset })}
                              </Text>
                            )}
                          </Flex>
                          <Tooltip title={contract.contract_address}>
                            <Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>
                              {contract.contract_address.slice(0, 6)}...{contract.contract_address.slice(-4)}
                            </Text>
                          </Tooltip>
                        </Flex>
                      )
                    })
                  }
                </Flex>
              </Card>
            )}
          </Flex>
        )}
      </Modal>

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
