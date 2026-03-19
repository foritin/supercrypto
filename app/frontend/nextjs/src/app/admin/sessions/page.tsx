'use client'

/**
 * Admin Sessions Page
 * 管理员会话管理页面 - 查看活跃用户、强制下线
 * 
 * 已迁移到 shadcn/ui 组件:
 * - Table -> DataTable
 * - Card -> shadcn/ui Card
 * - Input -> shadcn/ui Input
 * - Button -> shadcn/ui Button
 * - Modal.confirm -> AlertDialog
 * - message -> sonner notification
 * - Tag -> Badge
 * - Tooltip -> shadcn/ui Tooltip
 * - @ant-design/icons -> lucide-react
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { format, formatDistanceToNow } from 'date-fns'
import { Search, LogOut, RefreshCw, User, AlertTriangle } from 'lucide-react'
import { useState } from 'react'

import { RequireAdmin } from '@/components/auth'
import { AdminLayout, AdminPageHeader, AdminCard } from '@/components/layout/admin-layout'
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
import { GlowStatusBadge } from '@/components/ui/glow-status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { notification } from '@/lib/notification'
import type { UserSession } from '@/services/admin-sessions';
import { adminSessionService } from '@/services/admin-sessions'
import { truncateAddress } from '@/utils/format'


export default function AdminSessionsPage() {
  const queryClient = useQueryClient()
  
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  
  // 强制下线确认对话框状态
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false)
  const [sessionToRevoke, setSessionToRevoke] = useState<UserSession | null>(null)
  
  // 获取会话列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-sessions', page, pageSize, search],
    queryFn: () =>
      adminSessionService.listActiveSessions({
        page,
        page_size: pageSize,
        ...(search ? { search } : {}),
      }),
  })
  
  // 强制下线
  const revokeMutation = useMutation({
    mutationFn: adminSessionService.revokeUserSession,
    onSuccess: (result) => {
      notification.success(result.msg || 'User session revoked')
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] })
      setRevokeDialogOpen(false)
      setSessionToRevoke(null)
    },
    onError: () => {
      notification.error('Operation failed')
    },
  })
  
  // 搜索
  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
  }
  
  // 打开强制下线确认对话框
  const handleRevokeClick = (session: UserSession) => {
    setSessionToRevoke(session)
    setRevokeDialogOpen(true)
  }
  
  // 确认强制下线
  const handleRevokeConfirm = () => {
    if (sessionToRevoke) {
      revokeMutation.mutate(sessionToRevoke.wallet_address)
    }
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
  const columns: ColumnDef<UserSession>[] = [
    {
      accessorKey: 'wallet_address',
      header: 'Wallet Address',
      size: 180,
      cell: ({ row }) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="font-mono text-primary cursor-default">
                {truncateAddress(row.original.wallet_address)}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{row.original.wallet_address}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
    {
      accessorKey: 'login_at',
      header: 'Login Time',
      size: 180,
      cell: ({ row }) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-default">
                {format(new Date(row.original.login_at), 'MM-dd HH:mm')}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{format(new Date(row.original.login_at), 'yyyy-MM-dd HH:mm:ss')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
    {
      accessorKey: 'last_active_at',
      header: 'Last Active',
      size: 150,
      cell: ({ row }) => (
        <GlowStatusBadge variant="success" glow>
          {formatDistanceToNow(new Date(row.original.last_active_at), { addSuffix: true })}
        </GlowStatusBadge>
      ),
    },
    {
      accessorKey: 'ip_address',
      header: 'IP Address',
      size: 140,
      cell: ({ row }) => row.original.ip_address || '-',
    },
    {
      accessorKey: 'user_agent',
      header: 'Browser',
      size: 100,
      cell: ({ row }) => parseUserAgent(row.original.user_agent),
    },
    {
      id: 'actions',
      header: 'Actions',
      size: 120,
      cell: ({ row }) => (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => handleRevokeClick(row.original)}
          disabled={revokeMutation.isPending}
        >
          <LogOut className="h-4 w-4 mr-1" />
          Revoke
        </Button>
      ),
    },
  ]
  
  // 计算分页信息
  const totalItems = data?.pagination?.total || 0
  const pageCount = Math.ceil(totalItems / pageSize)
  
  return (
    <RequireAdmin>
      <TooltipProvider>
        <AdminLayout>
          {/* 主卡片 */}
          <AdminCard>
            <Card className="bg-transparent border-0">
              <CardHeader className="border-b border-white/10 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5" />
                  <span>Active User Sessions</span>
                  {data?.pagination && (
                    <GlowStatusBadge variant="info" className="ml-2">
                      {data.pagination.total} active sessions
                    </GlowStatusBadge>
                  )}
                </CardTitle>
                
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search wallet address"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-9 w-60"
                    />
                  </div>
                  <Button variant="outline" onClick={handleSearch}>
                    Search
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => refetch()}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              <DataTable
                columns={columns}
                data={data?.list_data || []}
                loading={isLoading}
                emptyMessage="No active sessions"
                pagination={{
                  pageIndex: page - 1,
                  pageSize: pageSize,
                  pageCount: pageCount,
                  onPageChange: (newPage) => setPage(newPage + 1),
                  onPageSizeChange: () => {},
                }}
              />
              </CardContent>
            </Card>
          </AdminCard>
          
          {/* 说明卡片 */}
          <AdminCard className="mt-4">
            <Card className="bg-transparent border-0">
            <CardContent className="py-4">
              <div className="text-white/65 text-sm">
                <div className="flex items-center gap-2 text-yellow-400 font-medium mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  Notes:
                </div>
                <ul className="list-disc list-inside space-y-1 ml-6">
                  <li>Revoke will invalidate all active sessions for the user.</li>
                  <li>The user will receive 401 on next request and must reconnect the wallet.</li>
                  <li>This action is recorded in the audit logs.</li>
                </ul>
              </div>
              </CardContent>
            </Card>
          </AdminCard>
          
          {/* 强制下线确认对话框 */}
          <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Revoke Session</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div>
                    <p>
                      Are you sure you want to revoke sessions for{' '}
                      <strong className="text-primary">
                        {sessionToRevoke ? truncateAddress(sessionToRevoke.wallet_address) : ''}
                      </strong>{' '}
                      ?
                    </p>
                    <p className="text-white/45 mt-2">
                      All sessions for this user will be invalidated, and wallet reconnection will be required.
                    </p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRevokeConfirm}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={revokeMutation.isPending}
                >
                  {revokeMutation.isPending ? 'Processing...' : 'Confirm'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </AdminLayout>
      </TooltipProvider>
    </RequireAdmin>
  )
}
