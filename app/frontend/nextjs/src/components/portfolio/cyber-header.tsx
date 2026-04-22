'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TerminalWindow, Clock } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface CyberHeaderProps {
  className?: string;
}

export function CyberHeader({ className }: CyberHeaderProps) {
  const { t, i18n } = useTranslation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const locale = i18n.language.startsWith('zh') ? 'zh-CN' : 'en-US';

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = currentTime.toLocaleTimeString(locale, { 
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const dateStr = currentTime.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '.');

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'relative px-6 py-4 mb-8',
        'bg-[#0d0f14]/80 backdrop-blur-md',
        'border-b border-[#00f5d4]/20',
        className
      )}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00f5d4]/50 to-transparent" />

      <div className="flex items-center justify-between max-w-[1600px] mx-auto">
        {/* Left: Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10">
            {/* Animated rings */}
            <motion.div
              className="absolute inset-0 rounded-xl border border-[#00f5d4]/30"
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              style={{ borderStyle: 'dashed' }}
            />
            <div className="absolute inset-1 rounded-lg bg-gradient-to-br from-[#00f5d4]/20 to-[#8b5cf6]/20 flex items-center justify-center border border-[#00f5d4]/30">
              <TerminalWindow weight="duotone" className="w-5 h-5 text-[#00f5d4]" />
            </div>
          </div>
          
          <div>
            <h1 className="text-lg font-bold font-body text-white tracking-tight">
              {t('portfolio.cyberHeader.title', { defaultValue: 'PORTFOLIO' })}
              <span className="text-[#00f5d4]">_</span>
              {t('portfolio.cyberHeader.terminal', { defaultValue: 'TERMINAL' })}
            </h1>
            <p className="text-xs text-white/40 font-mono tracking-wide">
              {t('portfolio.cyberHeader.subtitle', { defaultValue: 'RWA INVESTMENT MONITORING SYSTEM' })}
            </p>
          </div>
        </div>

        {/* Right: Time */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-white/40">
            <Clock weight="duotone" className="w-4 h-4" />
            <span className="text-xs font-mono text-[#00f5d4]">{timeStr}</span>
          </div>
          <div className="h-4 w-[1px] bg-white/10" />
          <span className="text-[10px] font-mono text-white/30">{dateStr}</span>
        </div>
      </div>

      {/* Bottom scan line */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00f5d4]/30 to-transparent"
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
    </motion.header>
  );
}
