'use client'

import React, { useState, useCallback } from 'react'
import { Copy, Check, ExternalLink, LogOut, RotateCcw, ChevronDown, Wallet, Network, Shield, Hash, User, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { useEnsName, usePublicClient } from 'wagmi'
import { cn, getExplorerUrl } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
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
import { truncateAddress } from '@/utils/format'
import type { KycStatus } from './styles'

// 背景图 - NASA 地球夜景
const BACKGROUND_IMAGE_URL = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&q=80'

export interface FlipCardModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  address: string
  balance?: string
  symbol?: string
  isAuthenticated: boolean
  kycStatus?: KycStatus
  chainId?: number
  chainName?: string
  connectorName?: string
  /** 首次连接时间 */
  connectedAt?: Date
  onDisconnect: () => void
  children: React.ReactNode  // trigger element
}

/**
 * 翻转卡片式账户弹窗
 * 正面：背景图 + 地址 + KYC 斜带
 * 背面：详细信息 + 操作按钮
 */
export function FlipCardModal({
  open,
  onOpenChange,
  address,
  balance,
  symbol = 'ETH',
  isAuthenticated,
  kycStatus,
  chainId,
  chainName,
  connectorName,
  connectedAt,
  onDisconnect,
  children,
}: FlipCardModalProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [isFlipped, setIsFlipped] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false)
  const [txCount, setTxCount] = useState<number | null>(null)

  // 获取 ENS 名称（仅在主网有效）
  const { data: ensName } = useEnsName({
    address: address as `0x${string}`,
    chainId: 1, // ENS 只在主网
  })

  // 获取交易计数
  const publicClient = usePublicClient()
  React.useEffect(() => {
    if (publicClient && address && isDetailsOpen) {
      publicClient.getTransactionCount({ address: address as `0x${string}` })
        .then(count => setTxCount(count))
        .catch(() => setTxCount(null))
    }
  }, [publicClient, address, isDetailsOpen])

  // 复制地址
  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [address])

  // 区块浏览器
  const explorerUrl = chainId ? getExplorerUrl(chainId, 'address', address) : null

  // KYC 状态
  const isKycVerified = kycStatus === 'verified'
  const needsKyc = !kycStatus || kycStatus === 'pending'

  // 重置翻转状态当弹窗关闭
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setIsFlipped(false)
      setIsDetailsOpen(false)
    }
    onOpenChange(open)
  }, [onOpenChange])

  // 翻转卡片 - 先收回详情再翻转
  const handleFlip = useCallback(() => {
    if (isDetailsOpen) {
      setIsDetailsOpen(false)
      // 等待收回动画完成后再翻转
      setTimeout(() => setIsFlipped(!isFlipped), 200)
    } else {
      setIsFlipped(!isFlipped)
    }
  }, [isFlipped, isDetailsOpen])

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent 
        align="end" 
        sideOffset={8}
        className={cn(
          "w-[360px] p-0 border-0 z-[1001]",
          "bg-transparent shadow-none"
        )}
      >
        {/* 翻转卡片容器 */}
        <div 
          className="relative w-full cursor-pointer transition-all duration-300"
          style={{ 
            perspective: '1000px',
            minHeight: '220px',
          }}
          onClick={handleFlip}
        >
          <div
            className="relative w-full transition-transform duration-500"
            style={{ 
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              minHeight: '220px',
            }}
          >
            {/* ===== 正面：视觉名片 ===== */}
            <div
              className="absolute inset-0 rounded-2xl overflow-hidden border border-primary/40 shadow-[0_0_20px_rgba(0,212,170,0.15)]"
              style={{ 
                backfaceVisibility: 'hidden',
                height: '220px',
              }}
            >
              {/* 背景图 */}
              <img
                src={BACKGROUND_IMAGE_URL}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
              
              {/* 渐变遮罩 */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

              {/* KYC 斜带 */}
              <div 
                className={cn(
                  "absolute -right-8 top-5 w-32 py-1 text-center text-xs font-bold",
                  "rotate-45 shadow-lg",
                  isKycVerified 
                    ? "bg-primary text-black" 
                    : "bg-amber-400 text-black"
                )}
              >
                {isKycVerified 
                  ? t('wallet.accountModal.kycVerified') 
                  : t('wallet.accountModal.kycPending')}
              </div>

              {/* 底部信息 */}
              <div className="absolute bottom-0 left-0 right-0 p-5">
                {/* 地址行 */}
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-mono font-bold text-white tracking-wide">
                    {truncateAddress(address)}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-primary" />
                    ) : (
                      <Copy className="w-4 h-4 text-white/70" />
                    )}
                  </button>
                  {explorerUrl && (
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 text-white/70" />
                    </a>
                  )}
                </div>

                {/* 提示翻转 + 快捷登出 */}
                <div className="mt-3 flex items-center justify-between text-white/40 text-xs">
                  <div className="flex items-center gap-1.5">
                    <RotateCcw className="w-3 h-3" />
                    <span>{t('wallet.accountModal.clickToViewDetails')}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDisconnect()
                    }}
                    className="flex items-center gap-1 text-white/40 hover:text-red-400 transition-colors"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>{t('wallet.accountModal.quickLogout', 'Logout')}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ===== 背面：详细信息 ===== */}
            <div
              className={cn(
                "rounded-2xl overflow-hidden bg-bg-dark border border-primary/40 shadow-[0_0_20px_rgba(0,212,170,0.15)]",
                isFlipped && isDetailsOpen ? "relative" : "absolute inset-0"
              )}
              style={{ 
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                minHeight: '220px',
              }}
            >
              {/* 顶部装饰线 */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

              <div className="flex flex-col p-4">
                {/* 余额 - 核心信息 */}
                <div className="text-center py-3">
                  <div className="text-2xl font-bold text-white">
                    {balance || '0.00'} <span className="text-sm text-white/50">{symbol}</span>
                  </div>
                </div>

                {/* 状态标签 */}
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium",
                    isAuthenticated 
                      ? "bg-primary/15 text-primary" 
                      : "bg-amber-500/15 text-amber-400"
                  )}>
                    {isAuthenticated 
                      ? `✓ ${t('wallet.accountModal.authenticated')}` 
                      : `⚠ ${t('wallet.accountModal.notAuthenticated')}`}
                  </span>
                  {isKycVerified && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpenChange(false)
                        router.push('/kyc')
                      }}
                      className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/15 text-primary hover:bg-primary/25 transition-colors cursor-pointer"
                    >
                      ✓ KYC
                    </button>
                  )}
                </div>

                {/* KYC 引导 - 未验证时显示 */}
                {needsKyc && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenChange(false)
                      router.push('/kyc')
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-xl mb-2",
                      "bg-amber-500/10 border border-amber-500/20",
                      "text-amber-400 text-sm",
                      "hover:bg-amber-500/15 transition-colors"
                    )}
                  >
                    <span>{t('wallet.accountModal.completeKycToInvest')}</span>
                    <span>→</span>
                  </button>
                )}

                {/* 查看 KYC 状态 - 已验证时显示 */}
                {isKycVerified && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenChange(false)
                      router.push('/kyc')
                    }}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl mb-2",
                      "bg-primary/10 border border-primary/20",
                      "text-primary text-sm",
                      "hover:bg-primary/15 transition-colors"
                    )}
                  >
                    <span>{t('wallet.accountModal.viewKycStatus', 'View KYC Status')}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* 可展开的详情区域 */}
                <div className="mb-2">
                  <button 
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation()
                      setIsDetailsOpen(!isDetailsOpen)
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-xl",
                      "bg-white/5 hover:bg-white/10",
                      "text-white/60 text-sm",
                      "transition-colors"
                    )}
                  >
                    <span>{t('wallet.accountModal.detailsTitle')}</span>
                    <ChevronDown className={cn(
                      "w-4 h-4 transition-transform duration-200",
                      isDetailsOpen && "rotate-180"
                    )} />
                  </button>
                  
                  {/* 展开内容 */}
                  <div className={cn(
                    "overflow-hidden transition-all duration-200",
                    isDetailsOpen ? "max-h-80 mt-2" : "max-h-0"
                  )}>
                    <div className="space-y-2">
                      {/* ENS 名称（如果有） */}
                      {ensName && (
                        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5">
                          <div className="flex items-center gap-2 text-white/50 text-xs">
                            <User className="w-3.5 h-3.5" />
                            <span>{t('wallet.accountModal.ens')}</span>
                          </div>
                          <span className="text-white/80 text-xs font-medium">{ensName}</span>
                        </div>
                      )}
                      
                      {/* 钱包信息 */}
                      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5">
                        <div className="flex items-center gap-2 text-white/50 text-xs">
                          <Wallet className="w-3.5 h-3.5" />
                          <span>{t('wallet.accountModal.walletLabel')}</span>
                        </div>
                        <span className="text-white/80 text-xs">{connectorName || 'Unknown'}</span>
                      </div>
                      
                      {/* 网络信息 */}
                      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5">
                        <div className="flex items-center gap-2 text-white/50 text-xs">
                          <Network className="w-3.5 h-3.5" />
                          <span>{t('wallet.accountModal.networkLabel')}</span>
                        </div>
                        <span className="text-white/80 text-xs">{chainName || `Chain ${chainId}`}</span>
                      </div>

                      {/* 交易计数 */}
                      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5">
                        <div className="flex items-center gap-2 text-white/50 text-xs">
                          <Hash className="w-3.5 h-3.5" />
                          <span>{t('wallet.accountModal.txCount')}</span>
                        </div>
                        <span className="text-white/80 text-xs">
                          {txCount !== null ? txCount.toLocaleString() : '-'}
                        </span>
                      </div>

                      {/* 连接时间（如果有） */}
                      {connectedAt && (
                        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5">
                          <div className="flex items-center gap-2 text-white/50 text-xs">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{t('wallet.accountModal.connectedAt')}</span>
                          </div>
                          <span className="text-white/80 text-xs">
                            {connectedAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}

                      {/* 完整地址 */}
                      <div className="px-3 py-2 rounded-lg bg-white/5">
                        <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                          <Shield className="w-3.5 h-3.5" />
                          <span>{t('wallet.accountModal.fullAddress')}</span>
                        </div>
                        <p className="text-white/70 text-[10px] font-mono break-all leading-relaxed">
                          {address}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 底部操作 */}
                <div className="pt-3">
                  {/* 断开连接 - 二次确认 */}
                  <AlertDialog open={showDisconnectConfirm} onOpenChange={setShowDisconnectConfirm}>
                    <AlertDialogTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          "w-full flex items-center justify-center gap-2 py-2 rounded-xl",
                          "text-white/40 text-sm",
                          "hover:bg-white/5 hover:text-white/60",
                          "transition-colors"
                        )}
                      >
                        <LogOut className="w-4 h-4" />
                        {t('wallet.disconnect')}
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-[320px]">
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('wallet.accountModal.disconnectConfirmTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('wallet.accountModal.disconnectConfirmDesc')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('wallet.accountModal.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            onOpenChange(false)
                            onDisconnect()
                          }}
                          className="bg-red-500/80 hover:bg-red-500 text-white"
                        >
                          {t('wallet.accountModal.confirmDisconnect')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
