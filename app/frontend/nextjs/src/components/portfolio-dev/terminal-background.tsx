'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface TerminalBackgroundProps {
  className?: string;
}

export function TerminalBackground({ className }: TerminalBackgroundProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className={cn('fixed inset-0 overflow-hidden pointer-events-none', className)}>
      {/* Deep space gradient base */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050508] via-[#0a0b0e] to-[#08090c]" />

      {/* Grid System - Terminal Style */}
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

      {/* Hexagonal pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill-opacity='1' fill='none' stroke='%2300f5d4' stroke-width='0.5'/%3E%3C/svg%3E")`,
        }}
      />

      {/* CRT Scanline effect */}
      <div 
        className="absolute inset-0 opacity-[0.08]"
        style={{
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, 0.3) 2px,
            rgba(0, 0, 0, 0.3) 4px
          )`,
        }}
      />

      {/* Glowing orbs - Cyan */}
      <div 
        className="absolute w-[800px] h-[800px] rounded-full animate-pulse"
        style={{
          background: 'radial-gradient(circle, rgba(0, 245, 212, 0.08) 0%, transparent 60%)',
          top: '-20%',
          right: '-20%',
          filter: 'blur(60px)',
          animation: 'float-cyan 20s ease-in-out infinite',
        }}
      />

      {/* Glowing orbs - Amber */}
      <div 
        className="absolute w-[600px] h-[600px] rounded-full animate-pulse"
        style={{
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.06) 0%, transparent 60%)',
          bottom: '-10%',
          left: '-10%',
          filter: 'blur(50px)',
          animation: 'float-amber 15s ease-in-out infinite reverse',
        }}
      />

      {/* Glowing orbs - Purple */}
      <div 
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.05) 0%, transparent 60%)',
          top: '40%',
          left: '30%',
          filter: 'blur(40px)',
          animation: 'float-purple 18s ease-in-out infinite',
        }}
      />

      {/* Corner decorations */}
      <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-[#00f5d4]/20" />
      <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-[#00f5d4]/20" />
      <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-[#00f5d4]/20" />
      <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-[#00f5d4]/20" />

      {/* Vignette effect */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(5, 5, 8, 0.4) 100%)',
        }}
      />

      {/* Noise texture */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      <style jsx>{`
        @keyframes float-cyan {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, 30px) scale(1.1); }
        }
        @keyframes float-amber {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-20px, -20px) scale(1.05); }
        }
        @keyframes float-purple {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, -30px) scale(1.08); }
        }
      `}</style>
    </div>
  );
}
