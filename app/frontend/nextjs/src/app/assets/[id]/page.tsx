"use client";

import { useState, useEffect, useCallback } from "react";
import { use } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import {
  ArrowLeft,
  Building2,
  Shield,
  Flame,
  TrendingUp,
  CheckCircle,
  Clock,
  PauseCircle,
  Copy,
  Check,
  FileText,
  MapPin,
  Wallet,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { assetService, type AssetDetail, ASSET_TYPE_NAMES, type AssetType, type AssetStatus } from "@/services/asset";
import { SubscriptionModal } from "@/components/subscription/subscription-modal";
import { MediaGallery } from "@/components/asset/media-gallery";
import { PropertyHighlights } from "@/components/asset/property-highlights";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// 资产类型图标
const ASSET_TYPE_ICONS: Record<AssetType, React.ReactNode> = {
  real_estate: <Building2 className="h-4 w-4" />,
  bond: <Shield className="h-4 w-4" />,
  commodity: <Flame className="h-4 w-4" />,
  equity: <TrendingUp className="h-4 w-4" />,
  other: <Building2 className="h-4 w-4" />,
};

// 状态配置
const STATUS_CONFIG: Record<AssetStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  active: { label: "Available", color: "#00D4AA", bg: "rgba(0,212,170,0.1)", icon: <CheckCircle className="h-4 w-4" /> },
  paused: { label: "Paused", color: "#FAAD14", bg: "rgba(250,173,20,0.1)", icon: <PauseCircle className="h-4 w-4" /> },
  sold_out: { label: "Sold Out", color: "#FF4D4F", bg: "rgba(255,77,79,0.1)", icon: <Clock className="h-4 w-4" /> },
  closed: { label: "Closed", color: "#8C8C8C", bg: "rgba(140,140,140,0.1)", icon: <Clock className="h-4 w-4" /> },
};

export default function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { t } = useTranslation();
  const router = useRouter();
  const { isConnected } = useAccount();
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("highlights");

  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAsset = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await assetService.getAsset(Number(resolvedParams.id));
      setAsset(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    fetchAsset();
  }, [fetchAsset]);

  const formatAmount = (amount: number) => {
    if (amount >= 1000000) return "$" + (amount / 1000000).toFixed(2) + "M";
    if (amount >= 1000) return "$" + (amount / 1000).toFixed(0) + "K";
    return "$" + amount.toFixed(0);
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="max-w-[1200px] mx-auto px-6 py-6">
        <Skeleton className="w-24 h-8 mb-6" />
        <Skeleton className="w-full h-[400px] rounded-xl mb-6" />
        <div className="space-y-4">
          <Skeleton className="w-3/4 h-6" />
          <Skeleton className="w-1/2 h-4" />
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-2/3 h-4" />
        </div>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="max-w-[800px] mx-auto px-6 py-16 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="text-white/50 text-lg">{t("assets.notFound")}</div>
          <Button variant="outline" onClick={() => router.push("/assets")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("common.back")}
          </Button>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_CONFIG[asset.status as AssetStatus];
  const progress = (asset.subscribed_amount / asset.total_supply) * 100;

  return (
    <TooltipProvider>
      <div className="min-h-screen pb-20">
        <div className="max-w-[1200px] mx-auto px-6">
          {/* 面包屑导航 */}
          <div className="flex items-center gap-2 mb-4 text-white/50 text-sm">
            <Button variant="ghost" size="sm" onClick={() => router.push("/assets")} className="text-white/70 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Assets
            </Button>
            <span className="text-white/30">/</span>
            <span className="text-white/80">{asset.name}</span>
          </div>

          {/* 标题栏 */}
          <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{asset.location || asset.name}</h1>
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[rgba(0,212,170,0.1)] border border-[rgba(0,212,170,0.2)] rounded-md text-[#00D4AA] text-xs">
                  {ASSET_TYPE_ICONS[asset.asset_type as AssetType]}
                  {ASSET_TYPE_NAMES[asset.asset_type as AssetType]}
                </span>
                {asset.contract_address && (
                  <span className="inline-flex items-center gap-1.5 text-white/50 text-xs cursor-pointer hover:text-[#00D4AA] transition-colors">
                    VIEW SMART CONTRACTS
                    <ExternalLink className="h-3 w-3" />
                  </span>
                )}
              </div>
            </div>
            <div
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-sm"
              style={{ background: statusInfo.bg, color: statusInfo.color }}
            >
              {statusInfo.icon}
              <span>{statusInfo.label}</span>
            </div>
          </div>

          {/* 主内容区 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 左侧：图片和详情 */}
            <div className="lg:col-span-2">
              {/* 图片画廊 */}
              <MediaGallery coverImage={asset.image_url} assetType={asset.asset_type} media={asset.media} />

              {/* 标签页导航 */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
                <TabsList className="w-full justify-start bg-transparent border-b border-white/10 rounded-none h-auto p-0 gap-0">
                  <TabsTrigger
                    value="highlights"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00D4AA] data-[state=active]:text-[#00D4AA] data-[state=active]:bg-transparent bg-transparent text-white/50 font-semibold text-xs tracking-wide px-4 py-3"
                  >
                    HIGHLIGHTS
                  </TabsTrigger>
                  <TabsTrigger
                    value="financials"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00D4AA] data-[state=active]:text-[#00D4AA] data-[state=active]:bg-transparent bg-transparent text-white/50 font-semibold text-xs tracking-wide px-4 py-3"
                  >
                    FINANCIALS
                  </TabsTrigger>
                  <TabsTrigger
                    value="details"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00D4AA] data-[state=active]:text-[#00D4AA] data-[state=active]:bg-transparent bg-transparent text-white/50 font-semibold text-xs tracking-wide px-4 py-3"
                  >
                    DETAILS
                  </TabsTrigger>
                  <TabsTrigger
                    value="blockchain"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00D4AA] data-[state=active]:text-[#00D4AA] data-[state=active]:bg-transparent bg-transparent text-white/50 font-semibold text-xs tracking-wide px-4 py-3"
                  >
                    BLOCKCHAIN
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="highlights" className="mt-4">
                  <div className="text-xs font-semibold text-white/50 tracking-wider mb-4">PROPERTY HIGHLIGHTS</div>
                  <PropertyHighlights asset={asset} />
                </TabsContent>

                <TabsContent value="financials" className="mt-4">
                  <div className="text-xs font-semibold text-white/50 tracking-wider mb-4">FINANCIAL DETAILS</div>
                  <Card className="bg-white/[0.02] border-white/[0.06]">
                    <CardContent className="p-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="flex flex-col gap-1">
                          <span className="text-white/50 text-xs">Token Price</span>
                          <span className="text-white text-xl font-semibold">${asset.current_price.toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-white/50 text-xs">Total Investment</span>
                          <span className="text-white text-xl font-semibold">{formatAmount(asset.total_supply)}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-white/50 text-xs">3M APY</span>
                          <span className="text-white text-xl font-semibold">{asset.apy_3m.toFixed(1)}%</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-white/50 text-xs">6M APY</span>
                          <span className="text-white text-xl font-semibold">{asset.apy_6m.toFixed(1)}%</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-white/50 text-xs">12M APY</span>
                          <span className="text-[#00D4AA] text-xl font-semibold">{asset.apy_12m.toFixed(1)}%</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-white/50 text-xs">Min. Investment</span>
                          <span className="text-white text-xl font-semibold">{formatAmount(asset.min_subscription)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="details" className="mt-4">
                  <div className="text-xs font-semibold text-white/50 tracking-wider mb-4">ABOUT THE OFFERING</div>
                  <Card className="bg-white/[0.02] border-white/[0.06]">
                    <CardContent className="p-6">
                      <p className="text-white/75 leading-relaxed">
                        {asset.description || "This tokenized real-world asset offers investors an opportunity to participate in property ownership through blockchain technology. Each token represents a fractional ownership stake, providing exposure to rental income and potential property appreciation."}
                      </p>
                    </CardContent>
                  </Card>
                  
                  {asset.location && (
                    <>
                      <div className="text-xs font-semibold text-white/50 tracking-wider mb-4 mt-6">LOCATION</div>
                      <Card className="bg-white/[0.02] border-white/[0.06]">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-[#00D4AA]" />
                            <span className="text-white">{asset.location}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="blockchain" className="mt-4">
                  <div className="text-xs font-semibold text-white/50 tracking-wider mb-4">BLOCKCHAIN INFORMATION</div>
                  <Card className="bg-white/[0.02] border-white/[0.06]">
                    <CardContent className="p-6">
                      {asset.contract_address ? (
                        <div className="mb-2">
                          <span className="block text-white/50 text-xs mb-2">Contract Address</span>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 bg-white/5 px-3 py-2 rounded-md text-sm text-white overflow-hidden text-ellipsis">
                              {asset.contract_address}
                            </code>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => copyAddress(asset.contract_address!)}
                                >
                                  {copied ? <Check className="h-4 w-4 text-[#00D4AA]" /> : <Copy className="h-4 w-4" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {copied ? "Copied!" : "Copy"}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      ) : (
                        <span className="text-white/50">Contract not deployed yet</span>
                      )}
                      
                      {asset.document_url && (
                        <div className="mt-4">
                          <span className="block text-white/50 text-xs mb-2">Documents</span>
                          <a
                            href={asset.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-[#00D4AA] hover:underline"
                          >
                            <FileText className="h-4 w-4" />
                            View Legal Documents
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* 右侧：投资面板 */}
            <div className="lg:col-span-1">
              <div className="sticky top-[88px] bg-gradient-to-b from-white/[0.03] to-white/[0.01] border border-white/[0.08] rounded-2xl p-6">
                {/* 投资头部 */}
                <div className="text-center mb-4">
                  <span className="text-white/50 text-xs tracking-wider">TOTAL INVESTMENT</span>
                  <h2 className="text-3xl font-bold text-white mt-2">{formatAmount(asset.total_supply)}</h2>
                </div>

                {/* 状态标签 */}
                <div className="text-center px-4 py-2 bg-gradient-to-r from-[#00D4AA] to-[#00B894] rounded-full text-black font-bold text-xs tracking-wider mb-5">
                  {asset.status === "active" ? "AVAILABLE NOW" : statusInfo.label.toUpperCase()}
                </div>

                {/* 购买信息 */}
                <div className="flex justify-around mb-4">
                  <div className="text-center">
                    <span className="block text-white/50 text-[11px] mb-1">SUBSCRIBED</span>
                    <span className="block text-white text-lg font-semibold">{formatAmount(asset.subscribed_amount)}</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-white/50 text-[11px] mb-1">REMAINING</span>
                    <span className="block text-[#00D4AA] text-lg font-semibold">{formatAmount(asset.remaining_amount)}</span>
                  </div>
                </div>

                {/* 进度条 */}
                <div className="mb-2">
                  <Progress value={progress} indicatorColor="#00D4AA" className="h-2" />
                  <div className="flex justify-between mt-2 text-xs text-white/50">
                    <span>{progress.toFixed(1)}% Funded</span>
                    <span>{(100 - progress).toFixed(1)}% Available</span>
                  </div>
                </div>

                {/* 分隔线 */}
                <div className="border-t border-white/10 my-6" />

                {/* APY 信息 */}
                <div className="mb-5">
                  <div className="flex justify-between py-2 border-b border-white/[0.06]">
                    <span className="text-white/60">Expected Annual Return</span>
                    <span className="text-[#00D4AA] font-semibold">{asset.apy_12m.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-white/60">Token Price</span>
                    <span className="text-[#00D4AA] font-semibold">${asset.current_price.toFixed(2)}</span>
                  </div>
                </div>

                {/* 认购按钮 */}
                <Button
                  size="lg"
                  className="w-full h-[52px] text-base font-semibold rounded-xl"
                  disabled={!isConnected || asset.status !== "active"}
                  onClick={() => setShowSubscribeModal(true)}
                >
                  <Wallet className="h-5 w-5 mr-2" />
                  {isConnected ? "Subscribe Now" : "Connect Wallet to Subscribe"}
                </Button>

                {!isConnected && (
                  <p className="text-center mt-3 text-sm text-white/40">
                    Please connect your wallet to invest
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <SubscriptionModal
          open={showSubscribeModal}
          onClose={() => setShowSubscribeModal(false)}
          onSuccess={() => setShowSubscribeModal(false)}
          asset={asset}
        />
      </div>
    </TooltipProvider>
  );
}
