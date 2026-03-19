"use client";

/**
 * Error State Panels - Enhanced Edition
 * 各种错误状态的视觉化展示和恢复指导
 */

import { motion } from "framer-motion";
import {
  AlertTriangle,
  XCircle,
  Globe,
  Shield,
  Wallet,
  Clock,
  Ban,
  Server,
  RefreshCw,
  ArrowRight,
  LogIn,
  UserCheck,
  HelpCircle,
} from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { FailureReason, TransactionContext } from "./subscription-orchestrator";

export interface ErrorStatePanelProps {
  reason: FailureReason;
  context: TransactionContext;
  onRetry: () => void;
  onSwitchNetwork?: () => void;
  requiredChainId?: number;
  currentChainId?: number;
  maxRetries: number;
  currentRetry: number;
}

interface ErrorConfig {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  accentColor: string;
  action?: {
    label: string;
    icon: React.ElementType;
    variant?: "default" | "outline";
  };
}

export function ErrorStatePanel({
  reason,
  context,
  onRetry,
  onSwitchNetwork,
  requiredChainId,
  currentChainId,
  maxRetries,
  currentRetry,
}: ErrorStatePanelProps) {
  const { t } = useTranslation();
  const resolveNetworkName = (chainId?: number): string => getNetworkName(chainId) || t("subscription.chainWithId", { id: chainId });
  const config: ErrorConfig = useMemo(() => {
    const configs: Record<NonNullable<FailureReason>, ErrorConfig> = {
      network_mismatch: {
        icon: Globe,
        title: t("subscription.errorNetworkMismatch"),
        description: t("subscription.errorNetworkMismatchDescWithNetworks", {
          required: resolveNetworkName(requiredChainId),
          current: resolveNetworkName(currentChainId),
        }),
        color: "text-amber-400",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/30",
        accentColor: "#F59E0B",
        action: {
          label: t("subscription.switchNetwork"),
          icon: RefreshCw,
          variant: "default",
        },
      },
      jwt_expired: {
        icon: LogIn,
        title: t("subscription.errorJwtExpired"),
        description: t("subscription.errorJwtExpiredDesc"),
        color: "text-orange-400",
        bgColor: "bg-orange-500/10",
        borderColor: "border-orange-500/30",
        accentColor: "#FB923C",
        action: {
          label: t("subscription.goToLogin"),
          icon: ArrowRight,
          variant: "default",
        },
      },
      kyc_rejected: {
        icon: Shield,
        title: t("subscription.errorKycRejected"),
        description: t("subscription.errorKycRejectedDesc"),
        color: "text-blue-400",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/30",
        accentColor: "#60A5FA",
        action: {
          label: t("subscription.startKyc"),
          icon: UserCheck,
          variant: "default",
        },
      },
      insufficient_balance: {
        icon: Wallet,
        title: t("subscription.errorInsufficientBalance"),
        description: t("subscription.errorInsufficientBalanceDesc"),
        color: "text-red-400",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/30",
        accentColor: "#F87171",
      },
      receipt_timeout: {
        icon: Clock,
        title: t("subscription.errorReceiptTimeout"),
        description: t("subscription.errorReceiptTimeoutDesc"),
        color: "text-amber-400",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/30",
        accentColor: "#F59E0B",
        action: {
          label: t("subscription.retryTransaction"),
          icon: RefreshCw,
          variant: "default",
        },
      },
      chain_rejected: {
        icon: Ban,
        title: t("subscription.errorChainRejected"),
        description: t("subscription.errorChainRejectedDesc"),
        color: "text-red-400",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/30",
        accentColor: "#F87171",
        action: {
          label: t("subscription.retry"),
          icon: RefreshCw,
          variant: "default",
        },
      },
      chain_failed: {
        icon: XCircle,
        title: t("subscription.errorChainFailed"),
        description: t("subscription.errorChainFailedDesc"),
        color: "text-red-400",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/30",
        accentColor: "#F87171",
        action: {
          label: t("subscription.retry"),
          icon: RefreshCw,
          variant: "default",
        },
      },
      backend_failed: {
        icon: Server,
        title: t("subscription.errorBackendFailed"),
        description: t("subscription.errorBackendFailedDesc"),
        color: "text-purple-400",
        bgColor: "bg-purple-500/10",
        borderColor: "border-purple-500/30",
        accentColor: "#C084FC",
        action: {
          label: t("subscription.contactSupport"),
          icon: HelpCircle,
          variant: "outline",
        },
      },
      approval_failed: {
        icon: Shield,
        title: t("subscription.errorApprovalFailed"),
        description: t("subscription.errorApprovalFailedDesc"),
        color: "text-orange-400",
        bgColor: "bg-orange-500/10",
        borderColor: "border-orange-500/30",
        accentColor: "#FB923C",
        action: {
          label: t("subscription.retry"),
          icon: RefreshCw,
          variant: "default",
        },
      },
      user_rejected: {
        icon: Ban,
        title: t("subscription.errorUserRejected"),
        description: t("subscription.errorUserRejectedDesc"),
        color: "text-white/60",
        bgColor: "bg-white/5",
        borderColor: "border-white/20",
        accentColor: "#888888",
      },
      unknown: {
        icon: AlertTriangle,
        title: t("subscription.errorUnknown"),
        description: context.errorMessage || t("subscription.errorUnknownDesc"),
        color: "text-red-400",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/30",
        accentColor: "#F87171",
        action: {
          label: t("subscription.retry"),
          icon: RefreshCw,
          variant: "default",
        },
      },
    };
    
    return reason ? configs[reason] : configs.unknown;
  }, [reason, context.errorMessage, requiredChainId, currentChainId, resolveNetworkName, t]);
  
  const Icon = config.icon;
  const showRetryWarning = currentRetry > 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full"
    >
      {/* Error Icon with Enhanced Animation */}
      <div className="flex justify-center mb-6">
        <div className={cn(
          "relative w-24 h-24 rounded-full flex items-center justify-center",
          config.bgColor
        )}>
          {/* Outer pulse rings */}
          <motion.div
            className={cn("absolute inset-0 rounded-full", config.bgColor)}
            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className={cn("absolute inset-2 rounded-full", config.bgColor)}
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
          />
          
          {/* Main icon container */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className={cn(
              "relative w-16 h-16 rounded-full flex items-center justify-center border-2",
              config.bgColor,
              config.borderColor
            )}
          >
            <Icon className={cn("w-8 h-8", config.color)} />
          </motion.div>
          
          {/* Decorative dots */}
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: config.accentColor }}
              animate={{
                rotate: 360,
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                rotate: { duration: 4, repeat: Infinity, ease: "linear" },
                opacity: { duration: 1, repeat: Infinity },
              }}
              initial={{
                top: "50%",
                left: "50%",
                marginLeft: -3,
                marginTop: -3,
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Error Content Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={cn(
          "relative overflow-hidden rounded-xl p-5 border mb-5",
          config.bgColor,
          config.borderColor
        )}
      >
        {/* Animated background gradient */}
        <motion.div
          className="absolute inset-0 opacity-30"
          animate={{
            background: [
              `radial-gradient(circle at 0% 0%, ${config.accentColor}20 0%, transparent 50%)`,
              `radial-gradient(circle at 100% 100%, ${config.accentColor}20 0%, transparent 50%)`,
              `radial-gradient(circle at 0% 0%, ${config.accentColor}20 0%, transparent 50%)`,
            ],
          }}
          transition={{ duration: 5, repeat: Infinity }}
        />
        
        <div className="relative z-10">
          <h3 className={cn("text-lg font-bold mb-2", config.color)}>
            {config.title}
          </h3>
          <p className="text-sm text-white/70 leading-relaxed">
            {config.description}
          </p>
        </div>
        
        {/* Additional Context */}
        {context.txHash && (
          <div className="relative z-10 mt-4 pt-4 border-t border-white/10">
            <span className="text-[10px] text-white/40 uppercase tracking-wide">{t("subscription.transactionHash")}</span>
            <p className="text-xs font-mono text-white/60 mt-1 break-all bg-black/20 p-2 rounded-lg">
              {context.txHash}
            </p>
          </div>
        )}
        
        {context.errorMessage && reason !== "unknown" && (
          <div className="relative z-10 mt-4 p-3 rounded-lg bg-black/20">
            <span className="text-[10px] text-white/40 uppercase tracking-wide">{t("subscription.errorDetails")}</span>
            <p className="text-xs text-white/50 mt-1 font-mono">
              {context.errorMessage.slice(0, 100)}
              {context.errorMessage.length > 100 && "..."}
            </p>
          </div>
        )}
      </motion.div>
      
      {/* Retry Warning */}
      {showRetryWarning && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mb-4 p-3 rounded-lg bg-amber-500/8 border border-amber-500/20"
        >
          <div className="flex items-center gap-2 text-amber-400/80 text-xs">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </motion.div>
            <span>{t("subscription.attemptCount", { current: currentRetry, max: maxRetries })}</span>
          </div>
        </motion.div>
      )}
      
      {/* Primary Action Button */}
      {config.action && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            onClick={reason === "network_mismatch" ? onSwitchNetwork : onRetry}
            className={cn(
              "w-full h-12 font-bold text-sm rounded-xl transition-all duration-300",
              config.action.variant === "default" 
                ? "bg-[#00D4AA] hover:bg-[#00D4AA]/90 text-black hover:shadow-lg hover:shadow-[#00D4AA]/25"
                : "bg-transparent border border-white/20 hover:bg-white/5 text-white"
            )}
          >
            <motion.div
              className="flex items-center gap-2"
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.98 }}
            >
              <config.action.icon className="w-4 h-4" />
              {config.action.label}
            </motion.div>
          </Button>
        </motion.div>
      )}
      
      {/* Alternative Actions */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex gap-3 mt-3"
      >
        {reason === "jwt_expired" && (
          <Button
            variant="outline"
            onClick={() => window.location.href = "/login"}
            className="flex-1 h-10 bg-transparent border-white/10 hover:bg-white/5 text-white/60 rounded-lg"
          >
            <LogIn className="w-4 h-4 mr-2" />
            {t("subscription.goToLogin")}
          </Button>
        )}
        
        {reason === "kyc_rejected" && (
          <Button
            variant="outline"
            onClick={() => window.location.href = "/kyc"}
            className="flex-1 h-10 bg-transparent border-white/10 hover:bg-white/5 text-white/60 rounded-lg"
          >
            <UserCheck className="w-4 h-4 mr-2" />
            {t("subscription.startKyc")}
          </Button>
        )}
        
        {reason === "insufficient_balance" && (
          <Button
            variant="outline"
            onClick={onRetry}
            className="flex-1 h-10 bg-transparent border-white/10 hover:bg-white/5 text-white/60 rounded-lg"
          >
            <Wallet className="w-4 h-4 mr-2" />
            {t("subscription.checkAgain")}
          </Button>
        )}
      </motion.div>
      
      {/* Help Link */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-5 text-center"
      >
        <a
          href="/faq"
          className="text-xs text-white/40 hover:text-white/70 transition-colors flex items-center justify-center gap-1.5"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          {`${t("subscription.needHelp")} ${t("subscription.visitFaq")}`}
        </a>
      </motion.div>
    </motion.div>
  );
}

// Helper function to get network name
function getNetworkName(chainId?: number): string | undefined {
  const networks: Record<number, string> = {
    1: "Ethereum Mainnet",
    5: "Goerli Testnet",
    11155111: "Sepolia Testnet",
    137: "Polygon",
    80001: "Mumbai Testnet",
    42161: "Arbitrum",
    421613: "Arbitrum Goerli",
    10: "Optimism",
    420: "Optimism Goerli",
    56: "BSC",
    97: "BSC Testnet",
    8453: "Base",
  };
  return networks[chainId || 0];
}
