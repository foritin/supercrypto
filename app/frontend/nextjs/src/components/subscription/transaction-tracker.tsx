"use client";

/**
 * Transaction Status Panel
 * 实时交易状态追踪面板
 * 
 * 可视化链上交易全流程，类似专业交易终端
 */

import { motion } from "framer-motion";
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
} from "lucide-react";
import { useMemo } from "react";

import { cn } from "@/lib/utils";

import type { TransactionState, TransactionContext } from "./subscription-orchestrator";

export interface TransactionStatusPanelProps {
  state: TransactionState;
  progress: number;
  context: TransactionContext;
}

interface StepItem {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  state: "pending" | "active" | "completed";
}

export function TransactionStatusPanel({ state, progress, context }: TransactionStatusPanelProps) {
  
  const steps: StepItem[] = useMemo(() => {
    const baseSteps: StepItem[] = [
      {
        id: "validation",
        label: "Validation",
        description: "Checking prerequisites",
        icon: Shield,
        state: "pending",
      },
      {
        id: "order",
        label: "Create Order",
        description: "Creating pending order",
        icon: FileCheck,
        state: "pending",
      },
      {
        id: "signature",
        label: "Signature",
        description: "Waiting for wallet signature",
        icon: Zap,
        state: "pending",
      },
      {
        id: "broadcast",
        label: "Broadcast",
        description: "Sending to network",
        icon: Radio,
        state: "pending",
      },
      {
        id: "confirmation",
        label: "Confirmation",
        description: "Waiting for confirmations",
        icon: Clock,
        state: "pending",
      },
      {
        id: "settlement",
        label: "Settlement",
        description: "Finalizing on backend",
        icon: Database,
        state: "pending",
      },
    ];
    
    // Update states based on current transaction state
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
  }, [state]);
  
  return (
    <div className="w-full">
      {/* Progress Overview */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
            Transaction Progress
          </span>
          <span className="text-xs font-mono text-[#00D4AA]">
            {progress.toFixed(0)}%
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#00D4AA] to-[#00B496] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
          
          {/* Shimmer Effect */}
          <motion.div
            className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{ x: ["-100%", "400%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
        </div>
      </div>
      
      {/* Steps List */}
      <div className="space-y-2">
        {steps.map((step, index) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl transition-all duration-300",
              step.state === "active" && "bg-[#00D4AA]/10 border border-[#00D4AA]/30",
              step.state === "completed" && "bg-white/[0.02]",
              step.state === "pending" && "opacity-50"
            )}
          >
            {/* Icon */}
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
              step.state === "active" && "bg-[#00D4AA]/20 text-[#00D4AA]",
              step.state === "completed" && "bg-emerald-500/20 text-emerald-400",
              step.state === "pending" && "bg-white/5 text-white/30"
            )}>
              {step.state === "active" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : step.state === "completed" ? (
                <Check className="w-4 h-4" />
              ) : (
                <step.icon className="w-4 h-4" />
              )}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-sm font-medium",
                  step.state === "active" && "text-white",
                  step.state === "completed" && "text-white/70",
                  step.state === "pending" && "text-white/40"
                )}>
                  {step.label}
                </span>
                {step.state === "active" && (
                  <span className="flex h-1.5 w-1.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00D4AA] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00D4AA]"></span>
                  </span>
                )}
              </div>
              <p className="text-xs text-white/40 truncate">{step.description}</p>
            </div>
            
            {/* Status Indicator */}
            {step.state === "active" && context.txHash && step.id === "broadcast" && (
              <a
                href={`https://etherscan.io/tx/${context.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-[#00D4AA] hover:underline flex items-center gap-1"
              >
                View <ArrowRight className="w-3 h-3" />
              </a>
            )}
          </motion.div>
        ))}
      </div>
      
      {/* Live Transaction Details */}
      {context.txHash && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 rounded-lg bg-black/20 border border-white/5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/40 uppercase">Transaction Hash</span>
            <span className="text-[10px] font-mono text-white/60 truncate max-w-[180px]">
              {context.txHash.slice(0, 12)}...{context.txHash.slice(-8)}
            </span>
          </div>
          {context.blockNumber && (
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-white/40 uppercase">Block Number</span>
              <span className="text-[10px] font-mono text-white/60">
                #{context.blockNumber.toLocaleString()}
              </span>
            </div>
          )}
          {context.gasUsed && (
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-white/40 uppercase">Gas Used</span>
              <span className="text-[10px] font-mono text-white/60">
                {context.gasUsed.toString()}
              </span>
            </div>
          )}
        </motion.div>
      )}
      
      {/* Processing Animation */}
      <div className="mt-4 flex justify-center">
        <div className="flex items-center gap-2 text-xs text-white/40">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00D4AA] opacity-40"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00D4AA]"></span>
          </span>
          {state === "awaiting_signature" && "Waiting for wallet confirmation..."}
          {state === "broadcasting" && "Broadcasting transaction..."}
          {state === "monitoring" && "Monitoring blockchain..."}
          {state === "confirming" && "Waiting for backend confirmation..."}
        </div>
      </div>
    </div>
  );
}
