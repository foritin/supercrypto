'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TerminalWindow, ArrowRight } from '@phosphor-icons/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface CyberEmptyStateProps {
  className?: string;
}

export function CyberEmptyState({ className }: CyberEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'relative flex flex-col items-center justify-center',
        'min-h-[60vh] p-8',
        className
      )}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px]">
          {/* Rotating rings */}
          <motion.div
            className="absolute inset-0 rounded-full border border-[#00f5d4]/10"
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            style={{ borderStyle: 'dashed' }}
          />
          <motion.div
            className="absolute inset-8 rounded-full border border-[#00f5d4]/5"
            animate={{ rotate: -360 }}
            transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute inset-16 rounded-full border border-[#8b5cf6]/10"
            animate={{ rotate: 360 }}
            transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
            style={{ borderStyle: 'dotted' }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center">
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="relative w-24 h-24 mx-auto mb-6"
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#00f5d4]/20 to-[#8b5cf6]/20 animate-pulse" />
          <div className="absolute inset-1 rounded-xl bg-[#0a0b0e] flex items-center justify-center border border-[#00f5d4]/30">
            <TerminalWindow weight="duotone" className="w-10 h-10 text-[#00f5d4]" />
          </div>
          
          {/* Floating particles */}
          <motion.div
            className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-[#00f5d4]"
            animate={{ 
              y: [0, -10, 0],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-1 -left-3 w-3 h-3 rounded-full bg-[#8b5cf6]"
            animate={{ 
              y: [0, 8, 0],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
          />
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold text-white mb-3"
        >
          Portfolio<span className="text-[#00f5d4]">_</span>Empty
        </motion.h2>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-white/40 max-w-md mx-auto mb-8 text-sm leading-relaxed"
        >
          Your terminal is ready but no investments detected. Initialize your first RWA investment to begin tracking.
        </motion.p>

        {/* Terminal code block */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-[#0d0f14] border border-[#00f5d4]/20 rounded-lg p-4 mb-8 max-w-md mx-auto text-left"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-rose-400" />
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="ml-2 text-[10px] text-white/30 font-mono">terminal</span>
          </div>
          <div className="font-mono text-xs space-y-1">
            <p className="text-white/30">
              <span className="text-[#00f5d4]">$</span> status
            </p>
            <p className="text-white/60">wallet_connected: true</p>
            <p className="text-white/60">investments_found: 0</p>
            <p className="text-amber-400">{'>'} awaiting_first_investment...</p>
            <motion.p
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-[#00f5d4]"
            >
              _
            </motion.p>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Link href="/assets">
            <Button 
              size="lg"
              className={cn(
                'bg-[#00f5d4] text-black hover:bg-[#00f5d4]/90',
                'font-semibold px-8 group'
              )}
            >
              Explore Assets
              <ArrowRight weight="bold" className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}
