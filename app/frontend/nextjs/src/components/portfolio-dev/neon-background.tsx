'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface NeonBackgroundProps {
  className?: string;
}

export function NeonBackground({ className }: NeonBackgroundProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className={cn('fixed inset-0 overflow-hidden pointer-events-none', className)}>
      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />
      
      {/* Floating Cyan Orb */}
      <div 
        className="absolute w-[500px] h-[500px] rounded-full animate-float-cyan"
        style={{
          background: 'radial-gradient(circle, rgba(0,245,212,0.08) 0%, transparent 70%)',
          top: '10%',
          left: '-10%',
          filter: 'blur(40px)',
        }}
      />
      
      {/* Floating Purple Orb */}
      <div 
        className="absolute w-[600px] h-[600px] rounded-full animate-float-purple"
        style={{
          background: 'radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 70%)',
          bottom: '10%',
          right: '-10%',
          filter: 'blur(50px)',
        }}
      />

      {/* Subtle Noise Texture Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
