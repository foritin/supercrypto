"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Typography,
  Select,
  Empty,
  Pagination,
  Progress,
  Skeleton,
} from "antd";
import {
  BankOutlined,
  FireOutlined,
  RiseOutlined,
  SafetyOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PauseCircleOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import {
  assetService,
  type AssetListItem,
  type AssetType,
  type AssetStatus,
  ASSET_TYPE_NAMES,
} from "@/services/asset";
import "./assets.css";

const { Title, Text } = Typography;

// 资产类型图标映射
const ASSET_TYPE_ICONS: Record<AssetType, React.ReactNode> = {
  real_estate: <BankOutlined />,
  bond: <SafetyOutlined />,
  commodity: <FireOutlined />,
  equity: <RiseOutlined />,
  other: <BankOutlined />,
};

// 高质量背景图
const ASSET_TYPE_IMAGES: Record<AssetType, string> = {
  real_estate:
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80",
  bond: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80",
  commodity:
    "https://images.unsplash.com/photo-1610375461246-83df859d849d?w=800&q=80",
  equity:
    "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&q=80",
  other:
    "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&q=80",
};

// 状态配置
const STATUS_CONFIG: Record<
  AssetStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  active: {
    label: "Available",
    color: "#00D4AA",
    icon: <CheckCircleOutlined />,
  },
  paused: {
    label: "Paused",
    color: "#FAAD14",
    icon: <PauseCircleOutlined />,
  },
  sold_out: {
    label: "Sold Out",
    color: "#FF4D4F",
    icon: <ClockCircleOutlined />,
  },
  closed: { label: "Closed", color: "#8C8C8C", icon: <ClockCircleOutlined /> },
};

interface AssetsData {
  items: AssetListItem[];
  pagination: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
}

export default function AssetsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [statusFilter, setStatusFilter] = useState<AssetStatus | undefined>(
    undefined
  );
  const [typeFilter, setTypeFilter] = useState<AssetType | undefined>(
    undefined
  );

  const [data, setData] = useState<AssetsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAssets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await assetService.getAssets({
        page,
        page_size: pageSize,
        status: statusFilter,
        asset_type: typeFilter,
      });
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, statusFilter, typeFilter]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // 格式化函数
  const formatApy = (apy: number) => (apy === 0 ? "-" : `${apy.toFixed(1)}%`);

  const formatAmount = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(2)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${amount.toFixed(0)}`;
  };

  // 计算统计
  const stats = {
    total: data?.pagination?.total || 0,
    tvl: data?.items?.reduce((acc, item) => acc + item.total_supply, 0) || 0,
    avgApy: data?.items?.length
      ? (
          data.items.reduce((acc, item) => acc + item.apy_12m, 0) /
          data.items.length
        ).toFixed(1)
      : "0",
    available:
      data?.items?.filter((item) => item.status === "active").length || 0,
  };

  // 渲染资产卡片
  const renderAssetCard = (asset: AssetListItem) => {
    const bgImage =
      asset.image_url || ASSET_TYPE_IMAGES[asset.asset_type as AssetType];
    const progress = (asset.subscribed_amount / asset.total_supply) * 100;
    const statusInfo = STATUS_CONFIG[asset.status as AssetStatus];

    return (
      <div
        key={asset.id}
        onClick={() => router.push(`/assets/${asset.id}`)}
        className="asset-card-wrapper"
      >
        {/* Image Section */}
        <div className="asset-card-image">
          <div
            className="asset-card-bg"
            style={{ backgroundImage: `url(${bgImage})` }}
          />
          <div className="asset-card-overlay" />

          {/* Status Badge */}
          <div
            className="status-badge"
            style={{
              background: `${statusInfo.color}15`,
              borderColor: `${statusInfo.color}40`,
              color: statusInfo.color,
            }}
          >
            {statusInfo.icon}
            <span>{statusInfo.label}</span>
          </div>

          {/* Type Badge */}
          <div className="type-badge">
            {ASSET_TYPE_ICONS[asset.asset_type as AssetType]}
          </div>
        </div>

        {/* Content Section */}
        <div className="asset-card-content">
          {/* Header */}
          <div className="asset-card-header">
            <Title level={5} ellipsis style={{ margin: 0, flex: 1 }}>
              {asset.name}
            </Title>
            <Text className="asset-symbol">{asset.symbol}</Text>
          </div>

          {/* APY Section */}
          <div className="apy-section">
            <div className="apy-item">
              <Text className="apy-label">3M APY</Text>
              <Text className="apy-value">{formatApy(asset.apy_3m)}</Text>
            </div>
            <div className="apy-divider" />
            <div className="apy-item">
              <Text className="apy-label">6M APY</Text>
              <Text className="apy-value">{formatApy(asset.apy_6m)}</Text>
            </div>
            <div className="apy-divider" />
            <div className="apy-item highlight">
              <Text className="apy-label">12M APY</Text>
              <Text className="apy-value highlight">
                {formatApy(asset.apy_12m)}
              </Text>
            </div>
          </div>

          {/* Progress Section */}
          <div className="progress-section">
            <div className="progress-header">
              <Text className="progress-label">Subscription</Text>
              <Text className="progress-value">
                {formatAmount(asset.subscribed_amount)} /{" "}
                {formatAmount(asset.total_supply)}
              </Text>
            </div>
            <Progress
              percent={progress}
              showInfo={false}
              strokeColor="#00D4AA"
              railColor="rgba(255,255,255,0.06)"
              size="small"
            />
          </div>

          {/* Footer */}
          <div className="asset-card-footer">
            <div className="price-info">
              <Text className="price-label">Price</Text>
              <Text className="price-value">
                ${asset.current_price.toFixed(2)}
              </Text>
            </div>
            <div className="view-action">
              <ArrowRightOutlined />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 卡片骨架屏
  const renderCardSkeleton = () => (
    <div className="asset-card-wrapper skeleton">
      <div className="skeleton-image-placeholder" />
      <div style={{ padding: 20 }}>
        <Skeleton active paragraph={{ rows: 4 }} />
      </div>
    </div>
  );

  // 统计数据骨架屏
  const renderStatsSkeleton = () => (
    <div className="stats-row">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} style={{ display: "flex", alignItems: "center" }}>
          {i > 1 && <div className="stat-divider" />}
          <div className="stat-item">
            <div className="skeleton-stat-value" />
            <div className="skeleton-stat-label" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="assets-page">
      {/* Header Section */}
      <section className="page-header">
        <div className="header-content">
          <div className="header-text">
            <Text className="section-label">{t("assets.explore")}</Text>
            <Title level={2} style={{ margin: "8px 0 0" }}>
              {t("assets.title")}
            </Title>
          </div>

          {/* Stats - 加载时显示骨架屏 */}
          {isLoading ? (
            renderStatsSkeleton()
          ) : (
            <div className="stats-row">
              <div className="stat-item">
                <Text className="stat-value">{stats.total}</Text>
                <Text className="stat-label">Assets</Text>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <Text className="stat-value">{formatAmount(stats.tvl)}</Text>
                <Text className="stat-label">Total Value</Text>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <Text className="stat-value highlight">{stats.avgApy}%</Text>
                <Text className="stat-label">Avg. APY</Text>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <Text className="stat-value">{stats.available}</Text>
                <Text className="stat-label">Available</Text>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Filters Section */}
      <section className="filters-section">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${typeFilter === undefined ? "active" : ""}`}
            onClick={() => {
              setTypeFilter(undefined);
              setPage(1);
            }}
          >
            All
          </button>
          {(["real_estate", "bond", "commodity", "equity"] as AssetType[]).map(
            (type) => (
              <button
                key={type}
                className={`filter-tab ${typeFilter === type ? "active" : ""}`}
                onClick={() => {
                  setTypeFilter(type);
                  setPage(1);
                }}
              >
                {ASSET_TYPE_ICONS[type]}
                <span>{ASSET_TYPE_NAMES[type]}</span>
              </button>
            )
          )}
        </div>

        <Select
          style={{ width: 140 }}
          placeholder="Status"
          allowClear
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
          options={[
            { value: "active", label: "Available" },
            { value: "paused", label: "Paused" },
            { value: "sold_out", label: "Sold Out" },
            { value: "closed", label: "Closed" },
          ]}
        />
      </section>

      {/* Assets Grid */}
      <section className="assets-grid-section">
        {isLoading ? (
          <div className="assets-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i}>{renderCardSkeleton()}</div>
            ))}
          </div>
        ) : error ? (
          <Empty description={t("common.error")} />
        ) : !data?.items?.length ? (
          <Empty description={t("assets.empty")} className="empty-state" />
        ) : (
          <>
            <div className="assets-grid">
              {data.items.map((asset) => renderAssetCard(asset))}
            </div>

            {data.pagination && data.pagination.total_pages > 1 && (
              <div className="pagination-wrapper">
                <Pagination
                  current={page}
                  pageSize={pageSize}
                  total={data.pagination.total}
                  onChange={setPage}
                  showSizeChanger={false}
                />
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
