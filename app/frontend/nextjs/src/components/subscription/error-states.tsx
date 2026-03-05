"use client";

/**
 * Error State Panels
 * 各种错误状态的视觉化展示和恢复指导
 * 
 * 支持的错误类型:
 * - network_mismatch: 网络不匹配
 * - jwt_expired: JWT 失效
 * - kyc_rejected: KYC 未准入
 * - insufficient_balance: 余额不足
 * - receipt_timeout: 回执超时
 * - chain_rejected: 链上拒绝
 * - chain_failed: 链上失败
 * - backend_failed: 后端校验失败
 * - approval_failed: 授权失败
 * - user_rejected: 用户拒绝
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
  const config: ErrorConfig = useMemo(() => {
    const configs: Record<NonNullable<FailureReason>, ErrorConfig> = {
      network_mismatch: {
        icon: Globe,
        title: "Network Mismatch",
        description: `Please switch to ${getNetworkName(requiredChainId)} to complete this transaction. Your wallet is currently connected to ${getNetworkName(currentChainId)}.`,
        color: "text-amber-400",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/30",
        action: {
          label: "Switch Network",
          icon: RefreshCw,
          variant: "default",
        },
      },
      jwt_expired: {
        icon: LogIn,
        title: "Session Expired",
        description: "Your session has expired. Please sign in again to continue with your investment.",
        color: "text-orange-400",
        bgColor: "bg-orange-500/10",
        borderColor: "border-orange-500/30",
        action: {
          label: "Sign In Again",
          icon: ArrowRight,
          variant: "default",
        },
      },
      kyc_rejected: {
        icon: Shield,
        title: "KYC Verification Required",
        description: "You need to complete KYC verification before investing. This is required for regulatory compliance.",
        color: "text-blue-400",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/30",
        action: {
          label: "Complete KYC",
          icon: UserCheck,
          variant: "default",
        },
      },
      insufficient_balance: {
        icon: Wallet,
        title: "Insufficient Balance",
        description: "You don't have enough funds in your wallet to complete this investment. Please add more funds or reduce the investment amount.",
        color: "text-red-400",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/30",
      },
      receipt_timeout: {
        icon: Clock,
        title: "Transaction Timeout",
        description: "We couldn't confirm your transaction within the expected time. The network may be congested. You can retry or check your transaction status later.",
        color: "text-amber-400",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/30",
        action: {
          label: "Retry Transaction",
          icon: RefreshCw,
          variant: "default",
        },
      },
      chain_rejected: {
        icon: Ban,
        title: "Transaction Rejected",
        description: "The blockchain rejected your transaction. This may be due to gas price fluctuations or network congestion. Please try again.",
        color: "text-red-400",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/30",
        action: {
          label: "Retry",
          icon: RefreshCw,
          variant: "default",
        },
      },
      chain_failed: {
        icon: XCircle,
        title: "Transaction Failed",
        description: "Your transaction failed on the blockchain. The funds were not deducted. Please check your wallet and try again.",
        color: "text-red-400",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/30",
        action: {
          label: "Retry",
          icon: RefreshCw,
          variant: "default",
        },
      },
      backend_failed: {
        icon: Server,
        title: "Confirmation Failed",
        description: "Your transaction was successful on the blockchain, but we couldn't confirm it in our system. Our team has been notified and will resolve this shortly.",
        color: "text-purple-400",
        bgColor: "bg-purple-500/10",
        borderColor: "border-purple-500/30",
        action: {
          label: "Contact Support",
          icon: HelpCircle,
          variant: "outline",
        },
      },
      approval_failed: {
        icon: Shield,
        title: "Token Approval Failed",
        description: "We couldn't approve the token transfer. Please check your wallet and ensure you have enough ETH for gas fees.",
        color: "text-orange-400",
        bgColor: "bg-orange-500/10",
        borderColor: "border-orange-500/30",
        action: {
          label: "Retry Approval",
          icon: RefreshCw,
          variant: "default",
        },
      },
      user_rejected: {
        icon: Ban,
        title: "Transaction Cancelled",
        description: "You cancelled the transaction in your wallet. No funds were deducted. You can start over if you'd like to invest.",
        color: "text-white/60",
        bgColor: "bg-white/5",
        borderColor: "border-white/20",
      },
      unknown: {
        icon: AlertTriangle,
        title: "Something Went Wrong",
        description: context.errorMessage || "An unexpected error occurred. Please try again or contact support if the issue persists.",
        color: "text-red-400",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/30",
        action: {
          label: "Try Again",
          icon: RefreshCw,
          variant: "default",
        },
      },
    };
    
    return reason ? configs[reason] : configs.unknown;
  }, [reason, context.errorMessage, requiredChainId, currentChainId]);
  
  const Icon = config.icon;
  const showRetryWarning = currentRetry > 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full"
    >
      {/* Error Icon */}
      <div className="flex justify-center mb-6">
        <div className={cn(
          "relative w-20 h-20 rounded-full flex items-center justify-center",
          config.bgColor
        )}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center border-2",
              config.bgColor,
              config.borderColor
            )}
          >
            <Icon className={cn("w-8 h-8", config.color)} />
          </motion.div>
          
          {/* Pulse rings */}
          <motion.div
            className={cn("absolute inset-0 rounded-full", config.bgColor)}
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </div>
      
      {/* Error Content */}
      <div className={cn(
        "rounded-xl p-5 border mb-5",
        config.bgColor,
        config.borderColor
      )}>
        <h3 className={cn("text-lg font-bold mb-2", config.color)}>
          {config.title}
        </h3>
        <p className="text-sm text-white/70 leading-relaxed">
          {config.description}
        </p>
        
        {/* Additional Context */}
        {context.txHash && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <span className="text-[10px] text-white/40 uppercase">Transaction Hash</span>
            <p className="text-xs font-mono text-white/60 mt-1 break-all">
              {context.txHash}
            </p>
          </div>
        )}
        
        {context.errorMessage && reason !== "unknown" && (
          <div className="mt-4 p-3 rounded-lg bg-black/20">
            <span className="text-[10px] text-white/40 uppercase">Error Details</span>
            <p className="text-xs text-white/50 mt-1 font-mono">
              {context.errorMessage.slice(0, 100)}
              {context.errorMessage.length > 100 && "..."}
            </p>
          </div>
        )}
      </div>
      
      {/* Retry Warning */}
      {showRetryWarning && (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/8 border border-amber-500/20">
          <div className="flex items-center gap-2 text-amber-400/80 text-xs">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Attempt {currentRetry} of {maxRetries}</span>
          </div>
        </div>
      )}
      
      {/* Primary Action */}
      {config.action && (
        <Button
          onClick={reason === "network_mismatch" ? onSwitchNetwork : onRetry}
          className={cn(
            "w-full h-12 font-semibold mb-3",
            config.action.variant === "default" 
              ? "bg-[#00D4AA] hover:bg-[#00D4AA]/90 text-black"
              : "bg-transparent border border-white/20 hover:bg-white/5 text-white"
          )}
        >
          <config.action.icon className="w-4 h-4 mr-2" />
          {config.action.label}
        </Button>
      )}
      
      {/* Alternative Actions */}
      <div className="flex gap-3">
        {reason === "jwt_expired" && (
          <Button
            variant="outline"
            onClick={() => window.location.href = "/login"}
            className="flex-1 h-10 bg-transparent border-white/10 hover:bg-white/5 text-white/60"
          >
            Go to Login
          </Button>
        )}
        
        {reason === "kyc_rejected" && (
          <Button
            variant="outline"
            onClick={() => window.location.href = "/kyc"}
            className="flex-1 h-10 bg-transparent border-white/10 hover:bg-white/5 text-white/60"
          >
            Start KYC
          </Button>
        )}
        
        {reason === "insufficient_balance" && (
          <Button
            variant="outline"
            onClick={onRetry}
            className="flex-1 h-10 bg-transparent border-white/10 hover:bg-white/5 text-white/60"
          >
            Check Again
          </Button>
        )}
      </div>
      
      {/* Help Link */}
      <div className="mt-4 text-center">
        <a
          href="/faq"
          className="text-xs text-white/40 hover:text-white/60 transition-colors"
        >
          Need help? Visit our FAQ
        </a>
      </div>
    </motion.div>
  );
}

// Helper function to get network name
function getNetworkName(chainId?: number): string {
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
  };
  return networks[chainId || 0] || `Chain ${chainId}`;
}
