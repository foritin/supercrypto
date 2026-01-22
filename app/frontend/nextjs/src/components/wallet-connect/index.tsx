'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useDisconnect, useSignMessage } from 'wagmi'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ChevronDown, Loader2 } from 'lucide-react'
import { supportedChains } from '@/config/wagmi'
import { truncateAddress } from '@/utils/format'
import { clearAuthData, setWalletConnected, setWalletAddress, hasJwtToken, getAddressFromToken } from '@/utils/auth'
import { logout, login } from '@/services/auth'
import { userService } from '@/services/user'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

// 签名登录的固定消息
const SIGN_MESSAGE = 'SlimCryptoAccess'

/**
 * WalletConnect Component
 * 
 * Uses RainbowKit's ConnectButton with custom rendering to:
 * - Display wallet address and balance (Requirement 7.2)
 * - Handle account switching events (Requirement 7.3)
 * - Handle network switching events (Requirement 7.4)
 * - Preserve signature authentication flow (Requirement 7.5)
 * - Support multiple wallets via RainbowKit (Requirement 7.7)
 * - Clear authentication state on disconnect (Requirement 7.8)
 */
export function WalletConnect() {
  const { t } = useTranslation()
  const { address, isConnected, chain } = useAccount()
  const { disconnect } = useDisconnect()
  const { signMessageAsync, isPending: isSigning } = useSignMessage()
  
  // 用于避免 hydration 不匹配 - 服务端和客户端初始渲染保持一致
  const [isHydrated, setIsHydrated] = useState(false)
  // 登录中状态
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  // 是否已认证（有有效的 JWT）
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  // 当前用户信息（从 /api/v1/user/auth/me 获取）
  const [currentUser, setCurrentUser] = useState<{ is_admin: boolean; tag: string | null; kyc_status: string | null } | null>(null)
  
  // Track previous address for change detection
  const previousAddressRef = useRef<string | undefined>(undefined)
  // Track previous connection state for disconnect detection
  const wasConnectedRef = useRef<boolean>(false)
  // 防止重复签名请求
  const isSigningRef = useRef<boolean>(false)

  // 标记客户端已经 hydrated
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // 检查认证状态
  const checkAuthStatus = useCallback(() => {
    if (!address) {
      setIsAuthenticated(false)
      return false
    }
    
    // 检查是否有 JWT 且地址匹配
    if (hasJwtToken()) {
      const tokenAddress = getAddressFromToken()
      if (tokenAddress && tokenAddress.toLowerCase() === address.toLowerCase()) {
        setIsAuthenticated(true)
        return true
      }
    }
    
    setIsAuthenticated(false)
    return false
  }, [address])

  // 执行签名登录 (Requirement 7.5: 保留签名认证流程)
  const performSignIn = useCallback(async () => {
    if (!address || isSigningRef.current) return

    isSigningRef.current = true
    setIsLoggingIn(true)

    try {
      // 请求用户签名
      const signature = await signMessageAsync({ message: SIGN_MESSAGE })

      // 调用后端登录接口（传递当前网络信息）
      await login(address, signature, chain?.id, chain?.name)

      // 登录成功后，调用 /api/v1/user/auth/me 获取用户信息
      const user = await userService.getCurrentUser()
      if (user) {
        setCurrentUser({
          is_admin: user.is_admin,
          tag: user.tag,
          kyc_status: user.kyc_status,
        })
        setIsAuthenticated(true)
        // 触发自定义事件，通知其他组件（如 Header）刷新用户信息
        window.dispatchEvent(new CustomEvent('supercrypto-login-success'))
        toast.success(t('wallet.loginSuccess'))
      } else {
        // 登录成功但获取用户信息失败
        setIsAuthenticated(false)
        toast.error(t('wallet.error.loginFailed'))
      }
    } catch (error) {
      // 用户拒绝签名或登录失败
      const err = error as { code?: number; message?: string }
      if (err.code === 4001 || err.message?.includes('rejected')) {
        toast.warning(t('wallet.error.signRejected'))
      } else {
        toast.error(t('wallet.error.loginFailed'))
        console.error('Login failed:', error)
      }
      // 登录失败时断开钱包连接
      disconnect()
      setIsAuthenticated(false)
      setCurrentUser(null)
    } finally {
      setIsLoggingIn(false)
      isSigningRef.current = false
    }
  }, [address, chain?.id, chain?.name, signMessageAsync, disconnect, t])

  // 钱包连接后自动签名登录
  useEffect(() => {
    if (isConnected && address && isHydrated) {
      setWalletConnected(true)
      setWalletAddress(address)
      wasConnectedRef.current = true
      
      // 检查是否需要签名登录
      if (!checkAuthStatus()) {
        // 没有有效 JWT，触发签名登录
        performSignIn()
      }
    } else if (!isConnected && wasConnectedRef.current) {
      // MetaMask 断开连接 - 通知后端并清理本地数据 (Requirement 7.8)
      logout().catch(() => {
        console.warn('Failed to notify backend of disconnect')
      })
      wasConnectedRef.current = false
      setIsAuthenticated(false)
      setCurrentUser(null)
    }
  }, [isConnected, address, isHydrated, checkAuthStatus, performSignIn])

  // Detect account changes (Requirement 7.3) - 切换账户时重新签名登录
  useEffect(() => {
    const previousAddress = previousAddressRef.current

    // Only handle account changes (not initial connection or disconnect)
    if (previousAddress && address && previousAddress !== address) {
      // Clear auth data when account changes (JWT is tied to specific address)
      clearAuthData()
      setIsAuthenticated(false)
      setCurrentUser(null)

      // Notify user of account change
      toast.info(t('wallet.accountChanged', {
        from: truncateAddress(previousAddress),
        to: truncateAddress(address)
      }))

      // 触发新账户的签名登录
      performSignIn()
    }

    // Update ref for next comparison
    previousAddressRef.current = address
  }, [address, t, performSignIn])

  // Get localized network name
  const getNetworkName = (chainId: number | undefined): string => {
    if (!chainId) return 'Unknown'
    switch (chainId) {
      case 1:
        return t('wallet.network.mainnet')
      case 11155111:
        return t('wallet.network.sepolia')
      case 31337:
        return t('wallet.network.localhost')
      default:
        return chain?.name || 'Unknown'
    }
  }

  // Handle disconnect - notify backend and clear local data (Requirement 7.8)
  async function handleDisconnect() {
    try {
      // 通知后端清理 session
      await logout()
    } catch {
      // 即使后端通知失败也继续断开
      console.warn('Failed to notify backend of logout')
    }
    
    // Disconnect wallet via wagmi
    disconnect()
    toast.success(t('wallet.disconnected'))
  }

  // 在 hydration 完成前显示骨架按钮，避免服务端/客户端不匹配
  if (!isHydrated) {
    return (
      <Skeleton className="w-[120px] h-10 rounded-[10px]" />
    )
  }

  // 正在签名/登录中的状态
  const isSigningOrLoggingIn = isSigning || isLoggingIn

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain: currentChain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        // Note: If your app doesn't use authentication, you
        // can remove all 'authenticationStatus' checks
        const ready = mounted && authenticationStatus !== 'loading'
        const connected =
          ready &&
          account &&
          currentChain &&
          (!authenticationStatus || authenticationStatus === 'authenticated')

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              // Not connected state - show connect button
              // 🎨 Style variants: 'outline' | 'glass' | 'minimal'
              // Change BUTTON_STYLE to switch between designs
              const BUTTON_STYLE: 'outline' | 'glass' | 'minimal' = 'glass'
              
              if (!connected) {
                // Style configurations
                const buttonStyles = {
                  // 描边风格 - 透明背景 + 边框
                  outline: {
                    className: cn(
                      "group relative flex items-center justify-center gap-3 px-7 py-3 rounded-full",
                      "font-semibold text-[15px] tracking-wide",
                      "border-2 border-[#00D4AA] text-[#00D4AA]",
                      "bg-transparent hover:bg-[#00D4AA]/10",
                      "transition-all duration-300",
                      "hover:shadow-[0_0_25px_rgba(0,212,170,0.4)]",
                      "active:scale-[0.98]",
                      "focus:outline-none focus:ring-2 focus:ring-[#00D4AA]/50 focus:ring-offset-2 focus:ring-offset-[#0a0f0d]"
                    ),
                    style: {}
                  },
                  // 玻璃效果 - 毛玻璃 + 半透明（无边框）
                  glass: {
                    className: cn(
                      "group relative flex items-center justify-center gap-3 px-7 py-3 rounded-full",
                      "font-semibold text-[15px] tracking-wide",
                      "backdrop-blur-md bg-[#00D4AA]/15",
                      "text-[#00D4AA]",
                      "transition-all duration-300",
                      "hover:bg-[#00D4AA]/25",
                      "hover:shadow-[0_0_25px_rgba(0,212,170,0.3)]",
                      "active:scale-[0.98]",
                      "focus:outline-none focus:ring-2 focus:ring-[#00D4AA]/50"
                    ),
                    style: {}
                  },
                  // 极简风格 - 纯文字
                  minimal: {
                    className: cn(
                      "group flex items-center gap-2 px-4 h-10 rounded-lg",
                      "font-medium text-[14px]",
                      "text-[#00D4AA]",
                      "transition-all duration-200",
                      "hover:bg-[#00D4AA]/10",
                      "active:bg-[#00D4AA]/15",
                      "focus:outline-none focus:ring-2 focus:ring-[#00D4AA]/50"
                    ),
                    style: {}
                  }
                }
                
                const currentStyle = buttonStyles[BUTTON_STYLE]
                
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    aria-label={t('wallet.connect')}
                    className={currentStyle.className}
                    style={currentStyle.style}
                  >
                    {/* Wallet icon */}
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
                      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
                    </svg>
                    <span>{t('wallet.connect')}</span>
                  </button>
                )
              }

              // Connected but signing/logging in
              if (isSigningOrLoggingIn) {
                return (
                  <button
                    type="button"
                    disabled
                    className={cn(
                      "flex items-center gap-2 px-4 h-10 rounded-[10px]",
                      "bg-warning/10 border border-warning/30",
                      "cursor-not-allowed"
                    )}
                  >
                    <Loader2 
                      className="w-4 h-4 animate-spin text-warning" 
                      aria-hidden="true" 
                    />
                    <span className="text-warning">
                      {isSigning ? t('wallet.signing') : t('wallet.loggingIn')}
                    </span>
                  </button>
                )
              }

              // Wrong network - show chain switcher (Requirement 7.4)
              if (currentChain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className={cn(
                      "flex items-center gap-2 px-4 h-10 rounded-[10px]",
                      "bg-destructive/10 border border-destructive/30",
                      "text-destructive hover:bg-destructive/20 transition-colors"
                    )}
                  >
                    Wrong network
                    <ChevronDown className="w-3 h-3" aria-hidden="true" />
                  </button>
                )
              }

              // Connected and authenticated state (Requirement 7.2: 显示钱包地址和余额)
              // 极简设计 - 无边框，纯文字
              return (
                <div className="flex items-center gap-3">
                  {/* 网络按钮 - 圆形图标 */}
                  <button
                    onClick={openChainModal}
                    type="button"
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full",
                      "hover:bg-white/10",
                      "transition-all duration-200"
                    )}
                    title={t('wallet.switchNetwork')}
                  >
                    {currentChain.hasIcon && currentChain.iconUrl ? (
                      <img
                        alt={currentChain.name ?? 'Chain icon'}
                        src={currentChain.iconUrl}
                        className="w-5 h-5 rounded-full"
                      />
                    ) : (
                      <span className="text-xs font-bold text-white/70">
                        {currentChain.name?.charAt(0) || '?'}
                      </span>
                    )}
                  </button>

                  {/* 地址按钮 - 纯文字无边框 */}
                  <button
                    onClick={openAccountModal}
                    type="button"
                    className={cn(
                      "group flex items-center gap-2",
                      "hover:opacity-80",
                      "transition-all duration-200"
                    )}
                  >
                    {/* 状态指示器 */}
                    <span 
                      className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        isAuthenticated ? "bg-[#00D4AA]" : "bg-amber-400",
                        isAuthenticated 
                          ? "shadow-[0_0_6px_rgba(0,212,170,0.6)]" 
                          : "shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                      )}
                    />

                    {/* 地址显示 */}
                    <span className="text-sm font-medium text-white/90">
                      {account.displayName}
                    </span>

                    {/* 下拉箭头 */}
                    <ChevronDown 
                      className="w-3.5 h-3.5 text-white/40 group-hover:text-white/60 transition-colors" 
                      aria-hidden="true" 
                    />
                  </button>
                </div>
              )
            })()}
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}
