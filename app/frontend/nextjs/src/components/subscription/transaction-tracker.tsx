"use client";

/**
 * Transaction Status Panel - Enhanced Edition
 * 实时交易状态追踪面板 - 视觉与动画全面升级
 */

import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Check,
  Clock,
  Radio,
  FileCheck,
  Shield,
  Database,
  ArrowRight,
  Zap,
  Activity,
  Link2,
} from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { cn, getExplorerUrl } from "@/lib/utils";

import type { TransactionState, TransactionContext } from "./subscription-orchestrator";

export interface TransactionStatusPanelProps {
  state: TransactionState;
  progress: number;
  context: TransactionContext;
  chainId: number;
}

interface StepItem {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  state: "pending" | "active" | "completed";
}

export function TransactionStatusPanel({ state, progress, context, chainId }: TransactionStatusPanelProps) {
  const { t } = useTranslation();
  
  const steps: StepItem[] = useMemo(() => {
    const baseSteps: StepItem[] = [
      {
        id: "validation",
        label: t("subscription.validation"),
        description: t("subscription.validationDesc"),
        icon: Shield,
        state: "pending",
      },
      {
        id: "order",
        label: t("subscription.createOrder"),
        description: t("subscription.createOrderDesc"),
        icon: FileCheck,
        state: "pending",
      },
      {
        id: "signature",
        label: t("subscription.signature"),
        description: t("subscription.signatureDesc"),
        icon: Zap,
        state: "pending",
      },
      {
        id: "broadcast",
        label: t("subscription.broadcast"),
        description: t("subscription.broadcastDesc"),
        icon: Radio,
        state: "pending",
      },
      {
        id: "confirmation",
        label: t("subscription.confirmation"),
        description: t("subscription.confirmationDesc"),
        icon: Clock,
        state: "pending",
      },
      {
        id: "settlement",
        label: t("subscription.settlementStep"),
        description: t("subscription.settlementDesc"),
        icon: Database,
        state: "pending",
      },
    ];
    
    const stateMap: Record<TransactionState, string[]> = {
      idle: [],
      validating: ["validation"],
      creating_order: ["validation", "order"],
      awaiting_signature: ["validation", "order", "signature"],
      broadcasting: ["validation", "order", "signature", "broadcast"],
      monitoring: ["validation", "order", "signature", "broadcast", "confirmation"],
      confirming: ["validation", "order", "signature", "broadcast", "confirmation", "settlement"],
      completed: ["validation", "order", "signature", "broadcast", "confirmation", "settlement"],
      failed: [],
    };
    
    const activeSteps = stateMap[state] || [];
    const currentActive = activeSteps[activeSteps.length - 1];
    
    return baseSteps.map((step) => {
      const mappedState = activeSteps.includes(step.id)
        ? step.id === currentActive && state !== "completed"
          ? "active"
          : "completed"
        : "pending" as const;

      return {
        ...step,
        state: mappedState,
      };
    });
  }, [state, t]);

  // Get status message based on state
  const statusMessage = useMemo(() => {
    const messages: Record<TransactionState, string> = {
      idle: t("subscription.pending"),
      validating: t("subscription.validating"),
      creating_order: t("subscription.creatingOrder"),
      awaiting_signature: t("subscription.waitingWallet"),
      broadcasting: t("subscription.broadcastingTx"),
      monitoring: t("subscription.monitoringBlockchain"),
      confirming: t("subscription.waitingBackend"),
      completed: t("subscription.success"),
      failed: t("subscription.failed"),
    };
    return messages[state] || t("subscription.pending");
  }, [state, t]);
  
  return (
    <div className="w-full">
      {/* Enhanced Progress Overview */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#00D4AA]" />
            <span className="text-xs font-bold text-white/60 uppercase tracking-wider">
              {t("subscription.transactionProgress")}
            </span>
          </div>
          <motion.span 
            key={progress}
            initial={{ scale: 1.2, color: "#00D4AA" }}
            animate={{ scale: 1, color: "#00D4AA" }}
            className="text-sm font-mono font-bold"
          >
            {progress.toFixed(0)}%
          </motion.span>
        </div>
        
        {/* Enhanced Progress Bar */}
        <div className="relative h-3 bg-white/5 rounded-full overflow-hidden">
          {/* Background segments */}
          <div className="absolute inset-0 flex">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex-1 border-r border-[#0B1426]/50 last:border-r-0" />
            ))}
          </div>
          
          {/* Progress fill */}
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#00D4AA] via-[#00E5C0] to-[#00D4AA] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
          
          {/* Shimmer Effect */}
          <motion.div
            className="absolute inset-y-0 w-32 bg-gradient-to-r from-transparent via-white/40 to-transparent"
            animate={{ x: ["-100%", "400%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
          
          {/* Glow at progress edge */}
          <motion.div
            className="absolute inset-y-0 w-4 bg-[#00D4AA] blur-md"
            initial={{ left: 0 }}
            animate={{ left: `${progress}%` }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{ transform: "translateX(-50%)" }}
          />
        </div>

        {/* Status Message */}
        <motion.div 
          key={statusMessage}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 mt-3 text-xs text-white/50"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00D4AA] opacity-40" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00D4AA]" />
          </span>
          {statusMessage}
        </motion.div>
      </div>
      
      {/* Enhanced Steps List */}
      <div className="space-y-2">
        {steps.map((step, index) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08, duration: 0.4 }}
            className={cn(
              "flex items-center gap-3 p-3.5 rounded-xl transition-all duration-300 relative overflow-hidden",
              step.state === "active" && "bg-[#00D4AA]/10 border border-[#00D4AA]/30",
              step.state === "completed" && "bg-white/[0.02]",
              step.state === "pending" && "opacity-40"
            )}
          >
            {/* Active background animation */}
            {step.state === "active" && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-[#00D4AA]/5 via-[#00D4AA]/10 to-[#00D4AA]/5"
                animate={{ 
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                }}
                transition={{ duration: 3, repeat: Infinity }}
                style={{ backgroundSize: "200% 200%" }}
              />
            )}
            
            {/* Icon */}
            <motion.div 
              className={cn(
                "relative w-9 h-9 rounded-lg flex items-center justify-center transition-all",
                step.state === "active" && "bg-[#00D4AA]/20",
                step.state === "completed" && "bg-emerald-500/20",
                step.state === "pending" && "bg-white/5"
              )}
              animate={step.state === "active" ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {step.state === "active" ? (
                <Loader2 className="w-4 h-4 text-[#00D4AA] animate-spin" />
              ) : step.state === "completed" ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Check className="w-4 h-4 text-emerald-400" strokeWidth={3} />
                </motion.div>
              ) : (
                <step.icon className="w-4 h-4 text-white/30" />
              )}
              
              {/* Pulse ring for active */}
              {step.state === "active" && (
                <motion.div
                  className="absolute inset-0 rounded-lg border border-[#00D4AA]/50"
                  animate={{ scale: [1, 1.2], opacity: [0.5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </motion.div>
            
            {/* Content */}
            <div className="flex-1 min-w-0 relative z-10">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-sm font-semibold",
                  step.state === "active" && "text-white",
                  step.state === "completed" && "text-white/80",
                  step.state === "pending" && "text-white/40"
                )}>
                  {step.label}
                </span>
                
                {/* Active indicator dot */}
                {step.state === "active" && (
                  <span className="flex h-1.5 w-1.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00D4AA] opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00D4AA]" />
                  </span>
                )}
                
                {/* Completed badge */}
                {step.state === "completed" && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded"
                  >
                    {t("subscription.done")}
                  </motion.span>
                )}
              </div>
              <p className="text-xs text-white/40 truncate">{step.description}</p>
            </div>
            
            {/* Arrow for active step */}
            <AnimatePresence>
              {step.state === "active" && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                >
                  <ArrowRight className="w-4 h-4 text-[#00D4AA]" />
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* View link for broadcast step with txHash */}
            {step.state === "completed" && step.id === "broadcast" && context.txHash && (
              <motion.a
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                href={getExplorerUrl(chainId, "tx", context.txHash) || undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-[#00D4AA] hover:underline flex items-center gap-1 relative z-10"
              >
                <Link2 className="w-3 h-3" />
                {t("subscription.view")}
              </motion.a>
            )}
          </motion.div>
        ))}
      </div>
      
      {/* Live Transaction Details */}
      <AnimatePresence>
        {context.txHash && (
          <motion.div
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="mt-4 p-4 rounded-xl bg-black/20 border border-white/5 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                <Link2 className="w-3 h-3" />
                {t("subscription.transactionHash")}
              </span>
            </div>
            
            <a
              href={getExplorerUrl(chainId, "tx", context.txHash) || undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs font-mono text-white/60 hover:text-[#00D4AA] transition-colors group"
            >
              <span className="bg-white/5 px-2 py-1.5 rounded-lg group-hover:bg-[#00D4AA]/10 transition-colors">
                {context.txHash.slice(0, 12)}...{context.txHash.slice(-10)}
              </span>
              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
            
            {/* Additional details grid */}
            <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-white/5">
              {context.blockNumber && (
                <div>
                  <span className="text-[9px] text-white/30 uppercase block">{t("subscription.block")}</span>
                  <span className="text-xs font-mono text-white/60">
                    #{context.blockNumber.toLocaleString()}
                  </span>
                </div>
              )}
              {context.gasUsed && (
                <div>
                  <span className="text-[9px] text-white/30 uppercase block">{t("subscription.gasUsed")}</span>
                  <span className="text-xs font-mono text-white/60">
                    {parseInt(context.gasUsed.toString()).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
