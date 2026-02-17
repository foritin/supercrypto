"use client";

import { useState, useEffect, useCallback } from "react";
import { use } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { useAccount, useChainId } from "wagmi";
import {
  ArrowLeft,
  Home,
  ChevronRight,
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
  ExternalLink,
  Loader2,
  Download,
  FileSpreadsheet,
  Scale,
  Lock,
} from "lucide-react";
import { assetService, type AssetDetail, type AssetType, type AssetStatus, type AssetMediaItem } from "@/services/asset";
import { useKycStatus } from "@/hooks";
import { SubscriptionModal } from "@/components/subscription/subscription-modal";
import { MediaGallery } from "@/components/asset/media-gallery";
import { PropertyHighlights } from "@/components/asset/property-highlights";
import { InvestPanel } from "@/components/asset/invest-panel";
import { RiskAndComplianceSection, type RiskLevel } from "@/components/asset/risk-badge";
import { AssetDetailSkeleton } from "@/components/asset/asset-detail-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getExplorerUrl } from "@/lib/utils";
import { AssetLogoFrame } from "@/components/asset/asset-logo-frame";

// 资产类型图标
const ASSET_TYPE_ICONS: Record<AssetType, React.ReactNode> = {
  real_estate: <Building2 className="h-4 w-4" />,
  bond: <Shield className="h-4 w-4" />,
  commodity: <Flame className="h-4 w-4" />,
  equity: <TrendingUp className="h-4 w-4" />,
  other: <Building2 className="h-4 w-4" />,
};

// 状态配置 - 使用 i18n key
const STATUS_CONFIG: Record<AssetStatus, { labelKey: string; color: string; bg: string; icon: React.ReactNode }> = {
  active: { labelKey: "assets.status.active", color: "#00D4AA", bg: "rgba(0,212,170,0.1)", icon: <CheckCircle className="h-4 w-4" /> },
  paused: { labelKey: "assets.status.paused", color: "#FAAD14", bg: "rgba(250,173,20,0.1)", icon: <PauseCircle className="h-4 w-4" /> },
  sold_out: { labelKey: "assets.status.sold_out", color: "#FF4D4F", bg: "rgba(255,77,79,0.1)", icon: <Clock className="h-4 w-4" /> },
  closed: { labelKey: "assets.status.closed", color: "#8C8C8C", bg: "rgba(140,140,140,0.1)", icon: <Clock className="h-4 w-4" /> },
};

export default function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { t } = useTranslation();
  const router = useRouter();
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { isApproved: isKycApproved } = useKycStatus();
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
      
      // 获取媒体列表（带预签名 URL）
      const mediaList = await assetService.getAssetMedia(Number(resolvedParams.id));
      
      // 将媒体列表合并到资产详情中
      setAsset({
        ...result,
        media: mediaList,
      });
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
    return <AssetDetailSkeleton />;
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

  return (
    <TooltipProvider>
      <div className="min-h-screen pb-20">
        <div className="max-w-[1200px] mx-auto px-6">
          {/* 面包屑导航 */}
          <nav className="flex items-center gap-1.5 mb-5 text-sm">
            {/* Home */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/")}
              className="h-8 px-2 text-white/50 hover:text-white hover:bg-white/5"
            >
              <Home className="h-4 w-4" />
            </Button>
            
            {/* 分隔符 */}
            <ChevronRight className="h-4 w-4 text-white/20" />
            
            {/* Assets 列表页 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/assets")}
              className="h-8 px-2 text-white/50 hover:text-white hover:bg-white/5 font-normal"
            >
              {t("assets.title")}
            </Button>
            
            {/* 分隔符 */}
            <ChevronRight className="h-4 w-4 text-white/20" />
            
            {/* 当前页面 */}
            <span className="px-2 text-white/80 font-medium truncate max-w-[200px] sm:max-w-[300px]">
              {asset.name}
            </span>
          </nav>

          {/* 标题栏 */}
          <div className="flex justify-between items-start mb-4 flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <AssetLogoFrame
                  logoUrl={asset.logo_url}
                  frameStyle={asset.frame_style}
                  assetType={asset.asset_type as AssetType}
                  size="md"
                  name={asset.name}
                />
                <h1 className="text-3xl font-bold text-white">{asset.location || asset.name}</h1>
              </div>
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 rounded-md text-primary text-xs">
                  {ASSET_TYPE_ICONS[asset.asset_type as AssetType]}
                  {t(`assets.type.${asset.asset_type}`)}
                </span>
                {/* 风险评级标识 */}
                <RiskAndComplianceSection 
                  riskLevel={(asset.risk_level as RiskLevel) || "medium"}
                  complianceItems={["audited", "legal", "verified"]}
                />
              </div>
            </div>
            <div
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-sm"
              style={{ background: statusInfo.bg, color: statusInfo.color }}
            >
              {statusInfo.icon}
              <span>{t(statusInfo.labelKey)}</span>
            </div>
          </div>

          {/* 主内容区 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* 左侧：图片和详情 */}
            <div className="lg:col-span-2">
              {/* 图片画廊 */}
              <MediaGallery coverImage={asset.image_url} assetType={asset.asset_type} media={asset.media} />

              {/* 标签页导航 */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
                <TabsList className="w-full justify-start bg-transparent border-b border-white/10 rounded-none h-auto p-0 gap-0">
                  <TabsTrigger
                    value="highlights"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent bg-transparent text-white/50 font-semibold text-xs tracking-wide px-4 py-3 uppercase"
                  >
                    {t("assets.tabs.highlights")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="investment"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent bg-transparent text-white/50 font-semibold text-xs tracking-wide px-4 py-3 uppercase"
                  >
                    {t("assets.tabs.investment")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="details"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent bg-transparent text-white/50 font-semibold text-xs tracking-wide px-4 py-3 uppercase"
                  >
                    {t("assets.tabs.details")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="blockchain"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent bg-transparent text-white/50 font-semibold text-xs tracking-wide px-4 py-3 uppercase"
                  >
                    {t("assets.tabs.blockchain")}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="highlights" className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="text-xs font-semibold text-white/50 tracking-wider mb-4 uppercase">{t("assets.highlights.title")}</div>
                  <PropertyHighlights asset={asset} />
                </TabsContent>

                <TabsContent value="investment" className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* 财务数据 */}
                  <div className="text-xs font-semibold text-white/50 tracking-wider mb-4 uppercase">{t("assets.financials.title")}</div>
                  <Card className="bg-white/[0.02] border-white/[0.06]">
                    <CardContent className="p-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="flex flex-col gap-1">
                          <span className="text-white/50 text-xs">{t("assets.financials.tokenPrice")}</span>
                          <span className="text-white text-xl font-semibold">${asset.current_price.toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-white/50 text-xs">{t("assets.financials.totalInvestment")}</span>
                          <span className="text-white text-xl font-semibold">{formatAmount(asset.total_supply)}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-white/50 text-xs">{t("assets.financials.apy3m")}</span>
                          <span className="text-white text-xl font-semibold">{asset.apy_3m.toFixed(1)}%</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-white/50 text-xs">{t("assets.financials.apy6m")}</span>
                          <span className="text-white text-xl font-semibold">{asset.apy_6m.toFixed(1)}%</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-white/50 text-xs">{t("assets.financials.apy12m")}</span>
                          <span className="text-primary text-xl font-semibold">{asset.apy_12m.toFixed(1)}%</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-white/50 text-xs">{t("assets.financials.minInvestment")}</span>
                          <span className="text-white text-xl font-semibold">{formatAmount(asset.min_subscription)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 相关文档 - 分类显示 */}
                  {(() => {
                    const allDocuments = asset.media?.filter(
                      (m: AssetMediaItem) => ["valuation", "legal", "financial", "other"].includes(m.media_type)
                    ) || [];
                    
                    if (allDocuments.length === 0) return null;
                    
                    // 检查访问权限
                    const canAccessDocuments = isConnected && isKycApproved;
                    
                    // 按类型分组
                    const valuationDocs = allDocuments.filter((m: AssetMediaItem) => m.media_type === "valuation");
                    const legalDocs = allDocuments.filter((m: AssetMediaItem) => m.media_type === "legal");
                    const otherDocs = allDocuments.filter((m: AssetMediaItem) => ["financial", "other"].includes(m.media_type));
                    
                    const getDocIcon = (type: string) => {
                      switch (type) {
                        case "valuation": return <FileSpreadsheet className="h-5 w-5 text-primary" />;
                        case "legal": return <Scale className="h-5 w-5 text-primary" />;
                        default: return <FileText className="h-5 w-5 text-primary" />;
                      }
                    };
                    
                    const renderDocList = (docs: AssetMediaItem[], title: string) => {
                      if (docs.length === 0) return null;
                      return (
                        <div className="mb-4 last:mb-0">
                          <div className="text-white/60 text-xs font-medium mb-2">{title}</div>
                          <div className="space-y-2">
                            {docs.map((doc: AssetMediaItem) => (
                              <div
                                key={doc.id}
                                className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg hover:bg-white/[0.04] transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  {getDocIcon(doc.media_type)}
                                  <div className="text-white text-sm font-medium truncate max-w-[300px]">
                                    {doc.title || doc.file_name || doc.media_type}
                                  </div>
                                </div>
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-md text-primary text-xs font-medium transition-colors shrink-0"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  {t("assets.documents.download")}
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    };

                    // 访问限制遮罩
                    const renderAccessOverlay = () => {
                      if (canAccessDocuments) return null;
                      
                      const isWalletIssue = !isConnected;
                      
                      return (
                        <div className="absolute inset-0 bg-bg-dark/90 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center z-10">
                          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                            <Lock className="h-6 w-6 text-white/40" />
                          </div>
                          <div className="text-white font-medium text-base mb-2">
                            {isWalletIssue 
                              ? t("assets.documents.connectWalletRequired")
                              : t("assets.documents.kycRequired")
                            }
                          </div>
                          <div className="text-white/50 text-sm text-center max-w-[280px] mb-4">
                            {isWalletIssue
                              ? t("assets.documents.connectWalletHint")
                              : t("assets.documents.kycHint")
                            }
                          </div>
                          {!isWalletIssue && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push("/kyc")}
                              className="border-primary/30 text-primary hover:bg-primary/10"
                            >
                              {t("assets.documents.goToKyc")}
                            </Button>
                          )}
                        </div>
                      );
                    };
                    
                    return (
                      <>
                        <div className="text-xs font-semibold text-white/50 tracking-wider mb-4 mt-6 uppercase">{t("assets.documents.title")}</div>
                        <Card className="bg-white/[0.02] border-white/[0.06] relative overflow-hidden">
                          <CardContent className="p-4">
                            {renderDocList(valuationDocs, t("assets.documents.valuationTitle"))}
                            {renderDocList(legalDocs, t("assets.documents.legalTitle"))}
                            {renderDocList(otherDocs, t("assets.documents.otherTitle"))}
                          </CardContent>
                          {renderAccessOverlay()}
                        </Card>
                      </>
                    );
                  })()}
                </TabsContent>

                <TabsContent value="details" className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="text-xs font-semibold text-white/50 tracking-wider mb-4 uppercase">{t("assets.about.title")}</div>
                  <Card className="bg-white/[0.02] border-white/[0.06]">
                    <CardContent className="p-6">
                      <p className="text-white/75 leading-relaxed">
                        {asset.description || t("assets.about.defaultDescription")}
                      </p>
                    </CardContent>
                  </Card>
                  
                  {asset.location && (
                    <>
                      <div className="text-xs font-semibold text-white/50 tracking-wider mb-4 mt-6 uppercase">{t("assets.about.location")}</div>
                      <Card className="bg-white/[0.02] border-white/[0.06]">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            <span className="text-white">{asset.location}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="blockchain" className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="text-xs font-semibold text-white/50 tracking-wider mb-4 uppercase">{t("assets.blockchain.title")}</div>
                  <Card className="bg-white/[0.02] border-white/[0.06]">
                    <CardContent className="p-6">
                      {asset.contract_address ? (
                        <>
                          <div className="mb-4">
                            <span className="block text-white/50 text-xs mb-2">{t("assets.blockchain.contractAddress")}</span>
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
                                    {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {copied ? t("common.copied") : t("common.copy")}
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                          <a
                            href={getExplorerUrl(chainId, 'address', asset.contract_address) || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-primary hover:underline text-sm"
                          >
                            {t("assets.detail.viewSmartContracts")}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </>
                      ) : (
                        <span className="text-white/50">{t("assets.blockchain.contractNotDeployed")}</span>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* 右侧：投资面板 V2 */}
            <div className="lg:col-span-1">
              <div className="sticky top-[120px]">
                <InvestPanel
                  asset={asset}
                  isConnected={isConnected}
                  isKycApproved={isKycApproved}
                  onSubscribe={() => setShowSubscribeModal(true)}
                  onGoToKyc={() => router.push("/kyc")}
                />
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
