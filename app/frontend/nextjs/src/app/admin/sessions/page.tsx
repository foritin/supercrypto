'use client'

/**
 * Admin Sessions Page
 * 管理员会话管理页面 - 查看活跃用户、强制下线
 */

import { useState } from 'react'
import { Table, Card, Input, Button, Space, Modal, message, Tag, Tooltip } from 'antd'
import { SearchOutlined, LogoutOutlined, ReloadOutlined, UserOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { ColumnsType } from 'antd/es/table'
import { RequireAdmin } from '@/components/auth'
import { adminSessionService, UserSession } from '@/services/admin-sessions'
import { truncateAddress } from '@/utils/format'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

export default function AdminSessionsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  
  // 获取会话列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-sessions', page, pageSize, search],
    queryFn: () => adminSessionService.listActiveSessions({
      page,
      page_size: pageSize,
      search: search || undefined,
    }),
  })
  
  // 强制下线
  const revokeMutation = useMutation({
    mutationFn: adminSessionService.revokeUserSession,
    onSuccess: (result) => {
      message.success(result.msg || '用户已强制下线')
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] })
    },
    onError: () => {
      message.error('操作失败')
    },
  })
  
  // 搜索
  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
  }
  
  // 强制下线确认
  const handleRevoke = (session: UserSession) => {
    Modal.confirm({
      title: '确认强制下线',
      content: (
        <div>
          <p>确定要强制下线用户 <strong>{truncateAddress(session.wallet_address)}</strong> 吗？</p>
          <p style={{ color: 'rgba(255, 255, 255, 0.45)', marginTop: 8 }}>
            该用户的所有会话将被撤销，需要重新连接钱包登录。
          </p>
        </div>
      ),
      okText: '确认下线',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => revokeMutation.mutate(session.wallet_address),
    })
  }
  
  // 解析 User Agent 获取浏览器信息
  const parseUserAgent = (ua: string): string => {
    if (!ua) return '-'
    if (ua.includes('Chrome')) return 'Chrome'
    if (ua.includes('Firefox')) return 'Firefox'
    if (ua.includes('Safari')) return 'Safari'
    if (ua.includes('Edge')) return 'Edge'
    return 'Unknown'
  }
  
  // 表格列定义
  const columns: ColumnsType<UserSession> = [
    {
      title: '钱包地址',
      dataIndex: 'wallet_address',
      key: 'wallet_address',
      width: 180,
      render: (address: string) => (
        <Tooltip title={address}>
          <span style={{ fontFamily: 'monospace', color: '#00D4AA' }}>
            {truncateAddress(address)}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '登录时间',
      dataIndex: 'login_at',
      key: 'login_at',
      width: 180,
      render: (time: string) => (
        <Tooltip title={dayjs(time).format('YYYY-MM-DD HH:mm:ss')}>
          {dayjs(time).format('MM-DD HH:mm')}
        </Tooltip>
      ),
    },
    {
      title: '最后活跃',
      dataIndex: 'last_active_at',
      key: 'last_active_at',
      width: 150,
      render: (time: string) => (
        <Tag color="green">{dayjs(time).fromNow()}</Tag>
      ),
    },
    {
      title: 'IP 地址',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: 140,
      render: (ip: string) => ip || '-',
    },
    {
      title: '浏览器',
      dataIndex: 'user_agent',
      key: 'user_agent',
      width: 100,
      render: (ua: string) => parseUserAgent(ua),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_: unknown, record: UserSession) => (
        <Button
          danger
          size="small"
          icon={<LogoutOutlined />}
          onClick={() => handleRevoke(record)}
          loading={revokeMutation.isPending}
        >
          强制下线
        </Button>
      ),
    },
  ]
  
  return (
    <RequireAdmin>
      <div style={{ padding: 24 }}>
        <Card
          title={
            <Space>
              <UserOutlined />
              <span>活跃用户会话</span>
              {data?.pagination && (
                <Tag color="blue">{data.pagination.total} 个活跃会话</Tag>
              )}
            </Space>
          }
          extra={
            <Space>
              <Input
                placeholder="搜索钱包地址"
                prefix={<SearchOutlined />}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onPressEnter={handleSearch}
                style={{ width: 240 }}
                allowClear
              />
              <Button onClick={handleSearch}>
                搜索
              </Button>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={() => refetch()}
                loading={isLoading}
              >
                刷新
              </Button>
            </Space>
          }
          styles={{
            header: {
              background: 'rgba(0, 0, 0, 0.2)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            },
            body: {
              padding: 0,
            },
          }}
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <Table
            columns={columns}
            dataSource={data?.list_data || []}
            loading={isLoading}
            rowKey="session_id"
            scroll={{ x: 900 }}
            pagination={{
              current: page,
              total: data?.pagination?.total || 0,
              pageSize: pageSize,
              onChange: (p) => setPage(p),
              showSizeChanger: false,
              showTotal: (total) => `共 ${total} 条`,
            }}
            style={{
              background: 'transparent',
            }}
          />
        </Card>
        
        {/* 说明 */}
        <Card
          size="small"
          style={{
            marginTop: 16,
            background: 'rgba(255, 193, 7, 0.1)',
            border: '1px solid rgba(255, 193, 7, 0.3)',
          }}
        >
          <div style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: 13 }}>
            <strong style={{ color: '#ffc107' }}>⚠️ 注意事项：</strong>
            <ul style={{ marginTop: 8, paddingLeft: 20 }}>
              <li>强制下线会撤销用户的所有登录会话</li>
              <li>被下线的用户下次请求会收到 401 错误，需要重新连接钱包登录</li>
              <li>此操作会记录到审计日志</li>
            </ul>
          </div>
        </Card>
      </div>
    </RequireAdmin>
  )
}

