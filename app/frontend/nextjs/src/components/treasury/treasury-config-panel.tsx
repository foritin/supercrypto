'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Rocket,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  Wallet,
  Info
} from 'lucide-react';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useReadContract } from 'wagmi';

import { AdminCard } from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { GlowStatusBadge } from '@/components/ui/glow-status-badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, truncateAddress } from '@/lib/utils';
import { devToolsService, type TokenRecipient, type TreasuryConfigResponse } from '@/services/dev-tools';
import { usePlatformInfoStore } from '@/stores/platform-info-store';
import type { MultisigConfig } from '@/types/treasury';

import { ThresholdSlider } from './threshold-slider';

const ERC20_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

const SUBSCRIPTION_PROVIDER_ABI = [
  {
    type: 'function',
    name: 'ADDRESS_PROVIDER',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

const ADDRESS_PROVIDER_TREASURY_ABI = [
  {
    type: 'function',
    name: 'get_treasury',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// ═══════════════════════════════════════════════════════════
// Contract Monitor Style Components
// ═══════════════════════════════════════════════════════════

const MiniStat = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/20 border border-white/10 text-xs">
    <span className="text-white/60">{label}</span>
    <span className="text-white/85 font-medium">{value}</span>
  </div>
)

const InfoRow = ({ label, value, loading }: { label: string; value: string; loading?: boolean }) => (
  <div className="flex items-center justify-between py-2 text-sm">
    <span className="text-white/60">{label}</span>
    <span className={cn(
      "font-mono",
      loading ? "text-white/50" : "text-white/85"
    )}>
      {loading ? '...' : value}
    </span>
  </div>
)

function formatTokenBalance(raw?: bigint, decimals?: number): string {
  if (raw === undefined || decimals === undefined) return '--';

  const base = 10n ** BigInt(decimals);
  const whole = raw / base;
  const fraction = raw % base;

  if (fraction === 0n) return whole.toString();

  const fractionStr = fraction
    .toString()
    .padStart(decimals, '0')
    .slice(0, 4)
    .replace(/0+$/, '');

  return fractionStr ? `${whole.toString()}.${fractionStr}` : whole.toString();
}

interface TreasuryConfigPanelProps {
  initialConfig?: Partial<MultisigConfig>;
  onDeploy: (config: { signers: string[]; threshold: number }) => Promise<void>;
  isDeploying?: boolean;
  canConfigure?: boolean;
}

/**
 * Treasury Config Panel - Frosted Crystal Edition
 */
export function TreasuryConfigPanel({
  initialConfig,
  onDeploy,
  isDeploying = false,
  canConfigure = true,
}: TreasuryConfigPanelProps) {
  const MIN_SIGNERS = 3;
  const MAX_SIGNERS = 10;

  const [signers, setSigners] = useState<string[]>(initialConfig?.signers?.map(s => s.address) || []);
  const [threshold, setThreshold] = useState(initialConfig?.threshold || 2);
  const [deployedConfig, setDeployedConfig] = useState<MultisigConfig | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isExpanded, setIsExpanded] = useState(canConfigure);
  const [candidates, setCandidates] = useState<TokenRecipient[]>([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [persistedConfig, setPersistedConfig] = useState<TreasuryConfigResponse | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const addressInfo = usePlatformInfoStore((s) => s.addressInfo);
  const isPlatformLoaded = usePlatformInfoStore((s) => s.isLoaded);
  const refreshPlatform = usePlatformInfoStore((s) => s.refresh);

  useEffect(() => {
    if (!isPlatformLoaded) {
      void refreshPlatform();
    }
  }, [isPlatformLoaded, refreshPlatform]);

  useEffect(() => {
    if (!canConfigure) {
      setIsExpanded(false);
    }
  }, [canConfigure]);

  const subscriptionAddress = useMemo(() => {
    const byTypeAndName = addressInfo.find((c) => {
      const type = (c.contract_type || '').toLowerCase();
      const name = (c.name || '').toLowerCase();
      return type === 'defi' && name.includes('subscription');
    });
    if (byTypeAndName) return byTypeAndName.address;

    const byName = addressInfo.find((c) =>
      (c.name || '').toLowerCase().includes('subscription')
    );
    return byName?.address;
  }, [addressInfo]);

  const {
    data: subscriptionProviderAddress,
    isLoading: isProviderAddressLoading,
    isError: isProviderAddressError,
  } = useReadContract({
    address: subscriptionAddress as `0x${string}` | undefined,
    abi: SUBSCRIPTION_PROVIDER_ABI,
    functionName: 'ADDRESS_PROVIDER',
    query: {
      enabled: !!subscriptionAddress,
    },
  });

  const providerAddress = subscriptionProviderAddress as `0x${string}` | undefined;
  const providerReady = !!providerAddress && providerAddress.toLowerCase() !== ZERO_ADDRESS;

  const {
    data: onChainTreasuryAddress,
    isLoading: isTreasuryAddressLoading,
    isError: isTreasuryAddressError,
  } = useReadContract({
    address: providerAddress,
    abi: ADDRESS_PROVIDER_TREASURY_ABI,
    functionName: 'get_treasury',
    query: {
      enabled: providerReady,
    },
  });

  const treasuryAddress = onChainTreasuryAddress as `0x${string}` | undefined;
  const treasuryAddressLabel = 'AddressProvider.get_treasury() via Subscription.ADDRESS_PROVIDER';

  const treasuryConfigured =
    !!treasuryAddress && treasuryAddress.toLowerCase() !== ZERO_ADDRESS;

  const treasuryReadMessage = useMemo(() => {
    if (!subscriptionAddress) return 'Subscription contract address not found';
    if (isProviderAddressLoading) return 'Reading AddressProvider from Subscription...';
    if (isProviderAddressError || !providerAddress) return 'Failed to read Subscription.ADDRESS_PROVIDER';
    if (providerAddress.toLowerCase() === ZERO_ADDRESS) return 'Subscription.ADDRESS_PROVIDER is ZERO_ADDRESS';
    if (isTreasuryAddressLoading) return 'Reading treasury address from chain...';
    if (isTreasuryAddressError || !treasuryAddress) return 'Failed to read AddressProvider.get_treasury()';
    if (!treasuryConfigured) return 'On-chain treasury is ZERO_ADDRESS (not configured)';
    return null;
  }, [
    isProviderAddressError,
    isProviderAddressLoading,
    isTreasuryAddressError,
    isTreasuryAddressLoading,
    providerAddress,
    subscriptionAddress,
    treasuryAddress,
    treasuryConfigured,
  ]);

  const stablecoinContracts = useMemo(() => {
    return addressInfo.filter((c) =>
      c.scope === 'global' && (c.contract_type || '').toLowerCase() === 'stablecoin'
    );
  }, [addressInfo]);

  const usdcAddress = useMemo(() => {
    const usdc = stablecoinContracts.find((c) => (c.name || '').toUpperCase() === 'USDC');
    return usdc?.address;
  }, [stablecoinContracts]);

  const usdtAddress = useMemo(() => {
    const usdt = stablecoinContracts.find((c) => (c.name || '').toUpperCase() === 'USDT');
    return usdt?.address;
  }, [stablecoinContracts]);

  const { data: usdcRawBalance, isLoading: isUsdcBalanceLoading } = useReadContract({
    address: usdcAddress as `0x${string}` | undefined,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: treasuryAddress ? [treasuryAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!usdcAddress && !!treasuryAddress && treasuryConfigured,
    },
  });

  const { data: usdcDecimals } = useReadContract({
    address: usdcAddress as `0x${string}` | undefined,
    abi: ERC20_ABI,
    functionName: 'decimals',
    query: {
      enabled: !!usdcAddress,
    },
  });

  const { data: usdtRawBalance, isLoading: isUsdtBalanceLoading } = useReadContract({
    address: usdtAddress as `0x${string}` | undefined,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: treasuryAddress ? [treasuryAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!usdtAddress && !!treasuryAddress && treasuryConfigured,
    },
  });

  const { data: usdtDecimals } = useReadContract({
    address: usdtAddress as `0x${string}` | undefined,
    abi: ERC20_ABI,
    functionName: 'decimals',
    query: {
      enabled: !!usdtAddress,
    },
  });

  const loadCandidates = useCallback(async () => {
    setIsLoadingCandidates(true);
    try {
      const recipients = await devToolsService.getTokenRecipients();
      setCandidates(recipients);
    } catch (error) {
      console.error('Failed to load signer candidates:', error);
      setCandidates([]);
    } finally {
      setIsLoadingCandidates(false);
    }
  }, []);

  const loadTreasuryConfig = useCallback(async () => {
    setIsLoadingConfig(true);
    try {
      const config = await devToolsService.getTreasuryConfig();
      setPersistedConfig(config);
      setSigners(config.signers || []);
      setThreshold(config.required_signatures || 2);
      setLastSyncedAt(new Date());
    } catch (error) {
      console.error('Failed to load treasury config:', error);
      setPersistedConfig(null);
    } finally {
      setIsLoadingConfig(false);
    }
  }, []);

  useEffect(() => {
    void loadCandidates();
    void loadTreasuryConfig();
  }, [loadCandidates, loadTreasuryConfig]);

  const selectableCandidates = useMemo(() => {
    return candidates
      .filter((candidate) => (candidate.roles || []).some((r) => r.toLowerCase() === 'admin'))
      .sort((a, b) => {
      const aIsOwner = (a.roles || []).some((r) => r.toLowerCase() === 'contract_owner');
      const bIsOwner = (b.roles || []).some((r) => r.toLowerCase() === 'contract_owner');
      if (aIsOwner === bIsOwner) return 0;
      return aIsOwner ? -1 : 1;
      });
  }, [candidates]);

  const candidateRoleMap = useMemo(() => {
    const roleMap = new Map<string, string[]>();
    for (const candidate of selectableCandidates) {
      roleMap.set(
        candidate.address.toLowerCase(),
        (candidate.roles || []).map((r) => r.toLowerCase())
      );
    }
    return roleMap;
  }, [selectableCandidates]);

  const hasContractOwnerSigner = useMemo(() => {
    return signers.some((addr) =>
      (candidateRoleMap.get(addr.toLowerCase()) || []).includes('contract_owner')
    );
  }, [candidateRoleMap, signers]);

  const handleSignersChange = useCallback((newSigners: string[]) => {
    setSigners(newSigners);
    if (threshold > newSigners.length) {
      setThreshold(Math.max(1, newSigners.length));
    }
  }, [threshold]);

  const toggleSignerSelection = useCallback((address: string, checked: boolean) => {
    const lowerAddress = address.toLowerCase();
    if (checked) {
      const next = [...signers, lowerAddress].slice(0, MAX_SIGNERS);
      handleSignersChange(Array.from(new Set(next)));
      return;
    }
    handleSignersChange(signers.filter((s) => s.toLowerCase() !== lowerAddress));
  }, [handleSignersChange, signers]);

  const handleDeploy = async () => {
    if (!isValid) return;
    if (!hasContractOwnerSigner) {
      notification.error('Signer set must include at least one contract_owner account');
      return;
    }
    
    try {
      await onDeploy({ signers, threshold });
      const contractAddress = treasuryAddress || undefined;
      setDeployedConfig({
        signers: signers.map(addr => ({ address: addr, isActive: true })),
        threshold,
        ...(contractAddress ? { contractAddress } : {}),
        balance: '0',
        environment: 'hardhat',
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
      await loadTreasuryConfig();
    } catch (error) {
      console.error('Deploy failed:', error);
    }
  };

  const handleReset = () => {
    if (persistedConfig) {
      setSigners(persistedConfig.signers || []);
      setThreshold(persistedConfig.required_signatures || 2);
    } else {
      setSigners([]);
      setThreshold(2);
    }
    setDeployedConfig(null);
    setShowSuccess(false);
  };

  const isValid = signers.length >= MIN_SIGNERS && threshold >= 2 && threshold <= signers.length && hasContractOwnerSigner;
  const validationMessage = !isValid 
    ? signers.length < MIN_SIGNERS 
      ? `At least ${MIN_SIGNERS} signers required`
      : !hasContractOwnerSigner
        ? 'Signer set must include at least one contract owner'
      : threshold > signers.length
        ? 'Threshold cannot exceed number of signers'
        : 'Threshold must be at least 2'
    : null;

  const multisigConfigured = (persistedConfig?.is_initialized ?? false) || !!deployedConfig;

  return (
    <AdminCard>
      <div className="px-6 py-5 border-b border-white/14">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          {/* Left: Title & Description */}
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center">
                <Shield className="w-4 h-4 text-[#00d4aa]" strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-semibold text-white">
                Treasury Setup
              </h3>
            </div>
            <p className="text-sm text-white/75">
              Configure treasury signers and threshold, then confirm on-chain status.
            </p>
            <p className="text-xs text-white/65">
              Source: On-chain{lastSyncedAt ? ` · Last synced ${lastSyncedAt.toLocaleTimeString()}` : ''}
            </p>
          </div>

          {/* Right: Status Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {isLoadingConfig ? (
              <GlowStatusBadge variant="default" icon={<Loader2 className="w-3 h-3 animate-spin" />}>Loading...</GlowStatusBadge>
            ) : multisigConfigured ? (
              <GlowStatusBadge variant="success" icon={<CheckCircle2 className="w-3 h-3" />} glow>Configured</GlowStatusBadge>
            ) : (
              <GlowStatusBadge variant="warning" icon={<AlertCircle className="w-3 h-3" />} pulse glow>Not Configured</GlowStatusBadge>
            )}
            <MiniStat label="Signers" value={`${signers.length}/${MIN_SIGNERS}`} />
            <MiniStat label="Threshold" value={`${threshold}/${Math.max(signers.length, MIN_SIGNERS)}`} />
            <Button 
              variant="outline" 
              size="sm" 
              disabled={!canConfigure}
              onClick={() => setIsExpanded((v) => !v)}
              title={canConfigure ? undefined : 'Only contract owner can configure treasury'}
              className="h-7 text-[11px] bg-transparent border-white/[0.08] hover:bg-white/[0.03] hover:border-white/[0.12] text-white/75 disabled:opacity-45 disabled:cursor-not-allowed"
            >
              {canConfigure ? (isExpanded ? 'Collapse' : 'Configure') : 'View Only'}
              {canConfigure ? (
                isExpanded ? <ChevronUp className="ml-1.5 h-3 w-3" /> : <ChevronDown className="ml-1.5 h-3 w-3" />
              ) : null}
            </Button>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="rounded-lg border border-white/14 bg-black/25 px-3 py-3">
            <div className="text-xs text-white/60 uppercase tracking-wider mb-1">Treasury</div>
            <div className="text-sm text-white/90 font-mono">
              {treasuryConfigured ? truncateAddress(treasuryAddress) : 'Unconfigured'}
            </div>
          </div>
          <div className="rounded-lg border border-white/14 bg-black/25 px-3 py-3">
            <div className="text-xs text-white/60 uppercase tracking-wider mb-1">USDC</div>
            <div className="text-sm text-white/90 font-mono">
              {formatTokenBalance(usdcRawBalance as bigint | undefined, usdcDecimals !== undefined ? Number(usdcDecimals) : undefined)}
            </div>
          </div>
          <div className="rounded-lg border border-white/14 bg-black/25 px-3 py-3">
            <div className="text-xs text-white/60 uppercase tracking-wider mb-1">USDT</div>
            <div className="text-sm text-white/90 font-mono">
              {formatTokenBalance(usdtRawBalance as bigint | undefined, usdtDecimals !== undefined ? Number(usdtDecimals) : undefined)}
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="p-6 space-y-5">
              {/* Success Alert */}
              <AnimatePresence>
                {showSuccess && deployedConfig && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3"
                  >
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      <div className="text-sm text-emerald-400/80">
                        Treasury multisig deployed successfully at{' '}
                        <span className="font-mono">{deployedConfig.contractAddress?.slice(0, 12)}...</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Main Grid */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                {/* Left Column - Signers */}
                <div className="rounded-lg border border-white/15 bg-black/25 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_16px_40px_rgba(0,0,0,0.35)] p-4 space-y-4">
                  {/* Signers Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-white/85">Signers</span>
                      <span className="text-[11px] text-white/55">({signers.length} configured)</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void loadCandidates()}
                      disabled={isLoadingCandidates || isDeploying}
                      className="h-7 text-[11px] text-white/65 hover:text-white/90 hover:bg-white/[0.03]"
                    >
                      {isLoadingCandidates ? 'Loading...' : 'Refresh'}
                    </Button>
                  </div>

                  {/* Signer Selector */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={isLoadingCandidates || isDeploying}
                        className="w-full justify-between h-9 text-[12px] bg-transparent border-white/[0.06] hover:bg-white/[0.02] hover:border-white/[0.1] text-white/80"
                      >
                        <span>
                          {signers.length > 0
                            ? `${signers.length} signer(s) selected`
                            : 'Select signers from account list'}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      side="bottom"
                      sideOffset={8}
                      collisionPadding={16}
                      className="z-[80] w-[var(--radix-popover-trigger-width)] min-w-[420px] max-w-[560px] p-2 bg-[#0d0e14]/98 backdrop-blur-xl border border-white/20 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_24px_64px_rgba(0,0,0,0.55)]"
                    >
                      <div className="max-h-72 overflow-auto space-y-0.5">
                        {selectableCandidates.map((candidate) => {
                          const checked = signers.some(
                            (s) => s.toLowerCase() === candidate.address.toLowerCase()
                          );
                          return (
                            <label
                              key={candidate.address}
                              className="flex items-center gap-3 rounded-[4px] px-3 py-2.5 hover:bg-white/[0.03] cursor-pointer transition-colors"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) =>
                                  toggleSignerSelection(candidate.address, Boolean(v))
                                }
                                className="border-white/[0.15] data-[state=checked]:bg-[#00d4aa]/80 data-[state=checked]:border-[#00d4aa]/80"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-[12px] text-white/85 truncate">{candidate.label || truncateAddress(candidate.address)}</div>
                                <div className="text-[10px] text-white/55 font-mono">
                                  {truncateAddress(candidate.address)}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                        {selectableCandidates.length === 0 && (
                          <div className="px-3 py-2 text-[11px] text-white/55">
                            No admin accounts available for signer selection
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Selected Signers List */}
                  {signers.length > 0 && (
                    <div className="rounded-[4px] border border-white/[0.12] bg-white/[0.02] p-3 space-y-1">
                      {signers.map((addr) => (
                        <div key={addr} className="flex items-center justify-between py-1.5">
                          <span className="text-[12px] font-mono text-white/80">{truncateAddress(addr)}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSignerSelection(addr, false)}
                            className="h-6 px-2 text-[11px] text-white/55 hover:text-white/80 hover:bg-white/[0.03]"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Validation Status */}
                  <div className={cn(
                    'flex items-center gap-2 text-[11px]',
                    signers.length >= MIN_SIGNERS ? 'text-[#00d4aa]/60' : 'text-amber-400/60'
                  )}>
                    {signers.length >= MIN_SIGNERS ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {signers.length} selected (minimum {MIN_SIGNERS}, maximum {MAX_SIGNERS})
                    </span>
                  </div>

                  <div className={cn(
                    'flex items-center gap-2 text-[11px]',
                    hasContractOwnerSigner ? 'text-[#00d4aa]/60' : 'text-amber-400/70'
                  )}>
                    {hasContractOwnerSigner ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5" />
                    )}
                    <span>Selected signers must include at least one contract owner</span>
                  </div>

                  {/* Threshold */}
                  <div className="space-y-2 pt-2">
                    <h4 className="text-[12px] font-medium text-white/80">Required Signatures</h4>
                    <div className="rounded-[4px] border border-white/[0.12] bg-white/[0.02] p-3">
                      <ThresholdSlider
                        value={threshold}
                        max={Math.max(signers.length, MIN_SIGNERS)}
                        onChange={setThreshold}
                        min={2}
                        disabled={signers.length < MIN_SIGNERS}
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column - On-chain Info */}
                <div className="rounded-[4px] border border-white/[0.14] bg-white/[0.015] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_14px_32px_rgba(0,0,0,0.28)] p-4 space-y-4">
                  {/* Treasury Address */}
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-[4px] bg-white/[0.03] flex items-center justify-center shrink-0">
                      <Wallet className="w-3.5 h-3.5 text-white/65" strokeWidth={1.5} />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="text-[12px] font-medium text-white/80">On-chain Treasury</div>
                      <div className="text-[12px] text-white/75 font-mono truncate">
                        {treasuryConfigured ? truncateAddress(treasuryAddress) : (treasuryReadMessage || 'Not found')}
                      </div>
                      <div className="text-[10px] text-white/45 truncate">
                        Source: {treasuryAddressLabel}
                      </div>
                    </div>
                  </div>

                  {/* Balances */}
                  <div className="rounded-[4px] border border-white/[0.12] bg-white/[0.02] p-3 space-y-2">
                    <InfoRow 
                      label="USDC" 
                      value={isUsdcBalanceLoading ? '...' : formatTokenBalance(
                        usdcRawBalance as bigint | undefined,
                        usdcDecimals !== undefined ? Number(usdcDecimals) : undefined
                      )}
                      loading={isUsdcBalanceLoading}
                    />
                    <div className="h-px bg-white/[0.04]" />
                    <InfoRow 
                      label="USDT" 
                      value={isUsdtBalanceLoading ? '...' : formatTokenBalance(
                        usdtRawBalance as bigint | undefined,
                        usdtDecimals !== undefined ? Number(usdtDecimals) : undefined
                      )}
                      loading={isUsdtBalanceLoading}
                    />
                  </div>

                  {/* Info Box */}
                  <div className="rounded-[4px] border border-white/[0.12] bg-white/[0.02] p-3">
                    <div className="flex items-start gap-2">
                      <Info className="w-3.5 h-3.5 text-white/45 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-white/65 leading-relaxed">
                        Project readiness requires treasury to be configured. Misconfigured treasury can cause subscription inflow visibility and custody issues.
                      </p>
                    </div>
                  </div>

                  <p className="text-[10px] text-white/45">
                    Data: on-chain calls via /dev/treasury/config
                  </p>
                </div>
              </div>

              {/* Validation Warning */}
              {!isLoadingConfig && validationMessage && (
                <div className="rounded-[4px] bg-amber-500/[0.05] border border-amber-500/[0.12] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400/70" />
                    <span className="text-[12px] text-amber-400/80">{validationMessage}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={isDeploying}
                  className="h-9 px-4 text-[12px] bg-transparent border-white/[0.08] hover:bg-white/[0.03] hover:border-white/[0.12] text-white/80"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-2" />
                  Reset
                </Button>
                
                <Button
                  onClick={handleDeploy}
                  disabled={!isValid || isDeploying}
                  className={cn(
                    "h-9 px-5 text-[12px] bg-[#00d4aa]/20 hover:bg-[#00d4aa]/30 text-[#00d4aa] border border-[#00d4aa]/30 hover:border-[#00d4aa]/50",
                    (!isValid || isDeploying) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {isDeploying ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                      Deploying...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-3.5 h-3.5 mr-2" />
                      Deploy Configuration
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminCard>
  );
}
