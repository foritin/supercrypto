'use client';

import { useState, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useAccount } from 'wagmi';
import { 
  Eye, 
  ShieldCheck, 
  XCircle, 
  RefreshCw,
  Filter,
  Download
} from 'lucide-react';
import { motion } from 'framer-motion';

import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { GlowStatusBadge } from '@/components/ui/glow-status-badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn, truncateAddress, formatCurrency } from '@/lib/utils';
import type { RedemptionRequest, RedemptionStatus } from '@/types/treasury';

interface RedemptionQueueTableProps {
  requests: RedemptionRequest[];
  isLoading?: boolean;
  onViewDetails: (request: RedemptionRequest) => void;
  onSign: (request: RedemptionRequest) => void;
  onExecute: (request: RedemptionRequest) => void;
  onReject: (request: RedemptionRequest) => void;
  canSignAction?: boolean;
  canExecuteAction?: boolean;
  canRejectAction?: boolean;
}

// Progress bar with glow effect
const ProgressBar = ({ 
  progress, 
  threshold 
}: { 
  progress: number
  threshold: number 
}) => {
  const isComplete = progress >= threshold
  const percentage = Math.min((progress / threshold) * 100, 100)
  
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className={cn(
            "h-full rounded-full",
            isComplete ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.4)]"
          )}
        />
      </div>
      <span className={cn(
        "text-[11px] tabular-nums font-medium",
        isComplete ? "text-emerald-400" : "text-white/50"
      )}>
        {progress}/{threshold}
      </span>
    </div>
  )
}

/**
 * Redemption Queue Table - Contract Monitor Style
 */
export function RedemptionQueueTable({
  requests,
  isLoading = false,
  onViewDetails,
  onSign,
  onExecute,
  onReject,
  canSignAction = true,
  canExecuteAction = true,
  canRejectAction = true,
}: RedemptionQueueTableProps) {
  const { address: currentUserAddress } = useAccount();
  const [statusFilter, setStatusFilter] = useState<RedemptionStatus | 'all'>('all');

  // Filter requests by status
  const filteredRequests = useMemo(() => {
    if (statusFilter === 'all') return requests;
    return requests.filter(r => r.status === statusFilter);
  }, [requests, statusFilter]);

  // Calculate summary stats
  const summary = useMemo(() => {
    const pending = requests.filter(r => r.status === 'pending');
    const signing = requests.filter(r => r.status === 'signing');
    const pendingTotal = pending.reduce((sum, r) => sum + parseFloat(r.totalAmount), 0);
    
    // Count awaiting current user's signature
    const awaitingUser = signing.filter(r => {
      const hasSigned = r.signatures.some(
        sig => sig.signerAddress.toLowerCase() === currentUserAddress?.toLowerCase()
      );
      return !hasSigned;
    }).length;

    return {
      pendingCount: pending.length,
      pendingTotal,
      signingCount: signing.length,
      awaitingUser,
    };
  }, [requests, currentUserAddress]);

  // Status to GlowStatusBadge mapping
  const getStatusConfig = (status: RedemptionStatus) => {
    switch (status) {
      case 'pending':
        return { variant: 'warning' as const, label: 'Pending', pulse: false, glow: false };
      case 'signing':
        return { variant: 'cyan' as const, label: 'Signing', pulse: true, glow: true };
      case 'executed':
        return { variant: 'success' as const, label: 'Executed', pulse: false, glow: true };
      case 'rejected':
        return { variant: 'error' as const, label: 'Rejected', pulse: false, glow: false };
      case 'cancelled':
        return { variant: 'default' as const, label: 'Cancelled', pulse: false, glow: false };
      default:
        return { variant: 'default' as const, label: status, pulse: false, glow: false };
    }
  };

  // Table columns
  const columns: ColumnDef<RedemptionRequest>[] = useMemo(() => [
    {
      accessorKey: 'requestId',
      header: 'Request ID',
      size: 90,
      cell: ({ row }) => (
        <span className="text-sm font-mono text-white/70">
          #{row.original.requestId}
        </span>
      ),
    },
    {
      accessorKey: 'userAddress',
      header: 'User',
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-mono text-white/80">
            {truncateAddress(row.original.userAddress)}
          </span>
          {row.original.userName && (
            <span className="text-xs text-white/40">{row.original.userName}</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'totalAmount',
      header: 'Amount',
      size: 130,
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-white font-medium">
            {formatCurrency(parseFloat(row.original.totalAmount))}
          </span>
          <span className="text-xs text-white/40">
            {row.original.assetSymbol}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 110,
      cell: ({ row }) => {
        const status = row.original.status;
        const config = getStatusConfig(status);
        return (
          <GlowStatusBadge 
            variant={config.variant}
            pulse={config.pulse}
            glow={config.glow}
          >
            {config.label}
          </GlowStatusBadge>
        );
      },
    },
    {
      accessorKey: 'signatures',
      header: 'Progress',
      size: 110,
      cell: ({ row }) => {
        const { signatures, threshold } = row.original;
        return (
          <ProgressBar progress={signatures.length} threshold={threshold} />
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Time',
      size: 90,
      cell: ({ row }) => {
        const date = new Date(row.original.createdAt);
        const now = new Date();
        const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
        
        let timeText;
        if (diffHours < 1) {
          timeText = 'Just now';
        } else if (diffHours < 24) {
          timeText = `${diffHours}h ago`;
        } else {
          const diffDays = Math.floor(diffHours / 24);
          timeText = `${diffDays}d ago`;
        }
        
        return (
          <span className="text-xs text-white/40">{timeText}</span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      size: 160,
      cell: ({ row }) => {
        const request = row.original;
        const canSign = canSignAction && request.status === 'signing' && request.proposalId !== undefined && !request.signatures.some(
          sig => sig.signerAddress.toLowerCase() === currentUserAddress?.toLowerCase()
        );
        const canExecute = canExecuteAction && request.status === 'signing' && request.proposalId !== undefined && request.signatures.length >= request.threshold;
        
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onViewDetails(request)}
              className="h-8 w-8 text-white/40 hover:text-white/80 hover:bg-white/5"
            >
              <Eye className="w-4 h-4" />
            </Button>
            
            {canSign && (
              <Button
                size="sm"
                onClick={() => onSign(request)}
                className="h-8 px-3 text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40 hover:border-cyan-400/60 transition-all hover:shadow-[0_0_15px_rgba(34,211,238,0.3)]"
              >
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                Sign
              </Button>
            )}

            {canExecute && (
              <Button
                size="sm"
                onClick={() => onExecute(request)}
                className="h-8 px-3 text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 hover:border-emerald-400/60 transition-all hover:shadow-[0_0_15px_rgba(52,211,153,0.3)]"
              >
                Execute
              </Button>
            )}
            
            {canRejectAction && request.status === 'pending' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onReject(request)}
                className="h-8 w-8 text-white/30 hover:text-rose-400 hover:bg-rose-500/10"
              >
                <XCircle className="w-4 h-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ], [currentUserAddress, onViewDetails, onSign, onExecute, onReject, canSignAction, canExecuteAction, canRejectAction]);

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-white/5 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-5">
      {/* Summary & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Summary */}
        <div className="flex flex-wrap items-center gap-3">
          <GlowStatusBadge variant="warning">
            Pending: {summary.pendingCount}
          </GlowStatusBadge>
          
          <GlowStatusBadge variant="default">
            Total: {formatCurrency(summary.pendingTotal)}
          </GlowStatusBadge>
          
          {summary.awaitingUser > 0 && (
            <GlowStatusBadge variant="cyan" glow>
              {summary.awaitingUser} awaiting signature
            </GlowStatusBadge>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Select 
            value={statusFilter} 
            onValueChange={(v) => setStatusFilter(v as RedemptionStatus | 'all')}
          >
            <SelectTrigger className="w-[140px] h-9 bg-black/20 border-white/10 text-white/70 text-sm">
              <Filter className="w-4 h-4 mr-2 text-white/40" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent className="bg-[#0f1119] border-white/10">
              <SelectItem value="all" className="text-sm text-white/70">All Status</SelectItem>
              <SelectItem value="pending" className="text-sm text-white/70">Pending</SelectItem>
              <SelectItem value="signing" className="text-sm text-white/70">Signing</SelectItem>
              <SelectItem value="executed" className="text-sm text-white/70">Executed</SelectItem>
              <SelectItem value="rejected" className="text-sm text-white/70">Rejected</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 bg-black/20 border-white/10 hover:bg-white/5 hover:border-white/20"
          >
            <RefreshCw className="w-4 h-4 text-white/40" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 bg-black/20 border-white/10 hover:bg-white/5 hover:border-white/20"
          >
            <Download className="w-4 h-4 text-white/40" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <DataTable 
        columns={columns} 
        data={filteredRequests}
      />
    </div>
  );
}
