"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Building2, Shield, Database, Globe } from "lucide-react";

// ============================================
// 风格 1: 区块链节点脉冲 - Blockchain Pulse
// 适合：强调区块链技术的场景
// ============================================

interface BlockchainNodeProps {
  delay: number;
  x: number;
  y: number;
}

function BlockchainNode({ delay, x, y }: BlockchainNodeProps) {
  return (
    <motion.div
      className="absolute w-3 h-3 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500"
      style={{ left: x, top: y }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: [0, 1.2, 1],
        opacity: [0, 1, 0.6],
        boxShadow: [
          "0 0 0px rgba(45, 212, 191, 0)",
          "0 0 20px rgba(45, 212, 191, 0.8)",
          "0 0 40px rgba(45, 212, 191, 0)",
        ],
      }}
      transition={{
        duration: 2,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

function BlockchainPulse() {
  const nodes = [
    { x: 20, y: 50, delay: 0 },
    { x: 80, y: 30, delay: 0.2 },
    { x: 140, y: 60, delay: 0.4 },
    { x: 100, y: 100, delay: 0.6 },
    { x: 50, y: 110, delay: 0.8 },
  ];

  return (
    <div className="relative w-[160px] h-[140px]">
      {/* SVG 连接线 */}
      <svg className="absolute inset-0 w-full h-full">
        <motion.path
          d="M 35 60 L 90 45 L 150 75 L 110 115 L 60 120 L 35 60"
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth="2"
          strokeDasharray="5,5"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.4 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.2" />
          </linearGradient>
        </defs>
      </svg>

      {/* 节点 */}
      {nodes.map((node, i) => (
        <BlockchainNode key={i} {...node} />
      ))}

      {/* 中心 Logo */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center"
        animate={{
          rotate: [0, 360],
          scale: [1, 1.05, 1],
        }}
        transition={{
          rotate: { duration: 8, repeat: Infinity, ease: "linear" },
          scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-7 h-7 text-white"
        >
          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
          <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
          <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
          <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
        </svg>
      </motion.div>
    </div>
  );
}

// ============================================
// 风格 2: 资产卡片浮现 - Asset Card Reveal
// 适合：RWA 资产平台，强调房产/资产
// ============================================

function AssetCardReveal() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStage((prev) => (prev + 1) % 4);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const stages = [
    { icon: Database, text: "Connecting to blockchain..." },
    { icon: Shield, text: "Verifying smart contracts..." },
    { icon: Building2, text: "Loading asset data..." },
    { icon: Globe, text: "Preparing your portfolio..." },
  ];

  return (
    <div className="flex flex-col items-center gap-8">
      {/* 3D 卡片堆叠效果 */}
      <div className="relative w-32 h-40">
        {/* 底层卡片 */}
        <motion.div
          className="absolute inset-0 rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-600/20 border border-teal-400/30"
          animate={{
            rotateY: [0, 5, 0],
            y: [0, -4, 0],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* 中层卡片 */}
        <motion.div
          className="absolute inset-2 rounded-xl bg-gradient-to-br from-teal-500/30 to-emerald-600/30 border border-teal-400/40"
          animate={{
            rotateY: [0, -3, 0],
            y: [0, -2, 0],
          }}
          transition={{ duration: 3, delay: 0.2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* 顶层卡片 - 主内容 */}
        <motion.div
          className="absolute inset-4 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 flex flex-col items-center justify-center"
          animate={{
            rotateY: [0, 8, 0],
            scale: [1, 1.02, 1],
          }}
          transition={{ duration: 3, delay: 0.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.div
            key={stage}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ duration: 0.5, ease: "backOut" }}
          >
            {(() => {
              const Icon = stages[stage].icon;
              return <Icon className="w-10 h-10 text-white" />;
            })()}
          </motion.div>
        </motion.div>

        {/* 光晕效果 */}
        <motion.div
          className="absolute -inset-4 rounded-2xl bg-gradient-to-r from-teal-400/0 via-teal-400/30 to-teal-400/0 blur-xl"
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>

      {/* 阶段文字 */}
      <div className="h-8">
        <AnimatePresence mode="wait">
          <motion.p
            key={stage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-sm text-teal-300/80 font-medium tracking-wide"
          >
            {stages[stage].text}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* 进度点 */}
      <div className="flex gap-2">
        {stages.map((_, i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full"
            animate={{
              backgroundColor: i === stage ? "#2dd4bf" : "rgba(45, 212, 191, 0.3)",
              scale: i === stage ? 1.3 : 1,
            }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================
// 风格 3: 流动数据 - Flowing Data
// 适合：强调数据、速度、科技感
// ============================================

function FlowingData() {
  return (
    <div className="flex flex-col items-center gap-6">
      {/* 环形进度 */}
      <div className="relative w-28 h-28">
        {/* 外圈 */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-teal-400/20"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.8)]" />
        </motion.div>

        {/* 中圈 - 反向 */}
        <motion.div
          className="absolute inset-3 rounded-full border-2 border-emerald-400/20"
          animate={{ rotate: -360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
        </motion.div>

        {/* 内圈脉冲 */}
        <motion.div
          className="absolute inset-6 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center"
          animate={{
            boxShadow: [
              "0 0 20px rgba(45, 212, 191, 0.4)",
              "0 0 40px rgba(45, 212, 191, 0.6)",
              "0 0 20px rgba(45, 212, 191, 0.4)",
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="text-white font-bold text-lg">RWA</span>
        </motion.div>

        {/* 数据流动粒子 */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-teal-300"
            style={{
              left: "50%",
              top: "50%",
            }}
            animate={{
              x: [0, Math.cos(i * 60 * Math.PI / 180) * 50],
              y: [0, Math.sin(i * 60 * Math.PI / 180) * 50],
              opacity: [1, 0],
              scale: [1, 0.5],
            }}
            transition={{
              duration: 1.5,
              delay: i * 0.1,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
        ))}
      </div>

      {/* 加载文字动画 */}
      <div className="flex items-center gap-1">
        <span className="text-teal-300/80 font-medium">Loading</span>
        <motion.span
          className="text-teal-400 font-bold"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          .
        </motion.span>
        <motion.span
          className="text-teal-400 font-bold"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, delay: 0.2, repeat: Infinity }}
        >
          .
        </motion.span>
        <motion.span
          className="text-teal-400 font-bold"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, delay: 0.4, repeat: Infinity }}
        >
          .
        </motion.span>
      </div>

      {/* 模拟数据条 */}
      <div className="flex gap-1 h-4 items-end">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="w-1.5 bg-gradient-to-t from-teal-500/40 to-teal-400 rounded-full"
            animate={{
              height: [8, 16 + Math.random() * 16, 8],
            }}
            transition={{
              duration: 0.8 + Math.random() * 0.4,
              repeat: Infinity,
              delay: i * 0.05,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================
// 主组件 - 支持多种风格切换
// ============================================

type LoadingVariant = "blockchain" | "asset" | "flow" | "minimal";

interface EnhancedLoadingProps {
  variant?: LoadingVariant;
  minHeight?: string;
  showLogo?: boolean;
}

export function EnhancedLoading({
  variant = "asset",
  minHeight = "60vh",
  showLogo = true,
}: EnhancedLoadingProps) {
  const { t } = useTranslation();

  const renderContent = () => {
    switch (variant) {
      case "blockchain":
        return <BlockchainPulse />;
      case "asset":
        return <AssetCardReveal />;
      case "flow":
        return <FlowingData />;
      case "minimal":
        return (
          <motion.div
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center"
            animate={{
              scale: [1, 1.1, 1],
              boxShadow: [
                "0 0 20px rgba(45, 212, 191, 0.4)",
                "0 0 40px rgba(45, 212, 191, 0.6)",
                "0 0 20px rgba(45, 212, 191, 0.4)",
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-8 h-8 text-white"
            >
              <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
              <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
            </svg>
          </motion.div>
        );
      default:
        return <AssetCardReveal />;
    }
  };

  return (
    <div
      className="flex items-center justify-center w-full"
      style={{ minHeight }}
    >
      <motion.div
        className="flex flex-col items-center gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* 品牌 Logo (可选) */}
        {showLogo && variant !== "minimal" && (
          <motion.div
            className="flex items-center gap-2 mb-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 text-white"
              >
                <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
              </svg>
            </div>
            <span className="text-teal-400 font-semibold text-lg">
              SuperCrypto
            </span>
          </motion.div>
        )}

        {/* 加载动画主体 */}
        {renderContent()}

        {/* 底部提示文字 */}
        {variant === "minimal" && (
          <motion.p
            className="text-white/50 text-sm mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {t("common.loading", "Loading...")}
          </motion.p>
        )}
      </motion.div>

      {/* 全局 CSS 动画定义 */}
      <style jsx global>{`
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(45, 212, 191, 0.4);
          }
          50% {
            box-shadow: 0 0 40px rgba(45, 212, 191, 0.7);
          }
        }
      `}</style>
    </div>
  );
}

// ============================================
// 全屏加载遮罩 - FullScreen Loading Overlay
// ============================================

interface LoadingOverlayProps {
  isOpen: boolean;
  variant?: LoadingVariant;
  message?: string;
}

export function LoadingOverlay({
  isOpen,
  variant = "asset",
  message,
}: LoadingOverlayProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-bg-dark/90 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex flex-col items-center gap-6">
            <EnhancedLoading variant={variant} minHeight="auto" showLogo />
            {message && (
              <motion.p
                className="text-white/60 text-sm"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {message}
              </motion.p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default EnhancedLoading;
