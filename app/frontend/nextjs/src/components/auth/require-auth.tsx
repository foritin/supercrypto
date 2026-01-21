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
import { Loader2, Lock, Wallet, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { notification } from '@/lib/notification'
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
    notification.warning(logoutMessage)
    
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
          <div className="min-h-[80vh] flex items-center justify-center p-6 md:p-10 relative overflow-hidden">
            {/* 背景装饰 */}
            <div 
              className="absolute top-[10%] left-[10%] w-[400px] h-[400px] rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(circle, rgba(0, 212, 170, 0.08) 0%, transparent 70%)',
                filter: 'blur(60px)',
              }}
            />
            <div 
              className="absolute bottom-[20%] right-[15%] w-[300px] h-[300px] rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(circle, rgba(255, 215, 0, 0.06) 0%, transparent 70%)',
                filter: 'blur(60px)',
              }}
            />
            
            {/* 主内容卡片 */}
            <div className="glass-card-enhanced max-w-[480px] w-full p-10 md:p-12 text-center relative z-10">
              {/* 图标容器 */}
              <div className="icon-box icon-box-primary w-[88px] h-[88px] mx-auto mb-7 flex items-center justify-center">
                <Wallet className="w-11 h-11 text-primary" aria-hidden="true" />
              </div>
              
              {/* 标题 */}
              <h2 className="text-[28px] font-bold text-white mb-3 tracking-tight">
                {t('auth.walletRequired')}
              </h2>
              
              {/* 描述 */}
              <p className="text-base text-white/65 mb-8 leading-relaxed">
                {t('auth.walletRequiredDescription')}
              </p>
              
              {/* 按钮 */}
              <Button 
                size="lg"
                onClick={goHome}
                className="h-[52px] px-10 text-base font-semibold rounded-xl"
              >
                {t('common.backToHome')}
              </Button>
            </div>
          </div>
        )
      
      case 'kyc':
        return (
          <div className="min-h-[80vh] flex items-center justify-center p-6 md:p-10 relative overflow-hidden">
            {/* 背景装饰 */}
            <div 
              className="absolute top-[15%] right-[10%] w-[350px] h-[350px] rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(circle, rgba(250, 173, 20, 0.08) 0%, transparent 70%)',
                filter: 'blur(60px)',
              }}
            />
            <div 
              className="absolute bottom-[15%] left-[15%] w-[280px] h-[280px] rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(circle, rgba(0, 212, 170, 0.06) 0%, transparent 70%)',
                filter: 'blur(60px)',
              }}
            />
            
            {/* 主内容卡片 */}
            <div className="glass-card-enhanced max-w-[480px] w-full p-10 md:p-12 text-center relative z-10">
              {/* 图标容器 */}
              <div className="icon-box icon-box-gold w-[88px] h-[88px] mx-auto mb-7 flex items-center justify-center">
                <ShieldCheck className="w-11 h-11 text-[#FFD700]" aria-hidden="true" />
              </div>
              
              {/* 标题 */}
              <h2 className="text-[28px] font-bold text-white mb-3 tracking-tight">
                {t('auth.kycRequired')}
              </h2>
              
              {/* 描述 */}
              <p className="text-base text-white/65 mb-8 leading-relaxed">
                {t('auth.kycRequiredDescription')}
              </p>
              
              {/* 按钮 */}
              <Button 
                size="lg"
                onClick={() => router.push('/kyc')}
                className="h-[52px] px-10 text-base font-semibold rounded-xl"
              >
                {t('auth.goToKyc')}
              </Button>
            </div>
          </div>
        )
      
      case 'admin':
        return (
          <div className="min-h-[80vh] flex items-center justify-center p-6 md:p-10 relative overflow-hidden">
            {/* 背景装饰 */}
            <div 
              className="absolute top-[20%] left-[20%] w-[320px] h-[320px] rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(circle, rgba(255, 77, 79, 0.08) 0%, transparent 70%)',
                filter: 'blur(60px)',
              }}
            />
            <div 
              className="absolute bottom-[10%] right-[20%] w-[260px] h-[260px] rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(circle, rgba(24, 144, 255, 0.06) 0%, transparent 70%)',
                filter: 'blur(60px)',
              }}
            />
            
            {/* 主内容卡片 */}
            <div className="glass-card-enhanced max-w-[480px] w-full p-10 md:p-12 text-center relative z-10">
              {/* 图标容器 */}
              <div 
                className="w-[88px] h-[88px] mx-auto mb-7 flex items-center justify-center rounded-[20px] transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 77, 79, 0.15) 0%, rgba(255, 77, 79, 0.05) 100%)',
                  border: '1px solid rgba(255, 77, 79, 0.3)',
                }}
              >
                <Lock className="w-11 h-11 text-[#ff4d4f]" aria-hidden="true" />
              </div>
              
              {/* 标题 */}
              <h2 className="text-[28px] font-bold text-white mb-3 tracking-tight">
                {t('auth.adminRequired')}
              </h2>
              
              {/* 描述 */}
              <p className="text-base text-white/65 mb-8 leading-relaxed">
                {t('auth.adminRequiredDescription')}
              </p>
              
              {/* 按钮 */}
              <Button 
                size="lg"
                onClick={goHome}
                className="h-[52px] px-10 text-base font-semibold rounded-xl"
              >
                {t('common.backToHome')}
              </Button>
            </div>
          </div>
        )
      
      default:
        return (
          <div className="min-h-[80vh] flex items-center justify-center p-6 md:p-10 relative overflow-hidden">
            {/* 背景装饰 */}
            <div 
              className="absolute top-[15%] left-[15%] w-[300px] h-[300px] rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(circle, rgba(24, 144, 255, 0.08) 0%, transparent 70%)',
                filter: 'blur(60px)',
              }}
            />
            
            {/* 主内容卡片 */}
            <div className="glass-card-enhanced max-w-[480px] w-full p-10 md:p-12 text-center relative z-10">
              {/* 图标容器 */}
              <div className="icon-box icon-box-blue w-[88px] h-[88px] mx-auto mb-7 flex items-center justify-center">
                <Lock className="w-11 h-11 text-[#1890ff]" aria-hidden="true" />
              </div>
              
              {/* 标题 */}
              <h2 className="text-[28px] font-bold text-white mb-3 tracking-tight">
                {t('auth.accessDenied')}
              </h2>
              
              {/* 描述 */}
              <p className="text-base text-white/65 mb-8 leading-relaxed">
                {authResult.message || t('auth.accessDeniedDescription')}
              </p>
              
              {/* 按钮 */}
              <Button 
                size="lg"
                onClick={goHome}
                className="h-[52px] px-10 text-base font-semibold rounded-xl"
              >
                {t('common.backToHome')}
              </Button>
            </div>
          </div>
        )
    }
  }

  // 0. 在 hydration 完成前显示骨架屏，避免服务端/客户端不匹配
  if (!isHydrated) {
    return (
      <div className="flex justify-center items-center min-h-[400px] flex-col gap-4">
        <Skeleton className="w-12 h-12 rounded-full" />
        <Skeleton className="w-[200px] h-4" />
      </div>
    )
  }

  // 1. 正在加载（包括首次加载）
  if (isLoading || (needsWallet && !hasInitiallyLoaded && isConnected)) {
    return loadingRender ?? (
      <div className="flex justify-center items-center min-h-[400px] flex-col gap-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" aria-hidden="true" />
        <span className="text-white/45">
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
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin" aria-hidden="true" />
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
