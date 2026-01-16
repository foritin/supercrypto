'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button, Dropdown, Flex, Typography, Spin, message, Skeleton } from 'antd'
import { Wallet, ChevronDown, LogOut, Repeat, Loader2 } from 'lucide-react'
import { useAccount, useConnect, useDisconnect, useBalance, useSwitchChain, useSignMessage } from 'wagmi'
import { useTranslation } from 'react-i18next'
import { supportedChains } from '@/config/wagmi'
import { truncateAddress, formatTokenBalance } from '@/utils/format'
import { clearAuthData, setWalletConnected, setWalletAddress, hasJwtToken, getAddressFromToken } from '@/utils/auth'
import { logout, login } from '@/services/auth'
import { userService } from '@/services/user'
import { InstallMetaMaskModal } from '@/components/web3/install-metamask-modal'

const { Text } = Typography

// 签名登录的固定消息
const SIGN_MESSAGE = 'ApprovePlatformAccess'

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean
      _metamask?: {
        isUnlocked?: () => Promise<boolean>
      }
    }
  }
}

// Check if MetaMask is installed
function isMetaMaskInstalled(): boolean {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask === true
}

export function WalletConnect() {
  const { t } = useTranslation()
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain, isPending: isSwitching, error: switchError } = useSwitchChain()
  const { signMessageAsync, isPending: isSigning } = useSignMessage()
  const { data: balance, isLoading: isBalanceLoading } = useBalance({
    address,
  })
  
  const [showInstallModal, setShowInstallModal] = useState(false)
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

  // 执行签名登录
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
        message.success(t('wallet.loginSuccess'))
      } else {
        // 登录成功但获取用户信息失败
        setIsAuthenticated(false)
        message.error(t('wallet.error.loginFailed'))
      }
    } catch (error) {
      // 用户拒绝签名或登录失败
      const err = error as { code?: number; message?: string }
      if (err.code === 4001 || err.message?.includes('rejected')) {
        message.warning(t('wallet.error.signRejected'))
        // 用户拒绝签名，断开钱包连接
        disconnect()
      } else {
        message.error(t('wallet.error.loginFailed'))
        console.error('Login failed:', error)
      }
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
      // MetaMask 断开连接 - 通知后端并清理本地数据
      logout().catch(() => {
        console.warn('Failed to notify backend of disconnect')
      })
      wasConnectedRef.current = false
      setIsAuthenticated(false)
      setCurrentUser(null)
    }
  }, [isConnected, address, isHydrated, checkAuthStatus, performSignIn])

  // Detect account changes (Story 1.3) - 切换账户时重新签名登录
  useEffect(() => {
    const previousAddress = previousAddressRef.current

    // Only handle account changes (not initial connection or disconnect)
    if (previousAddress && address && previousAddress !== address) {
      // Clear auth data when account changes (JWT is tied to specific address)
      clearAuthData()
      setIsAuthenticated(false)
      setCurrentUser(null)

      // Notify user of account change
      message.info(t('wallet.accountChanged', {
        from: truncateAddress(previousAddress),
        to: truncateAddress(address)
      }))

      // 触发新账户的签名登录
      performSignIn()
    }

    // Update ref for next comparison
    previousAddressRef.current = address
  }, [address, t, performSignIn])

  // Handle network switch errors (Story 1.4)
  useEffect(() => {
    if (switchError) {
      // Check if user rejected the request
      const isUserRejection = 
        switchError.message?.includes('rejected') ||
        switchError.message?.includes('denied') ||
        (switchError as { code?: number }).code === 4001
      
      if (isUserRejection) {
        message.warning(t('wallet.error.userRejected'))
      } else {
        message.error(t('wallet.error.switchFailed'))
      }
    }
  }, [switchError, t])

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

  // Handle wallet connection
  async function handleConnect() {
    // Check if MetaMask is installed
    if (!isMetaMaskInstalled()) {
      setShowInstallModal(true)
      return
    }

    // Check unlock state if available
    try {
      const isUnlocked = await window.ethereum?._metamask?.isUnlocked?.()
      if (isUnlocked === false) {
        message.warning(t('wallet.error.unlockRequired'))
        return
      }
    } catch {
      // silently continue; will prompt via connect
    }

    const metaMaskConnector = connectors.find(c => c.name === 'MetaMask')
    if (metaMaskConnector) {
      connect({ connector: metaMaskConnector })
    } else {
      message.error(t('wallet.error.notInstalled'))
    }
  }

  // Handle disconnect - notify backend and clear local data
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
    message.success(t('wallet.disconnected'))
  }

  // Handle network switch
  function handleSwitchChain(chainId: number) {
    switchChain({ chainId })
  }

  // Network switch menu items
  const networkMenuItems = supportedChains.map(c => ({
    key: c.id.toString(),
    label: (
      <Flex gap={8} align="center">
        {chain?.id === c.id && <span style={{ color: '#00D4AA' }}>●</span>}
        {getNetworkName(c.id)}
      </Flex>
    ),
    onClick: () => handleSwitchChain(c.id),
    disabled: chain?.id === c.id,
  }))

  // Connected state dropdown menu items
  const connectedMenuItems = [
    {
      key: 'network',
      label: t('wallet.switchNetwork'),
      icon: <Repeat width={16} height={16} aria-hidden="true" />,
      children: networkMenuItems,
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'disconnect',
      label: t('wallet.disconnect'),
      icon: <LogOut width={16} height={16} aria-hidden="true" />,
      danger: true,
      onClick: handleDisconnect,
    },
  ]

  // 在 hydration 完成前显示骨架按钮，避免服务端/客户端不匹配
  if (!isHydrated) {
    return (
      <Skeleton.Button 
        active 
        style={{ 
          width: 120, 
          height: 40,
          borderRadius: 10,
        }} 
      />
    )
  }

  // 正在签名/登录中的状态
  const isSigningOrLoggingIn = isSigning || isLoggingIn

  // Not connected state
  if (!isConnected) {
    return (
      <>
        <Button
          type="primary"
          icon={<Wallet width={16} height={16} aria-hidden="true" />}
          onClick={handleConnect}
          loading={isConnecting}
          style={{
            borderRadius: 10,
            height: 40,
            fontWeight: 600,
          }}
        >
          {t('wallet.connect')}
        </Button>
        <InstallMetaMaskModal
          open={showInstallModal}
          onClose={() => setShowInstallModal(false)}
        />
      </>
    )
  }

  // 连接但正在签名登录中
  if (isSigningOrLoggingIn) {
    return (
      <Button
        style={{
          background: 'rgba(250, 173, 20, 0.1)',
          borderColor: 'rgba(250, 173, 20, 0.3)',
          borderRadius: 10,
          height: 40,
          padding: '0 16px',
        }}
        disabled
      >
        <Flex gap={8} align="center">
          <Loader2 width={16} height={16} className="animate-spin" style={{ color: '#faad14' }} aria-hidden="true" />
          <Text style={{ color: '#faad14' }}>
            {isSigning ? t('wallet.signing') : t('wallet.loggingIn')}
          </Text>
        </Flex>
      </Button>
    )
  }

  // Connected and authenticated state
  return (
    <Dropdown menu={{ items: connectedMenuItems }} trigger={['click']}>
      <Button
        style={{
          background: isAuthenticated ? 'rgba(0, 212, 170, 0.1)' : 'rgba(250, 173, 20, 0.1)',
          borderColor: isAuthenticated ? 'rgba(0, 212, 170, 0.3)' : 'rgba(250, 173, 20, 0.3)',
          borderRadius: 10,
          height: 40,
          padding: '0 16px',
        }}
      >
        <Flex gap={8} align="center">
          {isSwitching ? (
            <Spin size="small" />
          ) : (
            <>
              <span style={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                backgroundColor: isAuthenticated ? '#00D4AA' : '#faad14',
                display: 'inline-block',
                boxShadow: isAuthenticated 
                  ? '0 0 8px rgba(0, 212, 170, 0.5)' 
                  : '0 0 8px rgba(250, 173, 20, 0.5)',
              }} />
              <Text style={{ 
                color: 'rgba(255, 255, 255, 0.65)',
                fontSize: 12,
              }}>
                {getNetworkName(chain?.id)}
              </Text>
            </>
          )}
          <Text strong style={{ 
            color: isAuthenticated ? '#00D4AA' : '#faad14',
            fontFamily: 'monospace',
          }}>
            {truncateAddress(address || '')}
          </Text>
          {isBalanceLoading ? (
            <Spin size="small" />
          ) : (
            <Text style={{ 
              color: 'rgba(255, 255, 255, 0.45)',
              fontSize: 12,
            }}>
              {formatTokenBalance(balance?.value, balance?.decimals ?? 18)} {balance?.symbol}
            </Text>
          )}
          <ChevronDown width={10} height={10} style={{ color: 'rgba(255, 255, 255, 0.45)' }} aria-hidden="true" />
        </Flex>
      </Button>
    </Dropdown>
  )
}
