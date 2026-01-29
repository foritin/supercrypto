"use client";

import { useTranslation } from "react-i18next";
import type { AssetDetail } from "@/services/asset";

interface PropertyHighlightsProps {
  asset: AssetDetail;
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
  const financialItems = [
    { label: t("assets.highlights.tokenType", "Token Type"), value: t("assets.highlights.standardEquity", "Standard Equity") },
    { label: t("assets.highlights.expectedIncome", "Expected Income"), value: asset.apy_12m > 0 ? asset.apy_12m.toFixed(1) + "%" : "-" },
    { label: t("assets.financials.tokenPrice"), value: formatCurrency(asset.current_price) },
    { label: t("assets.highlights.totalTokens", "Total Tokens"), value: formatCurrency(asset.total_supply) },
    { label: t("assets.financials.minInvestment"), value: formatCurrency(asset.min_subscription) },
  ];

  // 右列：物业信息
  const propertyItems = [
    { label: t("assets.highlights.assetType", "Asset Type"), value: t(`assets.type.${asset.asset_type}`) },
    { label: t("assets.highlights.fullAddress", "Full Address"), value: asset.location || "-" },
    { label: t("assets.highlights.symbol", "Symbol"), value: asset.symbol },
    ...(features ? [
      { label: t("assets.highlights.constructionYear", "Construction Year"), value: features.year_built?.toString() || "-" },
      { 
        label: t("assets.highlights.bedroomBath", "Bedroom/Bath"), 
        value: features.bedrooms && features.bathrooms 
          ? `${features.bedrooms} ${t("assets.highlights.beds", "Beds")} / ${features.bathrooms} ${t("assets.highlights.baths", "Baths")}` 
          : "-" 
      },
      { 
        label: t("assets.highlights.propertyType"), 
        value: features.property_type ? t(`assets.highlights.propertyTypes.${features.property_type}`) : "-" 
      },
      { label: t("assets.highlights.rentalType", "Rental Type"), value: t("assets.highlights.longTerm", "Long Term") },
      { 
        label: t("assets.highlights.rented", "Rented?"), 
        value: features.rental_status ? t(`assets.highlights.rentalStatuses.${features.rental_status}`) : "-" 
      },
      { label: t("assets.highlights.monthlyRent"), value: features.monthly_rent ? formatCurrency(features.monthly_rent) : "-" },
    ] : []),
  ];

  return (
    <div className="property-highlights">
      <div className="highlights-grid">
        {/* 左列 */}
        <div className="highlights-column">
          {financialItems.map((item, idx) => (
            <div key={idx} className="highlight-row">
              <span className="text-white/50 text-[13px]">{item.label}</span>
              <span className="text-white font-medium text-right">{item.value}</span>
            </div>
          ))}
        </div>
        
        {/* 右列 */}
        <div className="highlights-column">
          {propertyItems.map((item, idx) => (
            <div key={idx} className="highlight-row">
              <span className="text-white/50 text-[13px]">{item.label}</span>
              <span className="text-white font-medium text-right">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .property-highlights {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 12px;
          padding: 24px;
        }
        .highlights-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
        }
        @media (max-width: 768px) {
          .highlights-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }
        .highlights-column {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .highlight-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .highlight-row:last-child {
          border-bottom: none;
        }
      `}</style>
    </div>
  );
}
