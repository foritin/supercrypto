'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AdminLayoutProps {
  children: ReactNode;
  className?: string;
}

/**
 * Admin Layout - Contract Monitor Style
 * 统一的管理后台布局组件
 */
export function AdminLayout({ children, className = '' }: AdminLayoutProps) {
  return (
    <div className={`max-w-[1600px] mx-auto px-6 py-8 ${className}`}>
      {/* Subtle grid background */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 212, 170, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 212, 170, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

/**
 * Admin Page Header - Contract Monitor Style
 */
interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function AdminPageHeader({ title, subtitle, actions }: AdminPageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-8 flex justify-between items-start"
    >
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
        {subtitle && <p className="text-white/60">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </motion.div>
  );
}

/**
 * Admin Card - Contract Monitor Style
 * 统一使用 rgba(15, 15, 26, 0.6) 背景
 */
interface AdminCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function AdminCard({ children, className = '', delay = 0 }: AdminCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className={`rounded-xl overflow-hidden ${className}`}
      style={{ background: 'rgba(15, 15, 26, 0.6)' }}
    >
      {children}
    </motion.div>
  );
}

export default AdminLayout;
