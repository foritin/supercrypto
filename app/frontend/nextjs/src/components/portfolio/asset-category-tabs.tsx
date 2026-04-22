'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { 
  Wallet, 
  ChartPieSlice, 
  Lightning, 
  Clock,
  Briefcase
} from '@phosphor-icons/react';

export type AssetCategory = 'all' | 'active' | 'matured' | 'pending' | 'completed';

interface Category {
  id: AssetCategory;
  label: string;
  icon: React.ElementType;
  color: string;
}

interface AssetCategoryTabsProps {
  activeCategory: AssetCategory;
  onCategoryChange: (category: AssetCategory) => void;
  counts?: Record<AssetCategory, number>;
  className?: string;
}

export function AssetCategoryTabs({
  activeCategory,
  onCategoryChange,
  counts = { all: 0, active: 0, matured: 0, pending: 0, completed: 0 },
  className,
}: AssetCategoryTabsProps) {
  const { t } = useTranslation();

  const categories: Category[] = useMemo(() => ([
    {
      id: 'all',
      label: t('portfolio.filters.allAssets', { defaultValue: 'All Assets' }),
      icon: Briefcase,
      color: '#00f5d4',
    },
    {
      id: 'active',
      label: t('portfolio.status.active', { defaultValue: 'Active' }),
      icon: Lightning,
      color: '#10b981',
    },
    {
      id: 'matured',
      label: t('portfolio.status.matured', { defaultValue: 'Matured' }),
      icon: Clock,
      color: '#3b82f6',
    },
    {
      id: 'pending',
      label: t('portfolio.status.pending', { defaultValue: 'Pending' }),
      icon: Wallet,
      color: '#f59e0b',
    },
    {
      id: 'completed',
      label: t('portfolio.status.redeemed', { defaultValue: 'Completed' }),
      icon: ChartPieSlice,
      color: '#6b7280',
    },
  ]), [t]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={cn(
        'flex flex-wrap gap-2 p-2 rounded-2xl',
        'bg-white/[0.02] border border-white/[0.06]',
        className
      )}
    >
      {categories.map((category) => {
        const isActive = activeCategory === category.id;
        const count = counts[category.id] || 0;
        const Icon = category.icon;

        return (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={cn(
              'relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm',
              'transition-all duration-200',
              'hover:bg-white/[0.04]',
              isActive && 'bg-white/[0.08]'
            )}
          >
            {/* Active indicator */}
            {isActive && (
              <motion.div
                layoutId="activeCategory"
                className="absolute inset-0 rounded-xl"
                style={{
                  background: `linear-gradient(135deg, ${category.color}15 0%, transparent 100%)`,
                  border: `1px solid ${category.color}40`,
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}

            <span className="relative z-10 flex items-center gap-2">
              <Icon 
                weight={isActive ? 'fill' : 'duotone'}
                className="w-4 h-4"
                style={{ color: isActive ? category.color : undefined }}
              />
              <span className={cn(
                'font-medium font-body',
                isActive ? 'text-white' : 'text-white/60'
              )}>
                {category.label}
              </span>
              {count > 0 && (
                <span
                  className={cn(
                    'ml-1 px-1.5 py-0.5 rounded-lg text-xs font-mono tabular-nums',
                    isActive 
                      ? 'bg-white/20 text-white' 
                      : 'bg-white/10 text-white/50'
                  )}
                >
                  {count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </motion.div>
  );
}
