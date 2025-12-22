"use client";

import { Typography } from "antd";
import {
  DollarOutlined,
  PercentageOutlined,
  CalendarOutlined,
  HomeOutlined,
  EnvironmentOutlined,
  BankOutlined,
  TeamOutlined,
  FieldTimeOutlined,
} from "@ant-design/icons";
import type { AssetDetail, AssetFeaturesData } from "@/services/asset";
import { ASSET_TYPE_NAMES, PROPERTY_TYPE_NAMES, RENTAL_STATUS_NAMES } from "@/services/asset";

const { Text } = Typography;

interface PropertyHighlightsProps {
  asset: AssetDetail;
}

export function PropertyHighlights({ asset }: PropertyHighlightsProps) {
  const features = asset.features;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return "$" + (value / 1000000).toFixed(2) + "M";
    if (value >= 1000) return "$" + (value / 1000).toFixed(0) + "K";
    return "$" + value.toFixed(2);
  };

  // 左列：财务信息
  const financialItems = [
    { label: "Token Type", value: "Standard Equity", icon: <BankOutlined /> },
    { label: "Expected Income", value: asset.apy_12m > 0 ? asset.apy_12m.toFixed(1) + "%" : "-", icon: <PercentageOutlined /> },
    { label: "Token Price", value: formatCurrency(asset.current_price), icon: <DollarOutlined /> },
    { label: "Total Tokens", value: formatCurrency(asset.total_supply), icon: <DollarOutlined /> },
    { label: "Min. Investment", value: formatCurrency(asset.min_subscription), icon: <DollarOutlined /> },
  ];

  // 右列：物业信息
  const propertyItems = [
    { label: "Asset Type", value: ASSET_TYPE_NAMES[asset.asset_type] || asset.asset_type },
    { label: "Full Address", value: asset.location || "-" },
    { label: "Symbol", value: asset.symbol },
    ...(features ? [
      { label: "Construction Year", value: features.year_built?.toString() || "-" },
      { label: "Bedroom/Bath", value: features.bedrooms && features.bathrooms ? features.bedrooms + " Beds / " + features.bathrooms + " Baths" : "-" },
      { label: "Property Type", value: features.property_type ? PROPERTY_TYPE_NAMES[features.property_type] || features.property_type : "-" },
      { label: "Rental Type", value: "Long Term" },
      { label: "Rented?", value: features.rental_status ? RENTAL_STATUS_NAMES[features.rental_status] : "-" },
      { label: "Monthly Rent", value: features.monthly_rent ? formatCurrency(features.monthly_rent) : "-" },
    ] : []),
  ];

  return (
    <div className="property-highlights">
      <div className="highlights-grid">
        {/* 左列 */}
        <div className="highlights-column">
          {financialItems.map((item, idx) => (
            <div key={idx} className="highlight-row">
              <Text className="highlight-label">{item.label}</Text>
              <Text className="highlight-value">{item.value}</Text>
            </div>
          ))}
        </div>
        
        {/* 右列 */}
        <div className="highlights-column">
          {propertyItems.map((item, idx) => (
            <div key={idx} className="highlight-row">
              <Text className="highlight-label">{item.label}</Text>
              <Text className="highlight-value">{item.value}</Text>
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
        :global(.highlight-label) {
          color: rgba(255, 255, 255, 0.5) !important;
          font-size: 13px;
        }
        :global(.highlight-value) {
          color: #fff !important;
          font-weight: 500;
          text-align: right;
        }
      `}</style>
    </div>
  );
}
