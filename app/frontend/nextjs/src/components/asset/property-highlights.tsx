"use client";

import { useTranslation } from "react-i18next";
import {
  Coins,
  TrendingUp,
  DollarSign,
  Layers,
  Wallet,
  Building2,
  MapPin,
  Tag,
  Calendar,
  Bed,
  Bath,
  Home,
  Key,
  CheckCircle,
  Banknote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssetDetail } from "@/services/asset";

interface PropertyHighlightsProps {
  asset: AssetDetail;
}

// 图标映射
const ICON_MAP: Record<string, React.ReactNode> = {
  tokenType: <Coins className="h-3.5 w-3.5" />,
  expectedIncome: <TrendingUp className="h-3.5 w-3.5" />,
  tokenPrice: <DollarSign className="h-3.5 w-3.5" />,
  totalTokens: <Layers className="h-3.5 w-3.5" />,
  minInvestment: <Wallet className="h-3.5 w-3.5" />,
  assetType: <Building2 className="h-3.5 w-3.5" />,
  fullAddress: <MapPin className="h-3.5 w-3.5" />,
  symbol: <Tag className="h-3.5 w-3.5" />,
  constructionYear: <Calendar className="h-3.5 w-3.5" />,
  bedroomBath: <Bed className="h-3.5 w-3.5" />,
  propertyType: <Home className="h-3.5 w-3.5" />,
  rentalType: <Key className="h-3.5 w-3.5" />,
  rented: <CheckCircle className="h-3.5 w-3.5" />,
  monthlyRent: <Banknote className="h-3.5 w-3.5" />,
};

interface HighlightItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}

// 单行属性组件
function HighlightItem({ icon, label, value, highlight = false }: HighlightItemProps) {
  const [valuePart, unitPart] = value.split(" ");
  
  return (
    <div
      className={cn(
        "group flex items-center justify-between py-3 px-3 -mx-3 rounded-lg",
        "border-b border-white/[0.06] last:border-b-0",
        "transition-all duration-200",
        "hover:bg-white/[0.04] hover:border-transparent"
      )}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "flex items-center justify-center w-7 h-7 rounded-md",
            "bg-white/[0.03] text-white/40",
            "group-hover:bg-[#00D4AA]/10 group-hover:text-[#00D4AA]",
            "transition-all duration-200"
          )}
        >
          {icon}
        </span>
        <span className="text-white/50 text-[13px] group-hover:text-white/70 transition-colors">
          {label}
        </span>
      </div>
      <span
        className={cn(
          "font-medium text-right tabular-nums",
          highlight ? "text-[#00D4AA]" : "text-white",
          "group-hover:scale-105 transition-transform duration-200"
        )}
      >
        {valuePart}
        {unitPart && <span className="text-white/60 text-sm ml-1">{unitPart}</span>}
      </span>
    </div>
  );
}

export function PropertyHighlights({ asset }: PropertyHighlightsProps) {
  const { t } = useTranslation();
  const features = asset.features;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return "$" + (value / 1000000).toFixed(2) + "M";
    if (value >= 1000) return "$" + (value / 1000).toFixed(0) + "K";
    return "$" + value.toFixed(2);
  };

  // 左列：财务信息
  const financialItems: HighlightItemProps[] = [
    {
      icon: ICON_MAP.tokenType,
      label: t("assets.highlights.tokenType", "Token Type"),
      value: t("assets.highlights.standardEquity", "Standard Equity"),
    },
    {
      icon: ICON_MAP.expectedIncome,
      label: t("assets.highlights.expectedIncome", "Expected Income"),
      value: asset.apy_12m > 0 ? asset.apy_12m.toFixed(1) + "%" : "-",
      highlight: true,
    },
    {
      icon: ICON_MAP.tokenPrice,
      label: t("assets.financials.tokenPrice"),
      value: formatCurrency(asset.current_price),
    },
    {
      icon: ICON_MAP.totalTokens,
      label: t("assets.highlights.totalTokens", "Total Tokens"),
      value: formatCurrency(asset.total_supply),
    },
    {
      icon: ICON_MAP.minInvestment,
      label: t("assets.financials.minInvestment"),
      value: formatCurrency(asset.min_subscription),
    },
  ];

  // 右列：物业信息
  const propertyItems: HighlightItemProps[] = [
    {
      icon: ICON_MAP.assetType,
      label: t("assets.highlights.assetType", "Asset Type"),
      value: t(`assets.type.${asset.asset_type}`),
    },
    {
      icon: ICON_MAP.fullAddress,
      label: t("assets.highlights.fullAddress", "Full Address"),
      value: asset.location || "-",
    },
    {
      icon: ICON_MAP.symbol,
      label: t("assets.highlights.symbol", "Symbol"),
      value: asset.symbol,
    },
    ...(features
      ? [
          {
            icon: ICON_MAP.constructionYear,
            label: t("assets.highlights.constructionYear", "Construction Year"),
            value: features.year_built?.toString() || "-",
          },
          {
            icon: ICON_MAP.bedroomBath,
            label: t("assets.highlights.bedroomBath", "Bedroom/Bath"),
            value:
              features.bedrooms && features.bathrooms
                ? `${features.bedrooms} Beds / ${features.bathrooms} Baths`
                : "-",
          },
          {
            icon: ICON_MAP.propertyType,
            label: t("assets.highlights.propertyType"),
            value: features.property_type
              ? t(`assets.highlights.propertyTypes.${features.property_type}`)
              : "-",
          },
          {
            icon: ICON_MAP.rentalType,
            label: t("assets.highlights.rentalType", "Rental Type"),
            value: t("assets.highlights.longTerm", "Long Term"),
          },
          {
            icon: ICON_MAP.rented,
            label: t("assets.highlights.rented", "Rented?"),
            value: features.rental_status
              ? t(`assets.highlights.rentalStatuses.${features.rental_status}`)
              : "-",
          },
          {
            icon: ICON_MAP.monthlyRent,
            label: t("assets.highlights.monthlyRent"),
            value: features.monthly_rent ? formatCurrency(features.monthly_rent) : "-",
          },
        ]
      : []),
  ];

  return (
    <div className="bg-white/[0.02] rounded-xl p-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {/* 左列 */}
        <div className="flex flex-col">
          <div className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3 pb-2 border-b border-white/[0.06]">
            {t("assets.financials.title")}
          </div>
          <div className="flex flex-col">
            {financialItems.map((item, idx) => (
              <HighlightItem key={idx} {...item} />
            ))}
          </div>
        </div>

        {/* 右列 */}
        <div className="flex flex-col">
          <div className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3 pb-2 border-b border-white/[0.06]">
            {t("assets.highlights.title")}
          </div>
          <div className="flex flex-col">
            {propertyItems.map((item, idx) => (
              <HighlightItem key={idx} {...item} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
