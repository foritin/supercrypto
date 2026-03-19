'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface EmptyStateLottieProps {
  className?: string;
}

// CSS-based animated empty state as fallback until Lottie file is ready
export function EmptyStateLottie({ className }: EmptyStateLottieProps) {
  return (
    <div className={cn('relative w-[200px] h-[200px]', className)}>
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-32 h-32 rounded-full bg-[#00f5d4]/5 blur-2xl animate-pulse" />
      </div>
      
      {/* Chart frame */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="relative w-24 h-24 border border-white/10 rounded-lg p-3">
          {/* Grid lines */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-1/4 left-0 right-0 h-px bg-white/30" />
            <div className="absolute top-2/4 left-0 right-0 h-px bg-white/30" />
            <div className="absolute top-3/4 left-0 right-0 h-px bg-white/30" />
          </div>
          
          {/* Animated line chart */}
          <svg viewBox="0 0 80 60" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00f5d4" stopOpacity="0.5" />
                <stop offset="50%" stopColor="#00f5d4" stopOpacity="1" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="1" />
              </linearGradient>
              <linearGradient id="glowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00f5d4" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#00f5d4" stopOpacity="0" />
              </linearGradient>
            </defs>
            
            {/* Area fill */}
            <motion.path
              d="M 0 50 Q 20 45, 30 35 T 50 30 T 80 15 L 80 60 L 0 60 Z"
              fill="url(#glowGradient)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
            />
            
            {/* Line */}
            <motion.path
              d="M 0 50 Q 20 45, 30 35 T 50 30 T 80 15"
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ 
                duration: 2, 
                ease: "easeInOut",
                repeat: Infinity,
                repeatDelay: 1
              }}
            />
            
            {/* Data points */}
            {[
              { cx: 0, cy: 50, delay: 0 },
              { cx: 30, cy: 35, delay: 0.6 },
              { cx: 50, cy: 30, delay: 1.0 },
              { cx: 80, cy: 15, delay: 1.4 },
            ].map((point, i) => (
              <motion.circle
                key={i}
                cx={point.cx}
                cy={point.cy}
                r="3"
                fill="#00f5d4"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.2, 1], opacity: 1 }}
                transition={{
                  duration: 0.3,
                  delay: point.delay,
                  repeat: Infinity,
                  repeatDelay: 2.5,
                }}
              />
            ))}
          </svg>
          
          {/* Shimmer effect */}
          <div className="absolute inset-0 overflow-hidden rounded-lg">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{
                duration: 2,
                ease: 'linear',
                repeat: Infinity,
                repeatDelay: 3,
              }}
            />
          </div>
        </div>
      </motion.div>
      
      {/* Orbiting dots */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-[#00f5d4]"
          style={{
            top: '50%',
            left: '50%',
          }}
          animate={{
            x: [0, Math.cos(i * 2.09) * 80],
            y: [0, Math.sin(i * 2.09) * 80],
            opacity: [0, 1, 0],
            scale: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 3,
            delay: i * 1,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// Lottie wrapper for when actual Lottie file is available
interface LottieEmptyStateProps {
  className?: string;
}

export function LottieEmptyState({ className }: LottieEmptyStateProps) {
  // When Lottie file is ready, use this component
  // import { DotLottieReact } from '@lottiefiles/dotlottie-react';
  
  return (
    <div className={cn('w-[200px] h-[200px]', className)}>
      {/* Placeholder for Lottie - currently using CSS version above */}
      <EmptyStateLottie />
    </div>
  );
}
