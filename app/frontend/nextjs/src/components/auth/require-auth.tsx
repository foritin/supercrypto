'use client'
/**
 * RequireAuth Component
 * 通用权限守卫组件
 * 
 * 功能：
 * - 在权限验证完成前显示加载状态，避免闪烁
 * - 支持多种权限检查：钱包连接、KYC状态、管理员权限
 * - 支持自定义权限检查函数
 * - 未授权时显示友好的提示
 * - 避免 SSR hydration 不匹配
 * - 监听 auth:logout 事件，处理强制退出（Token过期、被管理员踢出）
 * 
 * 用法：
 * - <RequireAuth wallet>...</RequireAuth>           // 仅需钱包连接
 * - <RequireAuth wallet kyc>...</RequireAuth>       // 需钱包 + KYC通过
 * - <RequireAuth wallet admin>...</RequireAuth>     // 需钱包 + 管理员权限
 * - <RequireAuth check={() => someCondition}>...</RequireAuth> // 自定义检查
 */
import { ReactNode, useEffect, useState, useMemo, useCallback } from 'react'
import { Spin, Result, Button, Skeleton, message } from 'antd'
import { LoadingOutlined, LockOutlined, WalletOutlined, SafetyOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { useCurrentUser, useKycStatus } from '@/hooks'
import { KycStatus } from '@/services/kyc'

/** 权限检查结果 */
interface AuthCheckResult {
  passed: boolean
  reason?: 'wallet' | 'kyc' | 'admin' | 'custom'
  message?: string
}

interface RequireAuthProps {
  children: ReactNode
  
  /** 需要连接钱包 */
  wallet?: boolean
  
  /** 需要 KYC 通过 */
  kyc?: boolean
  
  /** 需要管理员权限 */
  admin?: boolean
  
  /** 自定义权限检查函数 */
  check?: () => boolean | AuthCheckResult
  
  /** 自定义加载中渲染 */
  loadingRender?: ReactNode
  
  /** 自定义拒绝访问渲染 */
  fallbackRender?: (reason: AuthCheckResult['reason']) => ReactNode
  
  /** 验证失败后的重定向路径 */
  redirectTo?: string
}

/**
 * 全局 auth:logout 事件监听 Hook
 * 处理 Token 过期、被管理员踢出等强制退出场景
 */
function useAuthLogoutListener() {
  const { t } = useTranslation()
  const router = useRouter()
  
  const handleLogout = useCallback((event: CustomEvent<{ message?: string }>) => {
    const logoutMessage = event.detail?.message || t('auth.sessionExpired')
    message.warning(logoutMessage)
    
    // 跳转到首页
    if (window.location.pathname !== '/') {
      router.push('/')
    }
  }, [t, router])
  
  useEffect(() => {
    // 监听 auth:logout 事件（由 api.ts 的 401 拦截器触发）
    window.addEventListener('auth:logout', handleLogout as EventListener)
    
    return () => {
      window.removeEventListener('auth:logout', handleLogout as EventListener)
    }
  }, [handleLogout])
}

export function RequireAuth({ 
  children, 
  wallet = false,
  kyc = false,
  admin = false,
  check,
  loadingRender,
  fallbackRender,
  redirectTo,
}: RequireAuthProps) {
  const { t } = useTranslation()
  const router = useRouter()
  
  // 监听强制退出事件
  useAuthLogoutListener()
  
  // 用于避免 hydration 不匹配 - 服务端和客户端初始渲染保持一致
  const [isHydrated, setIsHydrated] = useState(false)
  
  // Hooks
  const { isAdmin, isLoading: isUserLoading, isConnected, user } = useCurrentUser()
  const { status: kycStatus, isLoading: isKycLoading } = useKycStatus()
  
  // 跟踪是否完成首次加载
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false)

  // 标记客户端已经 hydrated
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // 确定需要检查哪些权限
  const needsWallet = wallet || kyc || admin
  const needsKyc = kyc
  const needsAdmin = admin
  
  // 是否正在加载
  const isLoading = useMemo(() => {
    if (needsWallet && isUserLoading) return true
    if (needsKyc && isKycLoading) return true
    if (needsAdmin && isUserLoading) return true
    return false
  }, [needsWallet, needsKyc, needsAdmin, isUserLoading, isKycLoading])

  useEffect(() => {
    // 当加载完成时标记
    if (!isLoading && (needsWallet ? isConnected : true)) {
      setHasInitiallyLoaded(true)
    }
    // 如果断开连接，重置状态
    if (needsWallet && !isConnected) {
      setHasInitiallyLoaded(false)
    }
  }, [isLoading, isConnected, needsWallet])

  // 执行权限检查
  const authResult = useMemo((): AuthCheckResult => {
    // 1. 钱包检查
    if (needsWallet && !isConnected) {
      return { passed: false, reason: 'wallet' }
    }
    
    // 2. KYC 检查
    if (needsKyc && kycStatus !== KycStatus.APPROVED) {
      return { passed: false, reason: 'kyc' }
    }
    
    // 3. 管理员检查
    if (needsAdmin && !isAdmin) {
      return { passed: false, reason: 'admin' }
    }
    
    // 4. 自定义检查
    if (check) {
      const result = check()
      if (typeof result === 'boolean') {
        return { passed: result, reason: result ? undefined : 'custom' }
      }
      return result
    }
    
    return { passed: true }
  }, [needsWallet, needsKyc, needsAdmin, isConnected, kycStatus, isAdmin, check])

  // 处理重定向
  useEffect(() => {
    if (hasInitiallyLoaded && !authResult.passed && redirectTo) {
      router.push(redirectTo)
    }
  }, [hasInitiallyLoaded, authResult.passed, redirectTo, router])

  // 渲染加载状态消息
  const getLoadingMessage = () => {
    if (needsAdmin) return t('auth.verifyingAdmin')
    if (needsKyc) return t('auth.verifyingKyc')
    if (needsWallet) return t('auth.verifyingWallet')
    return t('auth.verifying')
  }

  // 渲染默认的拒绝访问组件
  const renderDefaultFallback = (reason: AuthCheckResult['reason']) => {
    const goHome = () => router.push('/')
    
    switch (reason) {
      case 'wallet':
        return (
          <div style={{ maxWidth: 600, margin: '80px auto', padding: '0 24px' }}>
            <Result
              icon={<WalletOutlined style={{ color: '#00D4AA' }} />}
              title={t('auth.walletRequired')}
              subTitle={t('auth.walletRequiredDescription')}
              extra={
                <Button type="primary" onClick={goHome}>
                  {t('common.backToHome')}
                </Button>
              }
            />
          </div>
        )
      
      case 'kyc':
        return (
          <div style={{ maxWidth: 600, margin: '80px auto', padding: '0 24px' }}>
            <Result
              icon={<SafetyOutlined style={{ color: '#faad14' }} />}
              title={t('auth.kycRequired')}
              subTitle={t('auth.kycRequiredDescription')}
              extra={
                <Button type="primary" onClick={() => router.push('/kyc')}>
                  {t('auth.goToKyc')}
                </Button>
              }
            />
          </div>
        )
      
      case 'admin':
        return (
          <div style={{ maxWidth: 600, margin: '80px auto', padding: '0 24px' }}>
            <Result
              status="403"
              icon={<LockOutlined style={{ color: '#ff4d4f' }} />}
              title={t('auth.adminRequired')}
              subTitle={t('auth.adminRequiredDescription')}
              extra={
                <Button type="primary" onClick={goHome}>
                  {t('common.backToHome')}
                </Button>
              }
            />
          </div>
        )
      
      default:
        return (
          <div style={{ maxWidth: 600, margin: '80px auto', padding: '0 24px' }}>
            <Result
              status="403"
              title={t('auth.accessDenied')}
              subTitle={authResult.message || t('auth.accessDeniedDescription')}
              extra={
                <Button type="primary" onClick={goHome}>
                  {t('common.backToHome')}
                </Button>
              }
            />
          </div>
        )
    }
  }

  // 0. 在 hydration 完成前显示骨架屏，避免服务端/客户端不匹配
  if (!isHydrated) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: 400,
        flexDirection: 'column',
        gap: 16,
      }}>
        <Skeleton.Avatar active size={48} />
        <Skeleton.Input active style={{ width: 200 }} />
      </div>
    )
  }

  // 1. 正在加载（包括首次加载）
  if (isLoading || (needsWallet && !hasInitiallyLoaded && isConnected)) {
    return loadingRender ?? (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: 400,
        flexDirection: 'column',
        gap: 16,
      }}>
        <Spin 
          indicator={<LoadingOutlined style={{ fontSize: 32, color: '#00D4AA' }} spin />} 
        />
        <span style={{ color: 'rgba(255, 255, 255, 0.45)' }}>
          {getLoadingMessage()}
        </span>
      </div>
    )
  }

  // 2. 权限检查未通过
  if (!authResult.passed) {
    if (redirectTo) {
      // 重定向中，显示加载
      return loadingRender ?? (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: 400,
        }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} />
        </div>
      )
    }
    
    return fallbackRender 
      ? fallbackRender(authResult.reason) 
      : renderDefaultFallback(authResult.reason)
  }

  // 3. 验证通过，渲染子组件
  return <>{children}</>
}

/**
 * 便捷组件：需要管理员权限
 */
export function RequireAdmin({ children, ...props }: Omit<RequireAuthProps, 'wallet' | 'admin'>) {
  return (
    <RequireAuth wallet admin {...props}>
      {children}
    </RequireAuth>
  )
}

/**
 * 便捷组件：需要 KYC 通过
 */
export function RequireKyc({ children, ...props }: Omit<RequireAuthProps, 'wallet' | 'kyc'>) {
  return (
    <RequireAuth wallet kyc {...props}>
      {children}
    </RequireAuth>
  )
}

/**
 * 便捷组件：需要钱包连接
 */
export function RequireWallet({ children, ...props }: Omit<RequireAuthProps, 'wallet'>) {
  return (
    <RequireAuth wallet {...props}>
      {children}
    </RequireAuth>
  )
}
