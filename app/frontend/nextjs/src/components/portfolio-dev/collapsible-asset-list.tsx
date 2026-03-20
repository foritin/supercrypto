'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import * as Collapsible from '@radix-ui/react-collapsible';
import { 
  TrendUp, 
  Clock, 
  CheckCircle,
  ArrowUpRight,
  CaretDown
} from '@phosphor-icons/react';
import { InvestmentDetailModal } from './investment-detail-modal';

interface Asset {
  id: string;
  name: string;
  symbol: string;
  invested: number;
  currentValue: number;
  expectedReturn: number;
  apy: number;
  status: 'active' | 'matured' | 'pending' | 'completed' | 'redeeming';
  daysLeft?: number | undefined;
  progress?: number | undefined;
  lockPeriod?: number | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
  redemptionId?: string | undefined;
}

export interface AssetGroup {
  title: string;
  type: 'wallet' | 'investment';
  totalValue: number;
  assets: Asset[];
  icon: React.ElementType;
  color: string;
}

interface CollapsibleAssetListProps {
  groups: AssetGroup[];
  className?: string;
}

const statusConfig = {
  active: { 
    label: 'Active', 
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    icon: TrendUp 
  },
  matured: { 
    label: 'Matured', 
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    icon: CheckCircle 
  },
  pending: { 
    label: 'Pending', 
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    icon: Clock 
  },
  completed: { 
    label: 'Completed', 
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/20',
    icon: CheckCircle 
  },
  redeeming: { 
    label: 'Redeeming', 
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
    icon: ArrowUpRight 
  },
};

function AssetRow({ 
  asset, 
  index,
  onClick 
}: { 
  asset: Asset; 
  index: number;
  onClick: () => void;
}) {
  const profit = asset.currentValue - asset.invested;
  const profitPercent = asset.invested > 0 ? (profit / asset.invested) * 100 : 0;
  const status = statusConfig[asset.status];
  const StatusIcon = status.icon;
  const isPositive = profit >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className={cn(
        'group flex items-center gap-4 p-4 cursor-pointer',
        'hover:bg-white/[0.03]',
        'transition-colors duration-200'
      )}
    >
      {/* Asset Icon */}
      <div className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0',
        'bg-gradient-to-br from-[#00f5d4]/20 to-[#8b5cf6]/20',
        'border border-[#00f5d4]/30 text-white'
      )}>
        {asset.symbol.slice(0, 2)}
      </div>

      {/* Asset Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white font-medium truncate">{asset.name}</span>
          <span className="text-white/30 text-xs">{asset.symbol}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={cn(
            'text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 border',
            status.bgColor,
            status.borderColor,
            status.color
          )}>
            <StatusIcon weight="fill" className="w-3 h-3" />
            {status.label}
          </span>
          {asset.status === 'active' && asset.daysLeft !== undefined && (
            <span className="text-white/40 text-xs">{asset.daysLeft} days left</span>
          )}
        </div>
      </div>

      {/* Value & Profit */}
      <div className="text-right shrink-0">
        <div className="text-white font-mono font-medium">
          ${asset.currentValue.toLocaleString()}
        </div>
        <div className={cn(
          'text-xs',
          isPositive ? 'text-emerald-400' : 'text-rose-400'
        )}>
          {isPositive ? '+' : ''}{profitPercent.toFixed(2)}%
        </div>
      </div>

      {/* Arrow */}
      <div className="p-2 rounded-lg text-white/20 group-hover:text-[#00f5d4] transition-colors shrink-0">
        <ArrowUpRight weight="bold" className="w-4 h-4" />
      </div>
    </motion.div>
  );
}

function AssetGroupSection({ group, defaultOpen = true }: { group: AssetGroup; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const Icon = group.icon;

  return (
    <>
      <Collapsible.Root open={isOpen} onOpenChange={setIsOpen}>
        <div className="rounded-2xl bg-[#0d0f14] border border-white/[0.08] overflow-hidden">
          {/* Header */}
          <Collapsible.Trigger asChild>
            <button className="w-full">
              <div 
                className={cn(
                  'flex items-center justify-between p-4',
                  'border-b transition-all duration-200',
                  isOpen 
                    ? 'border-white/[0.06] bg-white/[0.02]' 
                    : 'border-transparent hover:bg-white/[0.01]'
                )}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ 
                      background: `${group.color}15`,
                      border: `1px solid ${group.color}30`,
                    }}
                  >
                    <Icon weight="duotone" className="w-5 h-5" style={{ color: group.color }} />
                  </div>
                  
                  <div className="text-left">
                    <div className="text-white font-medium">{group.title}</div>
                    <div className="text-white/40 text-xs">{group.assets.length} assets</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-white font-mono font-semibold">
                      ${group.totalValue.toLocaleString()}
                    </div>
                    <div className="text-white/30 text-[10px]">
                      {((group.totalValue / 100000) * 100).toFixed(1)}% of portfolio
                    </div>
                  </div>

                  <div className={cn(
                    'p-2 rounded-lg transition-all duration-200',
                    'text-white/40',
                    isOpen && 'rotate-180 text-[#00f5d4]'
                  )}>
                    <CaretDown weight="bold" className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </button>
          </Collapsible.Trigger>

          {/* Content */}
          <Collapsible.Content asChild>
            <motion.div
              initial={false}
              animate={{ opacity: isOpen ? 1 : 0 }}
              transition={{ duration: 0.15 }}
            >
              <div className="divide-y divide-white/[0.04]">
                <AnimatePresence>
                  {isOpen && group.assets.map((asset, index) => (
                    <AssetRow 
                      key={asset.id} 
                      asset={asset} 
                      index={index}
                      onClick={() => setSelectedAsset(asset)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          </Collapsible.Content>
        </div>
      </Collapsible.Root>

      {/* Detail Modal */}
      <InvestmentDetailModal
        isOpen={!!selectedAsset}
        onClose={() => setSelectedAsset(null)}
        investment={selectedAsset}
        redemptionId={selectedAsset?.redemptionId}
      />
    </>
  );
}

export function CollapsibleAssetList({ groups, className }: CollapsibleAssetListProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {groups.map((group, index) => (
        <AssetGroupSection 
          key={group.title} 
          group={group} 
          defaultOpen={index === 0}
        />
      ))}
    </div>
  );
}
