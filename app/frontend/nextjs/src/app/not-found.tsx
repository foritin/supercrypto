"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { House, Terminal, Warning } from "@phosphor-icons/react";

/**
 * 赛博终端风格 404 页面
 */
export default function NotFound() {
  const { t } = useTranslation();
  
  // 使用 defaultValue，防止 key 缺失时直接显示 key
  const d = (key: string, fallback: string) => t(key, { defaultValue: fallback });

  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center px-4 overflow-hidden">
      {/* Background Grid */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 245, 212, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 245, 212, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
      
      {/* Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
          }}
        />
      </div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative max-w-lg w-full"
      >
        {/* Terminal Window */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
          {/* Terminal Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="ml-3 text-xs font-mono text-white/40">
                {d("notFound.terminalMode", "终端模式")} — 404
              </span>
            </div>
            <Terminal className="w-4 h-4 text-white/30" />
          </div>

          {/* Terminal Content */}
          <div className="p-8 text-center">
            {/* Glitch 404 */}
            <div className="relative mb-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="relative"
              >
                {/* Main 404 with glitch effect */}
                <h1 
                  className="text-8xl font-bold font-mono tracking-tighter"
                  style={{
                    color: '#00f5d4',
                    textShadow: '0 0 40px rgba(0, 245, 212, 0.3)',
                  }}
                >
                  <GlitchText text="404" />
                </h1>
                
                {/* Glitch layers */}
                <div 
                  className="absolute inset-0 text-8xl font-bold font-mono tracking-tighter opacity-50 select-none"
                  style={{
                    color: '#ff006e',
                    clipPath: 'polygon(0 0, 100% 0, 100% 45%, 0 45%)',
                    transform: 'translateX(-4px)',
                    animation: 'glitch-1 3s infinite linear alternate-reverse',
                  }}
                >
                  404
                </div>
                <div 
                  className="absolute inset-0 text-8xl font-bold font-mono tracking-tighter opacity-50 select-none"
                  style={{
                    color: '#00f5d4',
                    clipPath: 'polygon(0 55%, 100% 55%, 100% 100%, 0 100%)',
                    transform: 'translateX(4px)',
                    animation: 'glitch-2 2s infinite linear alternate-reverse',
                  }}
                >
                  404
                </div>
              </motion.div>
            </div>

            {/* Error Message */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="space-y-3 mb-8"
            >
              <div className="flex items-center justify-center gap-2 text-amber-400">
                <Warning weight="fill" className="w-5 h-5" />
                <span className="text-sm font-mono uppercase tracking-wider">
                  {d("notFound.signalLost", "信号丢失")}
                </span>
              </div>
              
              <h2 className="text-xl font-medium text-white/90">
                {d("notFound.title", "页面未找到")}
              </h2>
              
              <p className="text-sm text-white/50 max-w-xs mx-auto">
                {d("notFound.description", "您访问的页面不存在或已被移除")}
              </p>
            </motion.div>

            {/* Terminal Status Lines */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="font-mono text-xs text-left space-y-1 mb-8 p-4 rounded-lg bg-black/40 border border-white/[0.06]"
            >
              <div className="flex items-center gap-2">
                <span className="text-[#00f5d4]">$</span>
                <span className="text-white/60">ping target_page</span>
              </div>
              <div className="text-red-400/80">Request timeout</div>
              <div className="flex items-center gap-2">
                <span className="text-[#00f5d4]">$</span>
                <span className="text-white/60">trace_route</span>
              </div>
              <div className="text-amber-400/80">{d("notFound.connectionFailed", "连接失败")}</div>
              <div className="flex items-center gap-2">
                <span className="text-[#00f5d4]">$</span>
                <span className="text-white/60 animate-pulse">_</span>
              </div>
            </motion.div>

            {/* Back Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#00f5d4] text-black font-medium transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,245,212,0.3)] hover:scale-[1.02] active:scale-[0.98]"
              >
                <House weight="fill" className="w-4 h-4" />
                {d("notFound.backToHome", "返回首页")}
              </Link>
            </motion.div>
          </div>

          {/* Terminal Footer */}
          <div className="px-4 py-2 border-t border-white/[0.06] bg-white/[0.02] flex items-center justify-between text-[10px] font-mono text-white/30">
            <span>{d("notFound.code", "错误代码: 404")}</span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500/60 animate-pulse" />
              <span>DISCONNECTED</span>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute -top-20 -right-20 w-40 h-40 rounded-full border border-[#00f5d4]/10"
          style={{ animation: 'spin 20s linear infinite' }}
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="absolute -bottom-16 -left-16 w-32 h-32 rounded-full border border-[#00f5d4]/5"
          style={{ animation: 'spin 15s linear infinite reverse' }}
        />
      </motion.div>

      {/* Global Styles for Glitch Animation */}
      <style jsx global>{`
        @keyframes glitch-1 {
          0%, 100% { transform: translateX(-4px); }
          20% { transform: translateX(-2px); }
          40% { transform: translateX(-6px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(-5px); }
        }
        @keyframes glitch-2 {
          0%, 100% { transform: translateX(4px); }
          20% { transform: translateX(2px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(3px); }
          80% { transform: translateX(5px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/**
 * Glitch Text Component
 */
function GlitchText({ text }: { text: string }) {
  return (
    <span className="relative inline-block">
      {text.split("").map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.3 + i * 0.1,
            duration: 0.3,
            type: "spring",
            stiffness: 500,
          }}
          className="inline-block"
        >
          {char}
        </motion.span>
      ))}
    </span>
  );
}
